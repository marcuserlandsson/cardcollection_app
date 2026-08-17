"""
Import a game's cards from a versioned JSON seed file into Supabase.

Used for games with no public API — currently Cyberpunk TCG. The seed file is
the source of truth and lives in git; this script upserts it, so a corrected
file simply overwrites. Re-running it is a no-op.

Aborts if any card_number in the file already belongs to a different game.
That guard is what makes the shared single-column card_number primary key safe
across games — see docs/superpowers/specs/2026-08-17-multi-game-support-design.md
The same bet applies to expansion_metadata, whose primary key is `expansion`
alone: an equivalent guard aborts if a seed's expansion code already belongs
to a different game, rather than silently overwriting that game's row.

Usage:
    pip install -r scripts/requirements.txt

    # 1. Shape-check a hand-edited seed file. Runs validate() only — no
    #    Supabase client is ever created, so this needs no credentials at all.
    #    Use this while iterating on the JSON as cards get revealed.
    python scripts/import_game_cards.py --game cyberpunk \
        --file scripts/data/cyberpunk_cards.json --validate-only

    # 2. Rehearse the real import: validation, PLUS the games-table
    #    registration check and the cross-game card_number collision check,
    #    against the live database — but stops before writing anything.
    #    Requires SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.
    python scripts/import_game_cards.py --game cyberpunk \
        --file scripts/data/cyberpunk_cards.json --dry-run

    # 3. The real import: everything above, then upserts cards,
    #    card_expansions and expansion_metadata. Requires the same credentials.
    python scripts/import_game_cards.py --game cyberpunk \
        --file scripts/data/cyberpunk_cards.json

--validate-only and --dry-run are mutually exclusive.

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or environment
for modes 2 and 3 above.
"""

import argparse
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv(".env.local", override=True)

BATCH_SIZE = 500

REQUIRED_FIELDS = [
    "card_number", "name", "expansion", "card_type",
    "color", "rarity", "image_url", "max_copies",
    "base_card_number", "variant_name", "attributes",
]

# Must stay in step with lib/games/cyberpunk.ts and lib/games/digimon.ts.
# The cyberpunk colour list here is explicitly PROVISIONAL — only Red and
# Green are confirmed from official sources as of this writing. A mismatch
# between this dict and lib/games/cyberpunk.ts is expected to surface as an
# import failure once real data arrives; that's the intended signal, not a bug.
GAME_RULES = {
    "cyberpunk": {
        "card_types": {"Legend", "Unit", "Gear", "Program"},
        "rarities": {
            "Common", "Uncommon", "Rare", "Epic Rare",
            "Secret Rare", "Iconic Rare", "Nova Rare",
        },
        "colors": {"Red", "Blue", "Yellow", "Green", "Purple"},
        "card_number_case": "lower",
    },
}


def validate(rows: list[dict], game: str) -> list[str]:
    """Returns every problem found, so one run reports all of them."""
    rules = GAME_RULES.get(game)
    if rules is None:
        return [f"no validation rules defined for game '{game}'"]

    problems: list[str] = []
    seen: set[str] = set()

    for i, row in enumerate(rows):
        label = row.get("card_number") or f"row {i}"

        for field in REQUIRED_FIELDS:
            if field not in row:
                problems.append(f"{label}: missing field '{field}'")

        number = row.get("card_number", "")
        if number:
            if number in seen:
                problems.append(f"{label}: duplicated inside the seed file")
            seen.add(number)

        if rules["card_number_case"] == "lower" and number != number.lower():
            problems.append(f"{label}: card_number must be lowercase")

        if row.get("card_type") not in rules["card_types"]:
            problems.append(f"{label}: unknown card_type {row.get('card_type')!r}")

        if row.get("rarity") not in rules["rarities"]:
            problems.append(f"{label}: unknown rarity {row.get('rarity')!r}")

        if row.get("color") not in rules["colors"]:
            problems.append(f"{label}: unknown color {row.get('color')!r}")

        max_copies = row.get("max_copies")
        if isinstance(max_copies, bool) or not isinstance(max_copies, int) or max_copies < 1:
            problems.append(f"{label}: max_copies must be a positive integer")
        elif row.get("card_type") == "Legend" and max_copies != 1:
            problems.append(f"{label}: Legend max_copies must be 1, got {max_copies}")

        if not isinstance(row.get("attributes"), dict):
            problems.append(f"{label}: attributes must be an object")

        if not row.get("image_url"):
            problems.append(f"{label}: image_url is required")

    return problems


def find_collisions(supabase, rows: list[dict], game: str) -> list[str]:
    """card_numbers in the seed that already belong to a different game."""
    numbers = [r["card_number"] for r in rows if "card_number" in r]
    collisions: list[str] = []
    for i in range(0, len(numbers), BATCH_SIZE):
        batch = numbers[i : i + BATCH_SIZE]
        existing = (
            supabase.table("cards")
            .select("card_number, game")
            .in_("card_number", batch)
            .execute()
        )
        for found in existing.data or []:
            if found["game"] != game:
                collisions.append(
                    f"{found['card_number']} already belongs to game '{found['game']}'"
                )
    return collisions


def find_expansion_collisions(supabase, rows: list[dict], game: str) -> list[str]:
    """Expansion codes already registered to a different game.

    expansion_metadata's primary key is `expansion` alone, so an upsert from
    another game would silently overwrite the row rather than erroring.
    """
    codes = sorted({r["expansion"] for r in rows if r.get("expansion")})
    collisions: list[str] = []
    for i in range(0, len(codes), BATCH_SIZE):
        batch = codes[i : i + BATCH_SIZE]
        existing = (
            supabase.table("expansion_metadata")
            .select("expansion, game")
            .in_("expansion", batch)
            .execute()
        )
        for found in existing.data or []:
            if found["game"] != game:
                collisions.append(
                    f"expansion {found['expansion']!r} already belongs to game '{found['game']}'"
                )
    return collisions


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--game", required=True, help="game id, e.g. cyberpunk")
    parser.add_argument("--file", required=True, type=Path, help="seed JSON path")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--dry-run", action="store_true",
        help=(
            "run every check (validation, games-table registration, "
            "cross-game collisions) against the live database, then stop "
            "before writing anything. Requires Supabase credentials."
        ),
    )
    mode.add_argument(
        "--validate-only", action="store_true",
        help=(
            "run validate() only and exit — no Supabase client is created, "
            "no credentials required. For shape-checking a hand-edited file."
        ),
    )
    args = parser.parse_args()

    if not args.file.exists():
        print(f"ERROR: {args.file} does not exist")
        return 1

    with open(args.file, encoding="utf-8") as f:
        rows = json.load(f)

    if not isinstance(rows, list) or not rows:
        print("ERROR: seed file must be a non-empty JSON array")
        return 1

    print(f"Loaded {len(rows)} cards from {args.file}")

    problems = validate(rows, args.game)
    if problems:
        print(f"ERROR: {len(problems)} validation problem(s):")
        for p in problems:
            print(f"  - {p}")
        return 1
    print("Validation passed")

    if args.validate_only:
        return 0

    card_rows = [{**r, "game": args.game} for r in rows]
    expansion_rows = [
        {"card_number": r["card_number"], "expansion": r["expansion"]} for r in rows
    ]
    expansion_meta = [
        {"expansion": e, "game": args.game}
        for e in sorted({r["expansion"] for r in rows})
    ]

    supabase = create_client(
        os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    )

    games = supabase.table("games").select("id").eq("id", args.game).execute()
    if not games.data:
        print(f"ERROR: game '{args.game}' is not registered in the games table")
        return 1

    collisions = find_collisions(supabase, rows, args.game)
    if collisions:
        print(f"ERROR: {len(collisions)} card number collision(s) across games:")
        for c in collisions:
            print(f"  - {c}")
        print("Refusing to import — resolve the collision before retrying.")
        return 1
    print("No cross-game card number collisions")

    expansion_collisions = find_expansion_collisions(supabase, rows, args.game)
    if expansion_collisions:
        print(f"ERROR: {len(expansion_collisions)} expansion collision(s) across games:")
        for c in expansion_collisions:
            print(f"  - {c}")
        print("Refusing to import — resolve the collision before retrying.")
        return 1
    print("No cross-game expansion collisions")

    if args.dry_run:
        print(
            f"DRY RUN — would upsert {len(card_rows)} cards, "
            f"{len(expansion_rows)} card-expansion rows, "
            f"{len(expansion_meta)} expansion metadata rows"
        )
        return 0

    for i in range(0, len(card_rows), BATCH_SIZE):
        batch = card_rows[i : i + BATCH_SIZE]
        supabase.table("cards").upsert(batch).execute()
        print(f"  Upserted {min(i + BATCH_SIZE, len(card_rows))}/{len(card_rows)} cards")

    supabase.table("card_expansions").upsert(expansion_rows).execute()
    print(f"  Upserted {len(expansion_rows)} card-expansion rows")

    supabase.table("expansion_metadata").upsert(expansion_meta).execute()
    print(f"  Upserted {len(expansion_meta)} expansion metadata rows")

    total = (
        supabase.table("cards")
        .select("card_number", count="exact")
        .eq("game", args.game)
        .execute()
    )
    print(f"Done! {total.count} cards for game '{args.game}'")
    return 0


if __name__ == "__main__":
    sys.exit(main())
