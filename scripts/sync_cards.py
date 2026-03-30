"""
Sync cards from the Digimon Card API into Supabase.

Usage:
    pip install -r scripts/requirements.txt
    python scripts/sync_cards.py

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or environment.
"""

import os
import sys
import time
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()  # loads .env
load_dotenv(".env.local", override=True)  # loads .env.local (used by Next.js)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
DIGIMON_API_SEARCH = "https://digimoncard.io/api-public/search.php"
IMAGE_BASE_URL = "https://images.digimoncard.io/images/cards"

REQUEST_INTERVAL = 0.7

RARITY_MAP = {
    "c": "Common",
    "u": "Uncommon",
    "r": "Rare",
    "sr": "Super Rare",
    "sec": "Secret Rare",
    "p": "Promo",
}


def fetch_all_card_numbers() -> list[dict]:
    resp = requests.get(
        "https://digimoncard.io/api-public/getAllCards.php", timeout=30
    )
    resp.raise_for_status()
    return resp.json()


def fetch_card_details(card_number: str) -> dict | None:
    resp = requests.get(
        DIGIMON_API_SEARCH,
        params={"n": "", "card": card_number},
        timeout=30,
    )
    resp.raise_for_status()
    results = resp.json()
    if not results:
        return None
    for card in results:
        if card.get("id") == card_number:
            return card
    return results[0]


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

    print("Fetching card list from Digimon Card API...")
    all_cards = fetch_all_card_numbers()
    print(f"Found {len(all_cards)} cards")

    existing = set()
    result = supabase.table("cards").select("card_number").execute()
    for row in result.data:
        existing.add(row["card_number"])
    print(f"Already have {len(existing)} cards in database")

    new_cards = [c for c in all_cards if c["cardnumber"] not in existing]
    print(f"Need to fetch details for {len(new_cards)} new cards")

    batch = []
    for i, card_entry in enumerate(new_cards):
        card_number = card_entry["cardnumber"]
        print(f"  [{i+1}/{len(new_cards)}] Fetching {card_number}...")

        try:
            raw = fetch_card_details(card_number)
            if raw:
                batch.append(transform_card(raw))
        except Exception as e:
            print(f"    Error fetching {card_number}: {e}")

        if len(batch) >= 50:
            print(f"  Upserting batch of {len(batch)} cards...")
            supabase.table("cards").upsert(batch).execute()
            batch = []

        time.sleep(REQUEST_INTERVAL)

    if batch:
        print(f"  Upserting final batch of {len(batch)} cards...")
        supabase.table("cards").upsert(batch).execute()

    result = supabase.table("cards").select("card_number", count="exact").execute()
    print(f"Done! Total cards in database: {result.count}")


if __name__ == "__main__":
    sync_cards()
