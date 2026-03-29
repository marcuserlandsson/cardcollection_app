"""
Sync card prices into Supabase.

Tries Cardmarket API first (requires CARDMARKET_APP_TOKEN and CARDMARKET_APP_SECRET).
Falls back to Cardtrader API (requires CARDTRADER_ACCESS_TOKEN).
If neither is configured, exits with a warning.

Usage:
    python scripts/sync_prices.py
"""

import os
import sys
import time
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

CARDMARKET_APP_TOKEN = os.environ.get("CARDMARKET_APP_TOKEN")
CARDMARKET_APP_SECRET = os.environ.get("CARDMARKET_APP_SECRET")

CARDTRADER_ACCESS_TOKEN = os.environ.get("CARDTRADER_ACCESS_TOKEN")


def fetch_prices_cardtrader(card_numbers: list[str]) -> dict[str, dict]:
    if not CARDTRADER_ACCESS_TOKEN:
        return {}

    headers = {"Authorization": f"Bearer {CARDTRADER_ACCESS_TOKEN}"}
    prices = {}

    try:
        resp = requests.get(
            "https://api.cardtrader.com/api/v2/marketplace/products",
            params={"game_id": 7},
            headers=headers,
            timeout=30,
        )
        resp.raise_for_status()
        products = resp.json()

        for product in products:
            card_id = product.get("properties_hash", {}).get("collector_number", "")
            if card_id in card_numbers:
                price_cents = product.get("price", {}).get("cents", 0)
                price_eur = price_cents / 100.0
                if card_id not in prices or price_eur < (prices[card_id].get("price_low") or float("inf")):
                    prices.setdefault(card_id, {
                        "price_avg": price_eur,
                        "price_low": price_eur,
                        "price_trend": price_eur,
                    })
                    prices[card_id]["price_low"] = min(
                        prices[card_id]["price_low"], price_eur
                    )
    except Exception as e:
        print(f"Cardtrader API error: {e}")

    return prices


def fetch_prices_cardmarket(card_numbers: list[str]) -> dict[str, dict]:
    if not CARDMARKET_APP_TOKEN or not CARDMARKET_APP_SECRET:
        return {}

    print("Cardmarket API integration: credentials found but not yet implemented.")
    print("Falling back to Cardtrader...")
    return {}


def sync_prices():
    print("Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    result = supabase.table("cards").select("card_number").execute()
    card_numbers = [row["card_number"] for row in result.data]
    print(f"Found {len(card_numbers)} cards to price")

    prices = fetch_prices_cardmarket(card_numbers)

    if not prices:
        print("Trying Cardtrader API...")
        prices = fetch_prices_cardtrader(card_numbers)

    if not prices:
        print("No price source configured or available.")
        print("Set CARDMARKET_APP_TOKEN/CARDMARKET_APP_SECRET or CARDTRADER_ACCESS_TOKEN")
        sys.exit(0)

    print(f"Got prices for {len(prices)} cards")

    batch = []
    for card_number, price_data in prices.items():
        batch.append({
            "card_number": card_number,
            "price_avg": price_data.get("price_avg"),
            "price_low": price_data.get("price_low"),
            "price_trend": price_data.get("price_trend"),
        })

        if len(batch) >= 100:
            supabase.table("card_prices").upsert(batch).execute()
            batch = []

    if batch:
        supabase.table("card_prices").upsert(batch).execute()

    result = supabase.table("card_prices").select("card_number", count="exact").execute()
    print(f"Done! Total priced cards: {result.count}")


if __name__ == "__main__":
    sync_prices()
