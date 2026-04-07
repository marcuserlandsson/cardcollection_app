"""
Sync card prices into Supabase using the Cardtrader API.

Fetches marketplace listings for all Digimon TCG expansions, aggregates
price_low / price_avg / price_trend per card, and upserts into card_prices.
Also writes a daily snapshot to card_price_history and purges rows older
than 30 days.

Usage:
    python scripts/sync_prices.py

Required env vars:
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
    CARDTRADER_ACCESS_TOKEN
"""

import os
import sys
import time
import statistics
import datetime
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv(".env.local", override=True)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
CARDTRADER_ACCESS_TOKEN = os.environ.get("CARDTRADER_ACCESS_TOKEN")

CARDTRADER_BASE = "https://api.cardtrader.com/api/v2"
# 150 ms between requests to stay within the 10 req/sec limit
REQUEST_DELAY = 0.15


def ct_get(session: requests.Session, path: str, params: dict = None):
    """Make a GET request to the Cardtrader API and return parsed JSON."""
    url = f"{CARDTRADER_BASE}{path}"
    resp = session.get(url, params=params, timeout=30)
    resp.raise_for_status()
    time.sleep(REQUEST_DELAY)
    return resp.json()


def find_digimon_game_id(session: requests.Session) -> int:
    """Return the Cardtrader game_id for the Digimon TCG."""
    games = ct_get(session, "/games")

    # API may return a list of {id, name} objects or a dict of {name: id}
    if isinstance(games, dict):
        for name, game_id in games.items():
            if "digimon" in name.lower():
                print(f"  Found Digimon game: '{name}' (id={game_id})")
                return game_id
    else:
        for game in games:
            name = game.get("name", "").lower()
            if "digimon" in name:
                print(f"  Found Digimon game: '{game['name']}' (id={game['id']})")
                return game["id"]

    raise RuntimeError("Digimon TCG not found in Cardtrader /games response")


def fetch_digimon_expansions(session: requests.Session, game_id: int) -> list[dict]:
    """Return all Cardtrader expansions belonging to the Digimon game."""
    expansions = ct_get(session, "/expansions")
    digimon = [e for e in expansions if e.get("game_id") == game_id]
    print(f"  Found {len(digimon)} Digimon expansions")
    return digimon


def fetch_blueprints(session: requests.Session, expansion_id: int) -> dict[int, str]:
    """
    Return a mapping of blueprint_id → collector_number for an expansion.

    Uses the /blueprints/export endpoint which returns an array of blueprint
    objects each containing an 'id' and a 'collector_number' (inside
    'fixed_properties' or as a top-level field depending on the API version).
    """
    blueprints = ct_get(session, "/blueprints/export", params={"expansion_id": expansion_id})
    mapping = {}
    for bp in blueprints:
        bp_id = bp.get("id")
        # collector_number may live at top level or inside fixed_properties
        collector_number = bp.get("collector_number") or (
            bp.get("fixed_properties") or {}
        ).get("collector_number")
        if bp_id and collector_number:
            mapping[bp_id] = str(collector_number)
    return mapping


def fetch_marketplace_products(session: requests.Session, expansion_id: int) -> list[dict]:
    """Return up to 25 cheapest listings per blueprint for an expansion."""
    return ct_get(
        session,
        "/marketplace/products",
        params={"expansion_id": expansion_id},
    )


def aggregate_prices(products: list[dict], blueprint_map: dict[int, str]) -> dict[str, dict]:
    """
    Aggregate marketplace listings into per-card price data.

    Returns { collector_number: { price_low, price_avg, price_trend } }
    """
    listings_by_card: dict[str, list[float]] = {}

    for product in products:
        bp_id = product.get("blueprint_id")
        collector_number = blueprint_map.get(bp_id)
        if not collector_number:
            continue

        price_cents = (product.get("price") or {}).get("cents")
        if price_cents is None:
            continue

        price_eur = price_cents / 100.0
        listings_by_card.setdefault(collector_number, []).append(price_eur)

    aggregated = {}
    for card_number, prices in listings_by_card.items():
        aggregated[card_number] = {
            "price_low": min(prices),
            "price_avg": sum(prices) / len(prices),
            "price_trend": statistics.median(prices),
        }
    return aggregated


def sync_prices():
    if not CARDTRADER_ACCESS_TOKEN:
        print("ERROR: CARDTRADER_ACCESS_TOKEN is not set.")
        sys.exit(1)

    print("Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Load all known base_card_numbers from the DB
    print("Loading cards from database...")
    result = supabase.table("cards").select("card_number,base_card_number").execute()
    known_base_numbers: set[str] = {
        row["base_card_number"]
        for row in result.data
        if row.get("base_card_number")
    }
    print(f"  Loaded {len(known_base_numbers)} unique base card numbers")

    session = requests.Session()
    session.headers.update({"Authorization": f"Bearer {CARDTRADER_ACCESS_TOKEN}"})

    # Step 1: Identify the Digimon game
    print("\nFetching game list from Cardtrader...")
    try:
        game_id = find_digimon_game_id(session)
    except Exception as e:
        print(f"FATAL: Could not reach Cardtrader API or find Digimon game: {e}")
        sys.exit(1)

    # Step 2: Fetch all Digimon expansions
    print("Fetching expansions...")
    try:
        expansions = fetch_digimon_expansions(session, game_id)
    except Exception as e:
        print(f"FATAL: Could not fetch expansions: {e}")
        sys.exit(1)

    # Step 3: Process each expansion
    all_prices: dict[str, dict] = {}
    failed_expansions = 0

    for idx, expansion in enumerate(expansions, start=1):
        exp_id = expansion["id"]
        exp_name = expansion.get("name", f"id={exp_id}")
        print(f"\n[{idx}/{len(expansions)}] {exp_name} (expansion_id={exp_id})")

        try:
            blueprint_map = fetch_blueprints(session, exp_id)
            print(f"  Blueprints mapped: {len(blueprint_map)}")
        except Exception as e:
            print(f"  WARNING: Failed to fetch blueprints for '{exp_name}': {e}")
            failed_expansions += 1
            continue

        try:
            products = fetch_marketplace_products(session, exp_id)
            print(f"  Marketplace listings: {len(products)}")
        except Exception as e:
            print(f"  WARNING: Failed to fetch marketplace products for '{exp_name}': {e}")
            failed_expansions += 1
            continue

        exp_prices = aggregate_prices(products, blueprint_map)

        # Filter to only cards we know about
        matched = {cn: p for cn, p in exp_prices.items() if cn in known_base_numbers}
        print(f"  Prices aggregated: {len(exp_prices)} total, {len(matched)} matched to DB")

        # Merge (keep lowest price_low if a card appears in multiple expansions)
        for card_number, price_data in matched.items():
            if card_number not in all_prices:
                all_prices[card_number] = price_data
            else:
                existing = all_prices[card_number]
                if price_data["price_low"] < existing["price_low"]:
                    all_prices[card_number] = price_data

    # Step 4: Upsert current prices into card_prices
    today = datetime.date.today().isoformat()
    fetched_at = datetime.datetime.utcnow().isoformat()

    print(f"\nUpserting {len(all_prices)} card prices into card_prices...")
    price_batch = []
    for card_number, price_data in all_prices.items():
        price_batch.append({
            "card_number": card_number,
            "price_avg": round(price_data["price_avg"], 4),
            "price_low": round(price_data["price_low"], 4),
            "price_trend": round(price_data["price_trend"], 4),
            "fetched_at": fetched_at,
        })
        if len(price_batch) >= 100:
            supabase.table("card_prices").upsert(price_batch).execute()
            price_batch = []
    if price_batch:
        supabase.table("card_prices").upsert(price_batch).execute()

    # Step 5: Insert daily snapshot into card_price_history
    print(f"Writing daily snapshot to card_price_history (recorded_at={today})...")
    history_batch = []
    for card_number, price_data in all_prices.items():
        history_batch.append({
            "card_number": card_number,
            "recorded_at": today,
            "price_avg": round(price_data["price_avg"], 4),
            "price_low": round(price_data["price_low"], 4),
            "price_trend": round(price_data["price_trend"], 4),
        })
        if len(history_batch) >= 100:
            supabase.table("card_price_history").upsert(history_batch).execute()
            history_batch = []
    if history_batch:
        supabase.table("card_price_history").upsert(history_batch).execute()

    # Step 6: Prune history older than 30 days
    cutoff = (datetime.date.today() - datetime.timedelta(days=30)).isoformat()
    print(f"Pruning card_price_history rows older than {cutoff}...")
    supabase.table("card_price_history").delete().lt("recorded_at", cutoff).execute()

    # Summary
    print("\n--- Summary ---")
    print(f"Expansions processed : {len(expansions) - failed_expansions}/{len(expansions)}")
    print(f"Cards priced         : {len(all_prices)}")
    if failed_expansions:
        print(f"Expansions failed    : {failed_expansions}")
    print("Done.")


if __name__ == "__main__":
    sync_prices()
