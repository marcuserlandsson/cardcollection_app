"""
Sync cards from the Digimon Card API into Supabase.

Usage:
    pip install -r scripts/requirements.txt
    python scripts/sync_cards.py

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or environment.
"""

import json
import os
import re
import sys
import time
import requests
from pathlib import Path
from urllib.parse import unquote_plus
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()  # loads .env
load_dotenv(".env.local", override=True)  # loads .env.local (used by Next.js)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
DIGIMON_API_SEARCH = "https://digimoncard.io/api-public/search.php"
IMAGE_BASE_URL = "https://images.digimoncard.io/images/cards"
ALT_IMAGE_BASE_URL = "https://images.digimoncard.io/images/cards/alt"
SET_IDS_PATH = Path(__file__).parent / "set_ids.json"

RARITY_MAP = {
    "c": "Common",
    "u": "Uncommon",
    "r": "Rare",
    "sr": "Super Rare",
    "sec": "Secret Rare",
    "p": "Promo",
}


def fetch_all_cards() -> list[dict]:
    """Fetch all cards in a single bulk request."""
    resp = requests.get(
        DIGIMON_API_SEARCH,
        params={"series": "Digimon Card Game"},
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()


def scrape_set_ids() -> dict[str, int]:
    """Scrape set IDs from digimoncard.io pack pages."""
    print("Scraping set IDs from digimoncard.io/packs...")
    headers = {"User-Agent": "Mozilla/5.0 (compatible; CardBoard/1.0)"}
    set_ids: dict[str, int] = {}

    # Collect all pack URLs
    pack_urls = set()
    for page in range(1, 15):
        resp = requests.get(
            f"https://digimoncard.io/packs?page={page}",
            headers=headers,
            timeout=30,
        )
        if resp.status_code != 200:
            break
        urls = re.findall(
            r'href="(https://digimoncard\.io/pack/[^"]+)"', resp.text
        )
        if not urls:
            break
        pack_urls.update(urls)
        time.sleep(0.5)

    print(f"  Found {len(pack_urls)} pack pages")

    # Extract set ID from each pack page's set image
    for url in sorted(pack_urls):
        pack_name = unquote_plus(url.split("/pack/")[-1])
        try:
            resp = requests.get(url, headers=headers, timeout=15)
            match = re.search(r"images/sets/(\d+)", resp.text)
            if match:
                set_ids[pack_name] = int(match.group(1))
        except Exception:
            pass
        time.sleep(0.3)

    print(f"  Resolved {len(set_ids)} set IDs")
    return set_ids


def load_set_ids() -> dict[str, int]:
    """Load set IDs from cache, scraping fresh if cache is missing or stale."""
    if SET_IDS_PATH.exists():
        age_days = (time.time() - SET_IDS_PATH.stat().st_mtime) / 86400
        if age_days < 7:
            with open(SET_IDS_PATH) as f:
                cached = json.load(f)
            print(f"Using cached set IDs ({len(cached)} sets, {age_days:.1f} days old)")
            return cached

    set_ids = scrape_set_ids()
    with open(SET_IDS_PATH, "w") as f:
        json.dump(set_ids, f, indent=2, sort_keys=True)
    print(f"Saved set IDs to {SET_IDS_PATH}")
    return set_ids


def build_expansion_to_set_id(set_ids: dict[str, int]) -> dict[str, int]:
    """Map expansion codes (e.g. 'EX-09', 'BT-01') to set IDs."""
    mapping = {}
    for pack_name, sid in set_ids.items():
        # Extract set code from pack names like "EX-09: Extra Booster Versus Monsters"
        match = re.match(r"^([A-Z]+-?\d+)", pack_name)
        if match:
            code = match.group(1)
            # Only keep the main booster/extra set (skip box promos, limited card packs etc.)
            if code not in mapping or "Booster" in pack_name or "Theme" in pack_name or "Extra" in pack_name:
                mapping[code] = sid
    return mapping


def get_alt_art_url(card_number: str, set_id: int, variant_idx: int = 1) -> str:
    """Build alt art image URL."""
    return f"{ALT_IMAGE_BASE_URL}/{card_number}-set-{set_id}-{variant_idx}.webp"


def transform_card(raw: dict) -> dict:
    card_number = raw["id"]
    rarity_raw = (raw.get("rarity") or "").lower().strip()

    set_names = raw.get("set_name", [])
    expansion = ""
    if set_names:
        first_set = set_names[0]
        expansion = first_set.split(":")[0].strip() if ":" in first_set else first_set

    return {
        "card_number": card_number,
        "name": raw.get("name", ""),
        "expansion": expansion,
        "card_type": raw.get("type", ""),
        "color": raw.get("color", ""),
        "rarity": RARITY_MAP.get(rarity_raw, rarity_raw),
        "dp": raw.get("dp") if raw.get("dp") else None,
        "play_cost": raw.get("play_cost") if raw.get("play_cost") else None,
        "level": raw.get("level") if raw.get("level") else None,
        "evolution_cost": (
            raw.get("evolution_cost") if raw.get("evolution_cost") else None
        ),
        "image_url": f"{IMAGE_BASE_URL}/{card_number}.jpg",
        "max_copies": 4,
    }


def sync_cards():
    print("Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Load set IDs for alt art image URLs
    set_ids = load_set_ids()
    expansion_set_ids = build_expansion_to_set_id(set_ids)

    print("Fetching all cards from Digimon Card API (bulk)...")
    all_raw = fetch_all_cards()
    print(f"Fetched {len(all_raw)} cards from API")

    # Deduplicate cards, collect variants
    seen: dict[str, dict] = {}
    variants: list[dict] = []
    skipped = 0

    for raw in all_raw:
        card_id = raw.get("id")
        if not card_id:
            skipped += 1
            continue

        tcgplayer_name = raw.get("tcgplayer_name", "")
        tcgplayer_id = raw.get("tcgplayer_id")

        # First occurrence becomes the base card
        if card_id not in seen:
            seen[card_id] = transform_card(raw)

        # Build variant entry
        if tcgplayer_id:
            is_alt_art = "Alternate Art" in tcgplayer_name

            # Determine variant name
            if tcgplayer_name == raw.get("name", ""):
                variant_name = "Regular"
            else:
                # Extract the parenthetical description
                match = re.search(r"\(([^)]+)\)$", tcgplayer_name)
                variant_name = match.group(1) if match else tcgplayer_name

            # Build alt art URL if available
            alt_art_url = None
            if is_alt_art:
                expansion = seen[card_id].get("expansion", "")
                sid = expansion_set_ids.get(expansion)
                if sid:
                    alt_art_url = get_alt_art_url(card_id, sid)

            variants.append({
                "card_number": card_id,
                "variant_name": variant_name,
                "tcgplayer_id": tcgplayer_id,
                "alt_art_url": alt_art_url,
            })

    cards = list(seen.values())

    if skipped:
        print(f"Skipped {skipped} cards with no ID")
    dupes = len(all_raw) - skipped - len(cards)
    if dupes:
        print(f"Found {dupes} variant entries across {len(cards)} unique cards")

    # Upsert cards
    print(f"Upserting {len(cards)} cards in batches...")
    batch_size = 500
    for i in range(0, len(cards), batch_size):
        batch = cards[i : i + batch_size]
        supabase.table("cards").upsert(batch).execute()
        print(f"  Upserted {min(i + batch_size, len(cards))}/{len(cards)}")

    # Upsert variants
    if variants:
        print(f"Upserting {len(variants)} card variants in batches...")
        for i in range(0, len(variants), batch_size):
            batch = variants[i : i + batch_size]
            supabase.table("card_variants").upsert(
                batch, on_conflict="card_number,tcgplayer_id"
            ).execute()
            print(f"  Upserted {min(i + batch_size, len(variants))}/{len(variants)}")

    result = supabase.table("cards").select("card_number", count="exact").execute()
    variant_result = supabase.table("card_variants").select("id", count="exact").execute()
    print(f"Done! Cards: {result.count}, Variants: {variant_result.count}")


if __name__ == "__main__":
    sync_cards()
