"""
Sync cards from the Digimon Card API into Supabase.

Usage:
    pip install -r scripts/requirements.txt
    python scripts/sync_cards.py

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or environment.
"""

import os
import sys
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()  # loads .env
load_dotenv(".env.local", override=True)  # loads .env.local (used by Next.js)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
DIGIMON_API_SEARCH = "https://digimoncard.io/api-public/search.php"
IMAGE_BASE_URL = "https://images.digimoncard.io/images/cards"

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

    print("Fetching all cards from Digimon Card API (bulk)...")
    all_raw = fetch_all_cards()
    print(f"Fetched {len(all_raw)} cards from API")

    cards = []
    skipped = 0
    for raw in all_raw:
        if not raw.get("id"):
            skipped += 1
            continue
        cards.append(transform_card(raw))

    if skipped:
        print(f"Skipped {skipped} cards with no ID")

    print(f"Upserting {len(cards)} cards in batches...")
    batch_size = 500
    for i in range(0, len(cards), batch_size):
        batch = cards[i : i + batch_size]
        supabase.table("cards").upsert(batch).execute()
        print(f"  Upserted {min(i + batch_size, len(cards))}/{len(cards)}")

    result = supabase.table("cards").select("card_number", count="exact").execute()
    print(f"Done! Total cards in database: {result.count}")


if __name__ == "__main__":
    sync_cards()
