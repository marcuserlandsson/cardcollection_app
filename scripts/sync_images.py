"""
Sync card variant images and expansions from the CardTrader API into Supabase.

Fetches all Digimon blueprints from CardTrader, matches them to cards in our
database by base_card_number + variant_name, and updates:
  - image_url: per-variant card artwork
  - expansion + card_expansions: correct expansion for cross-set variants

Requires CARDTRADER_ACCESS_TOKEN and SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY
in .env or environment.

Usage:
    python scripts/sync_images.py
"""

import os
import re
import time
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv(".env.local", override=True)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
CARDTRADER_ACCESS_TOKEN = os.environ.get("CARDTRADER_ACCESS_TOKEN")

DIGIMON_GAME_ID = 8
CT_API_BASE = "https://api.cardtrader.com/api/v2"


def normalize_version(version: str) -> str:
    """Normalize a CardTrader version string for matching.

    Strips common decorators and normalizes to a comparable form.
    Examples:
        "" -> "regular"
        "Alternate Art" -> "alternate art"
        "Textured | Alternate Art" -> "textured"
        "Textured Secret Rare" -> "textured"
        "Omnimon Binder Set | Alternate Art" -> "omnimon binder set"
        "Reprint" -> "reprint"
        "Gold Border" -> "gold border"
    """
    v = (version or "").strip().lower()
    if not v:
        return "regular"

    # Remove trailing "| alternate art" or "| alt art" decorators
    v = re.sub(r"\s*\|\s*alternate?\s*art$", "", v)
    # Remove trailing "secret rare" decorator
    v = re.sub(r"\s*secret\s*rare$", "", v)
    # Normalize "pre-release stamped" to "pre-release"
    v = re.sub(r"^pre-release\s+stamped$", "pre-release", v)

    return v.strip() or "regular"


def normalize_variant_name(variant_name: str) -> str:
    """Normalize a variant name from our database for matching.

    Our variant names come from the Digimon API's tcgplayer_name field,
    extracted from parentheses: "Omnimon ACE (Textured)" -> "Textured"

    Examples:
        "Regular" -> "regular"
        "Alternate Art" -> "alternate art"
        "Textured" -> "textured"
        "Omnimon Binder Set" -> "omnimon binder set"
        "Reprint" -> "reprint"
        "Gold Border" -> "gold border"
    """
    return variant_name.strip().lower()


def strip_collector_suffix(collector_number: str) -> str:
    """Strip letter suffixes from CardTrader collector numbers.

    Examples:
        "BT17-078" -> "BT17-078"
        "BT17-078a" -> "BT17-078"
        "BT17-078t" -> "BT17-078"
        "BT17-078ta" -> "BT17-078"
        "BT17-078g" -> "BT17-078"
    """
    return re.sub(r"[a-z]+$", "", collector_number)


def fetch_all_digimon_blueprints(headers: dict) -> list[dict]:
    """Fetch all Digimon blueprints from CardTrader across all expansions."""
    print("Fetching Digimon expansions from CardTrader...")
    resp = requests.get(
        f"{CT_API_BASE}/expansions",
        headers=headers,
        params={"game_id": DIGIMON_GAME_ID},
        timeout=30,
    )
    resp.raise_for_status()
    all_exps = resp.json()
    if isinstance(all_exps, dict):
        all_exps = all_exps.get("array", [])

    digimon_exps = [e for e in all_exps if e.get("game_id") == DIGIMON_GAME_ID]
    print(f"  Found {len(digimon_exps)} Digimon expansions")

    all_blueprints = []
    for i, exp in enumerate(digimon_exps):
        resp = requests.get(
            f"{CT_API_BASE}/blueprints/export",
            headers=headers,
            params={"expansion_id": exp["id"]},
            timeout=30,
        )
        if resp.status_code != 200:
            print(f"  Warning: failed to fetch {exp['name']} ({resp.status_code})")
            continue

        bps = resp.json()
        if isinstance(bps, dict):
            bps = bps.get("array", [])

        for bp in bps:
            bp["_expansion_name"] = exp["name"]

        all_blueprints.extend(bps)

        if (i + 1) % 20 == 0:
            print(f"  Fetched {i + 1}/{len(digimon_exps)} expansions...")

        # Rate limit: 200 requests per 10 seconds
        time.sleep(0.06)

    print(f"  Total blueprints: {len(all_blueprints)}")
    return all_blueprints


def extract_expansion_code(ct_expansion_name: str) -> str:
    """Extract our expansion code from a CardTrader expansion name.

    Prerelease expansions get a "P" suffix to distinguish them from the
    base set (matching how Cardmarket separates these).

    Examples:
        "BT-17: Secret Crisis" -> "BT-17"
        "BT-17: Secret Crisis Prerelease Promos" -> "BT-17P"
        "BT-14: Blast Ace Pre-Release Promos" -> "BT-14P"
        "ST-16: Prerelease Promos" -> "ST-16P"
        "EX-9: Versus Monsters" -> "EX-9"
        "AD-01: Advanced Booster Digimon Generation" -> "AD-01"
        "Promo" -> "Promo"
        "Premium Bandai Products" -> "Premium Bandai Products"
    """
    is_prerelease = bool(
        re.search(r"pre-?release", ct_expansion_name, re.IGNORECASE)
    )
    match = re.match(r"^([A-Z]+-?\d+)", ct_expansion_name)
    if match:
        code = match.group(1)
        return f"{code}P" if is_prerelease else code
    return ct_expansion_name


def build_blueprint_lookup(
    blueprints: list[dict],
) -> dict[tuple[str, str], dict]:
    """Build a lookup map from (base_card_number, normalized_version) -> blueprint data.

    Returns dict with keys 'image_url' and 'expansion'.
    """
    lookup: dict[tuple[str, str], dict] = {}

    for bp in blueprints:
        collector_number = (
            bp.get("fixed_properties", {}).get("collector_number", "")
        )
        if not collector_number:
            continue

        base_cn = strip_collector_suffix(collector_number)
        version = bp.get("version", "")
        normalized = normalize_version(version)
        expansion = extract_expansion_code(bp.get("_expansion_name", ""))

        key = (base_cn, normalized)
        # Keep first match (don't overwrite)
        if key not in lookup:
            lookup[key] = {
                "image_url": bp.get("image_url", ""),
                "expansion": expansion,
            }

    return lookup


def sync_images():
    if not CARDTRADER_ACCESS_TOKEN:
        print("Error: CARDTRADER_ACCESS_TOKEN not configured.")
        print("Get your token from your CardTrader profile settings.")
        return

    headers = {"Authorization": f"Bearer {CARDTRADER_ACCESS_TOKEN}"}

    # Verify connection
    resp = requests.get(f"{CT_API_BASE}/info", headers=headers, timeout=10)
    if resp.status_code != 200:
        print(f"Error: CardTrader API returned {resp.status_code}")
        return
    print(f"Connected to CardTrader as: {resp.json().get('name', 'unknown')}")

    # Fetch all blueprints
    blueprints = fetch_all_digimon_blueprints(headers)
    bp_lookup = build_blueprint_lookup(blueprints)
    print(f"Built blueprint lookup with {len(bp_lookup)} entries")

    # Connect to Supabase and fetch cards
    print("Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Fetch all cards
    page_size = 1000
    all_cards = []
    offset = 0
    while True:
        result = (
            supabase.table("cards")
            .select("card_number, base_card_number, variant_name, image_url, expansion")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        all_cards.extend(result.data)
        if len(result.data) < page_size:
            break
        offset += page_size

    print(f"Fetched {len(all_cards)} cards from database")

    # Match and build updates
    image_updates = []
    expansion_fixes = []  # (card_number, new_expansion) — cards needing expansion change
    expansion_cleanups = []  # card_numbers needing card_expansions cleanup (variant cards with CT match)

    for card in all_cards:
        card_number = card["card_number"]
        base_cn = card["base_card_number"]
        variant_name = card["variant_name"]
        current_image = card.get("image_url", "")
        current_expansion = card.get("expansion", "")
        is_variant = card_number != base_cn

        normalized_name = normalize_variant_name(variant_name)
        key = (base_cn, normalized_name)
        bp_data = bp_lookup.get(key)

        if not bp_data:
            continue

        # Update image if card still has default base image
        default_image = f"https://images.digimoncard.io/images/cards/{base_cn}.jpg"
        if bp_data["image_url"] and (not current_image or current_image == default_image):
            image_updates.append(
                {"card_number": card_number, "image_url": bp_data["image_url"]}
            )

        # For variant cards, ensure correct expansion from CardTrader
        ct_expansion = bp_data["expansion"]
        if is_variant and ct_expansion:
            if ct_expansion != current_expansion:
                expansion_fixes.append((card_number, ct_expansion))
            # Always clean up card_expansions for variants to remove inherited entries
            expansion_cleanups.append((card_number, ct_expansion))

    print(f"Image updates: {len(image_updates)}")
    print(f"Expansion column fixes: {len(expansion_fixes)}")
    print(f"Expansion entry cleanups: {len(expansion_cleanups)}")

    # Apply image updates
    if image_updates:
        print(f"Updating {len(image_updates)} card images...")
        for i, update in enumerate(image_updates):
            supabase.table("cards").update(
                {"image_url": update["image_url"]}
            ).eq("card_number", update["card_number"]).execute()
            if (i + 1) % 500 == 0:
                print(f"  Updated {i + 1}/{len(image_updates)}")
        print(f"  Updated {len(image_updates)}/{len(image_updates)}")

    # Apply expansion column fixes
    if expansion_fixes:
        print(f"Fixing {len(expansion_fixes)} card expansion columns...")
        for i, (card_number, new_exp) in enumerate(expansion_fixes):
            supabase.table("cards").update(
                {"expansion": new_exp}
            ).eq("card_number", card_number).execute()
            if (i + 1) % 500 == 0:
                print(f"  Fixed {i + 1}/{len(expansion_fixes)}")
        print(f"  Fixed {len(expansion_fixes)}/{len(expansion_fixes)}")

    # Clean up card_expansions for variant cards — replace inherited entries
    # with the single correct expansion from CardTrader
    if expansion_cleanups:
        print(f"Cleaning up {len(expansion_cleanups)} variant card_expansions...")
        for i, (card_number, correct_exp) in enumerate(expansion_cleanups):
            supabase.table("card_expansions").delete().eq(
                "card_number", card_number
            ).execute()
            supabase.table("card_expansions").upsert(
                {"card_number": card_number, "expansion": correct_exp}
            ).execute()
            if (i + 1) % 500 == 0:
                print(f"  Cleaned {i + 1}/{len(expansion_cleanups)}")
        print(f"  Cleaned {len(expansion_cleanups)}/{len(expansion_cleanups)}")

    # Create expansion_metadata for new prerelease expansions
    prerelease_codes = set()
    for card in all_cards:
        if card.get("expansion", "").endswith("P"):
            prerelease_codes.add(card["expansion"])

    # Also include newly fixed expansions
    for _, new_exp in expansion_fixes:
        if new_exp.endswith("P"):
            prerelease_codes.add(new_exp)

    if prerelease_codes:
        existing = supabase.table("expansion_metadata").select("expansion").execute()
        existing_codes = {e["expansion"] for e in existing.data}
        new_prerelease = prerelease_codes - existing_codes

        if new_prerelease:
            print(f"Creating {len(new_prerelease)} prerelease expansion metadata entries...")
            for code in sorted(new_prerelease):
                # Derive parent set code (e.g. "BT-17P" -> "BT-17")
                parent_code = code[:-1]
                parent = supabase.table("expansion_metadata").select("*").eq(
                    "expansion", parent_code
                ).execute()

                meta = {"expansion": code}
                if parent.data:
                    # Reuse parent's set_image_url
                    meta["set_image_url"] = parent.data[0].get("set_image_url")
                    meta["set_id"] = parent.data[0].get("set_id")

                supabase.table("expansion_metadata").upsert(meta).execute()
                print(f"  Created {code}")

    if not image_updates and not expansion_fixes and not expansion_cleanups:
        print("Nothing to update.")
    else:
        print("Done!")


if __name__ == "__main__":
    sync_images()
