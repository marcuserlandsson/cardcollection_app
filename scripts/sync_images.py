"""
Sync card variant images from the CardTrader API into Supabase.

Fetches all Digimon blueprints from CardTrader, matches them to cards in our
database by base_card_number + variant_name, and updates image_url for cards
that are still using the default base card image.

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


def build_image_lookup(
    blueprints: list[dict],
) -> dict[tuple[str, str], str]:
    """Build a lookup map from (base_card_number, normalized_version) -> image_url.

    When multiple blueprints match the same key, prefer the one with an image.
    """
    lookup: dict[tuple[str, str], str] = {}

    for bp in blueprints:
        image_url = bp.get("image_url", "")
        if not image_url:
            continue

        collector_number = (
            bp.get("fixed_properties", {}).get("collector_number", "")
        )
        if not collector_number:
            continue

        base_cn = strip_collector_suffix(collector_number)
        version = bp.get("version", "")
        normalized = normalize_version(version)

        key = (base_cn, normalized)
        # Keep first match (don't overwrite)
        if key not in lookup:
            lookup[key] = image_url

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
    image_lookup = build_image_lookup(blueprints)
    print(f"Built image lookup with {len(image_lookup)} entries")

    # Connect to Supabase and fetch cards that need images
    print("Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Fetch all cards with their current image_url, base_card_number, variant_name
    page_size = 1000
    all_cards = []
    offset = 0
    while True:
        result = (
            supabase.table("cards")
            .select("card_number, base_card_number, variant_name, image_url")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        all_cards.extend(result.data)
        if len(result.data) < page_size:
            break
        offset += page_size

    print(f"Fetched {len(all_cards)} cards from database")

    # Match and update
    updates = []
    matched = 0
    already_has_image = 0

    for card in all_cards:
        card_number = card["card_number"]
        base_cn = card["base_card_number"]
        variant_name = card["variant_name"]
        current_image = card.get("image_url", "")

        # Skip if the card already has a non-default image
        # Default images are from digimoncard.io CDN: .../cards/{base}.jpg
        default_image = f"https://images.digimoncard.io/images/cards/{base_cn}.jpg"
        if current_image and current_image != default_image:
            already_has_image += 1
            continue

        # Try to match against CardTrader lookup
        normalized_name = normalize_variant_name(variant_name)
        key = (base_cn, normalized_name)
        ct_image = image_lookup.get(key)

        if ct_image:
            updates.append(
                {"card_number": card_number, "image_url": ct_image}
            )
            matched += 1

    print(f"Cards already with variant images: {already_has_image}")
    print(f"New image matches found: {matched}")

    if not updates:
        print("No images to update.")
        return

    # Batch update using upsert — only include cards that exist in DB
    # We know these card_numbers exist because we fetched them from the DB above
    db_card_numbers = {c["card_number"] for c in all_cards}
    valid_updates = [u for u in updates if u["card_number"] in db_card_numbers]
    print(f"Updating {len(valid_updates)} card images (filtered to existing cards)...")

    batch_size = 200
    for i in range(0, len(valid_updates), batch_size):
        batch = valid_updates[i : i + batch_size]
        # Use RPC or individual updates to avoid upsert creating new rows
        for update in batch:
            supabase.table("cards").update(
                {"image_url": update["image_url"]}
            ).eq("card_number", update["card_number"]).execute()
        print(f"  Updated {min(i + batch_size, len(valid_updates))}/{len(valid_updates)}")

    print("Done!")


if __name__ == "__main__":
    sync_images()
