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
import re
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
    resp = ct_get(session, "/games")

    # API returns {"array": [{id, name, display_name}, ...]}
    games = resp.get("array", resp) if isinstance(resp, dict) else resp
    if not isinstance(games, list):
        games = [games] if isinstance(games, dict) else []

    for game in games:
        name = (game.get("display_name") or game.get("name", "")).lower()
        if "digimon" in name:
            print(f"  Found Digimon game: '{game.get('display_name', game.get('name'))}' (id={game['id']})")
            return game["id"]

    raise RuntimeError("Digimon TCG not found in Cardtrader /games response")


def unwrap_response(resp) -> list:
    """Unwrap Cardtrader API responses that may be wrapped in {"array": [...]}."""
    if isinstance(resp, dict) and "array" in resp:
        return resp["array"]
    if isinstance(resp, list):
        return resp
    return []


def fetch_digimon_expansions(session: requests.Session, game_id: int) -> list[dict]:
    """Return all Cardtrader expansions belonging to the Digimon game."""
    resp = ct_get(session, "/expansions")
    expansions = unwrap_response(resp)
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
    resp = ct_get(session, "/blueprints/export", params={"expansion_id": expansion_id})
    blueprints = unwrap_response(resp) if not isinstance(resp, list) else resp
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


def fetch_marketplace_products(session: requests.Session, expansion_id: int) -> dict:
    """Return marketplace data for an expansion. Response is {blueprint_id: [listings]}."""
    return ct_get(
        session,
        "/marketplace/products",
        params={"expansion_id": expansion_id},
    )


def aggregate_prices(marketplace_data, blueprint_map: dict[int, str]) -> dict[str, dict]:
    """
    Aggregate marketplace listings into per-card price data.

    marketplace_data is a dict keyed by blueprint_id (as string) where each
    value is a list of product listings with price_cents fields.

    Returns { collector_number: { price_low, price_avg, price_trend } }
    """
    listings_by_card: dict[str, list[float]] = {}

    # Response is {str(blueprint_id): [product, ...]}
    if isinstance(marketplace_data, dict):
        for bp_id_str, products in marketplace_data.items():
            bp_id = int(bp_id_str) if bp_id_str.isdigit() else None
            collector_number = blueprint_map.get(bp_id) if bp_id else None
            if not collector_number:
                continue
            if not isinstance(products, list):
                continue
            for product in products:
                price_cents = product.get("price_cents")
                if price_cents is None:
                    # Try nested price object as fallback
                    price_cents = (product.get("price") or {}).get("cents")
                if price_cents and price_cents > 0:
                    listings_by_card.setdefault(collector_number, []).append(price_cents / 100.0)
    elif isinstance(marketplace_data, list):
        # Fallback: flat list of products
        for product in marketplace_data:
            bp_id = product.get("blueprint_id")
            collector_number = blueprint_map.get(bp_id)
            if not collector_number:
                continue
            price_cents = product.get("price_cents") or (product.get("price") or {}).get("cents")
            if price_cents and price_cents > 0:
                listings_by_card.setdefault(collector_number, []).append(price_cents / 100.0)

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

    # Load all cards from the DB with variant info
    # Supabase default limit is 1000 rows — paginate to get all cards
    print("Loading cards from database...")
    all_cards: list[dict] = []
    offset = 0
    page_size = 1000
    while True:
        result = (
            supabase.table("cards")
            .select("card_number,base_card_number,variant_name")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        if not result.data:
            break
        all_cards.extend(result.data)
        if len(result.data) < page_size:
            break
        offset += page_size

    # Build variant map: base_card_number -> sorted list of card_numbers
    # Regular variant first, then V2, V3, etc.
    from collections import defaultdict
    variants_by_base: dict[str, list[str]] = defaultdict(list)
    known_card_numbers: set[str] = set()
    for card in all_cards:
        variants_by_base[card["base_card_number"]].append(card["card_number"])
        known_card_numbers.add(card["card_number"])

    def v_sort_key(cn: str) -> int:
        m = re.search(r"-V(\d+)$", cn)
        return int(m.group(1)) if m else 0

    for base in variants_by_base:
        variants_by_base[base].sort(key=v_sort_key)

    known_base_numbers = set(variants_by_base.keys())
    print(f"  Loaded {len(all_cards)} cards ({len(known_base_numbers)} unique base numbers)")

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
            marketplace_data = fetch_marketplace_products(session, exp_id)
            listing_count = sum(len(v) for v in marketplace_data.values()) if isinstance(marketplace_data, dict) else len(marketplace_data)
            print(f"  Marketplace listings: {listing_count}")
        except Exception as e:
            print(f"  WARNING: Failed to fetch marketplace products for '{exp_name}': {e}")
            failed_expansions += 1
            continue

        exp_prices = aggregate_prices(marketplace_data, blueprint_map)

        # Map CT collector_numbers to our card_numbers (per-variant pricing)
        matched_count = 0
        for ct_collector_num, price_data in exp_prices.items():
            # Split CT collector_number into base + suffix
            # e.g. "AD1-008a" -> base="AD1-008", suffix="a"
            m = re.match(r"^([A-Za-z0-9]+-\d+)(.*)", ct_collector_num)
            if not m:
                continue
            base, suffix = m.group(1), m.group(2)

            if base not in known_base_numbers:
                continue

            our_variants = variants_by_base[base]

            if not suffix:
                # No suffix = Regular variant (first in sorted list, V0)
                target = our_variants[0] if our_variants else None
            else:
                # Suffixed variant: collect all CT suffixes for this base in this
                # expansion and pair with our non-Regular variants by sort order
                ct_suffixes_for_base = sorted(
                    s for cn, s in (
                        (cn2, re.match(r"^[A-Za-z0-9]+-\d+(.*)", cn2).group(1))
                        for cn2 in exp_prices
                        if cn2.startswith(base) and re.match(r"^[A-Za-z0-9]+-\d+(.*)", cn2)
                    )
                    if s  # only suffixed ones
                )
                our_non_regular = our_variants[1:]  # skip Regular (V0)

                try:
                    suffix_idx = ct_suffixes_for_base.index(suffix)
                except ValueError:
                    suffix_idx = -1

                if 0 <= suffix_idx < len(our_non_regular):
                    target = our_non_regular[suffix_idx]
                else:
                    # More CT variants than we have — store under CT name directly
                    target = ct_collector_num if ct_collector_num in known_card_numbers else None

            if not target:
                continue

            matched_count += 1
            # Merge: keep lowest price_low if card appears in multiple expansions
            if target not in all_prices:
                all_prices[target] = price_data
            else:
                existing = all_prices[target]
                if price_data["price_low"] < existing["price_low"]:
                    all_prices[target] = price_data

        print(f"  Prices aggregated: {len(exp_prices)} total, {matched_count} matched to DB")

    # Step 4: Upsert current prices into card_prices
    today = datetime.date.today().isoformat()
    fetched_at = datetime.datetime.now(datetime.UTC).isoformat()

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
