"""
Sync cards from the Digimon Card API into Supabase.

Each API entry (including alt arts, reprints, promos) becomes its own row
in the cards table with a suffixed card_number (e.g. BT1-084-V2).
The base_card_number column groups all variants of the same game card.

See docs/card-variants.md for the data model documentation.

Usage:
    pip install -r scripts/requirements.txt
    python scripts/sync_cards.py

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or environment.
"""

import json
import os
import re
import time
import requests
from collections import defaultdict
from pathlib import Path
from urllib.parse import unquote_plus
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv(".env.local", override=True)

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
    """Scrape set IDs from digimoncard.io pack pages.

    Each pack page on digimoncard.io displays a set cover image whose URL
    contains the internal set ID: images/sets/{SET_ID}.jpg
    """
    print("Scraping set IDs from digimoncard.io/packs...")
    headers = {"User-Agent": "Mozilla/5.0 (compatible; CardBoard/1.0)"}
    set_ids: dict[str, int] = {}

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
    """Load set IDs from committed file, refreshing via scrape if stale."""
    if SET_IDS_PATH.exists():
        with open(SET_IDS_PATH) as f:
            cached = json.load(f)

        age_days = (time.time() - SET_IDS_PATH.stat().st_mtime) / 86400
        if age_days < 7:
            print(
                f"Using cached set IDs ({len(cached)} sets, {age_days:.1f} days old)"
            )
            return cached

        # Try to refresh, but fall back to existing file on failure
        print("Set IDs cache is stale, attempting refresh...")
        try:
            fresh = scrape_set_ids()
            if fresh:
                with open(SET_IDS_PATH, "w") as f:
                    json.dump(fresh, f, indent=2, sort_keys=True)
                print(f"Refreshed set IDs ({len(fresh)} sets)")
                return fresh
        except Exception as e:
            print(f"  Scrape failed ({e}), using existing cache")

        return cached

    # No file at all — must scrape
    set_ids = scrape_set_ids()
    if set_ids:
        with open(SET_IDS_PATH, "w") as f:
            json.dump(set_ids, f, indent=2, sort_keys=True)
        print(f"Saved set IDs to {SET_IDS_PATH}")
    return set_ids


def build_expansion_to_set_id(set_ids: dict[str, int]) -> dict[str, int]:
    """Map expansion codes (e.g. 'EX-09', 'BT-01') to set IDs.

    Prefers the main booster/extra set entry when multiple packs share the
    same expansion code prefix.
    """
    mapping: dict[str, int] = {}
    for pack_name, sid in set_ids.items():
        match = re.match(r"^([A-Z]+-?\d+)", pack_name)
        if match:
            code = match.group(1)
            if (
                code not in mapping
                or "Booster" in pack_name
                or "Theme" in pack_name
                or "Extra" in pack_name
            ):
                mapping[code] = sid
    return mapping


def get_alt_art_url(
    card_number: str, set_id: int, variant_idx: int = 1
) -> str:
    """Build alt art image URL on the digimoncard.io CDN."""
    return f"{ALT_IMAGE_BASE_URL}/{card_number}-set-{set_id}-{variant_idx}.webp"


def transform_card(
    raw: dict,
    variant_index: int = 1,
    variant_name: str = "Regular",
    alt_art_url: str | None = None,
) -> dict:
    card_number = raw["id"]
    rarity_raw = (raw.get("rarity") or "").lower().strip()

    set_names = raw.get("set_name", [])
    expansion = ""
    if set_names:
        prefix = re.match(r"^([A-Z]+)(\d+)", card_number)
        if prefix:
            card_prefix = prefix.group(1)
            card_num = prefix.group(2)
            for sn in set_names:
                set_code = sn.split(":")[0].strip() if ":" in sn else sn
                normalized = set_code.replace("-", "").replace("0", "").upper()
                candidate = (card_prefix + card_num).replace("0", "").upper()
                if normalized == candidate:
                    expansion = set_code
                    break
        if not expansion:
            first_set = set_names[0]
            expansion = (
                first_set.split(":")[0].strip()
                if ":" in first_set
                else first_set
            )

    # Build the suffixed card_number for non-primary variants
    suffixed_card_number = card_number
    if variant_index > 1:
        suffixed_card_number = f"{card_number}-V{variant_index}"

    # Use alt art image URL if available, otherwise default
    image_url = alt_art_url if alt_art_url else f"{IMAGE_BASE_URL}/{card_number}.jpg"

    return {
        "card_number": suffixed_card_number,
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
        "image_url": image_url,
        "pretty_url": raw.get("pretty_url", ""),
        "max_copies": 4,
        "base_card_number": card_number,
        "variant_name": variant_name,
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

    # Group API entries by card ID to assign variant indices in order
    card_entries: dict[str, list[dict]] = defaultdict(list)
    skipped = 0
    for raw in all_raw:
        card_id = raw.get("id")
        if not card_id:
            skipped += 1
            continue
        card_entries[card_id].append(raw)

    # Build cards and expansion memberships
    cards: dict[str, dict] = {}
    card_expansion_set: set[tuple[str, str]] = set()
    alt_art_count = 0

    for card_id, entries in card_entries.items():
        expansion_code = ""
        set_id = None

        # Collect all expansions this card belongs to
        set_names = entries[0].get("set_name", [])
        for sn in set_names:
            exp_code = sn.split(":")[0].strip() if ":" in sn else sn
            if exp_code:
                card_expansion_set.add((card_id, exp_code))

        # Track alt art index separately (for image URL variant_idx)
        alt_art_idx = 0

        for v_index, raw in enumerate(entries, start=1):
            tcgplayer_name = raw.get("tcgplayer_name") or ""
            is_alt_art = "Alternate Art" in tcgplayer_name

            # Determine variant name
            if v_index == 1:
                variant_name = "Regular"
            elif tcgplayer_name == raw.get("name", ""):
                # V2+ with identical tcgplayer_name → pre-release stamped
                variant_name = "Pre-Release"
            else:
                match = re.search(r"\(([^)]+)\)$", tcgplayer_name)
                variant_name = match.group(1) if match else tcgplayer_name

            # Build alt art image URL
            alt_art_url = None
            if is_alt_art:
                # Resolve set_id lazily (only when needed)
                if set_id is None:
                    first_card = transform_card(entries[0])
                    expansion_code = first_card["expansion"]
                    set_id = expansion_set_ids.get(expansion_code, 0)
                if set_id:
                    alt_art_idx += 1
                    alt_art_url = get_alt_art_url(card_id, set_id, alt_art_idx)
                    alt_art_count += 1

            card_row = transform_card(
                raw,
                variant_index=v_index,
                variant_name=variant_name,
                alt_art_url=alt_art_url,
            )
            cards[card_row["card_number"]] = card_row

            # Don't add expansion entries for non-regular variants here.
            # The Digimon API doesn't tell us which set a variant was actually
            # printed in — cross-set variants (reprints, gold borders, etc.)
            # would incorrectly show up under the base card's expansion.
            # The sync_images.py script assigns correct expansions from CardTrader.

    card_list = list(cards.values())

    if skipped:
        print(f"Skipped {skipped} cards with no ID")
    print(f"Total card rows (including variants): {len(card_list)} ({alt_art_count} with alt art images)")

    # Upsert cards
    print(f"Upserting {len(card_list)} cards in batches...")
    batch_size = 500
    for i in range(0, len(card_list), batch_size):
        batch = card_list[i : i + batch_size]
        supabase.table("cards").upsert(batch).execute()
        print(f"  Upserted {min(i + batch_size, len(card_list))}/{len(card_list)}")

    # Upsert card-expansion memberships
    card_expansions = [
        {"card_number": cn, "expansion": exp}
        for cn, exp in card_expansion_set
    ]
    if card_expansions:
        print(f"Upserting {len(card_expansions)} card-expansion memberships...")
        for i in range(0, len(card_expansions), batch_size):
            batch = card_expansions[i : i + batch_size]
            supabase.table("card_expansions").upsert(batch).execute()
            print(
                f"  Upserted {min(i + batch_size, len(card_expansions))}/{len(card_expansions)}"
            )

    # Upsert expansion metadata (set images)
    # Use orangeswim.dev product images where available, fall back to digimoncard.io
    orangeswim_path = Path(__file__).parent / "set_images_orangeswim.json"
    orangeswim: dict[str, str] = {}
    if orangeswim_path.exists():
        with open(orangeswim_path) as f:
            orangeswim = json.load(f)
        print(f"Loaded {len(orangeswim)} high-quality set images from orangeswim")

    # Deduplicate: prefer main booster/extra set when multiple packs share a code
    exp_meta_map: dict[str, dict] = {}
    for pack_name, sid in set_ids.items():
        exp_code = pack_name.split(":")[0].strip() if ":" in pack_name else pack_name
        is_main = any(kw in pack_name for kw in ["Booster", "Theme", "Extra", "Starter Deck", "Advanced"])
        if exp_code not in exp_meta_map or is_main:
            # Prefer orangeswim image, fall back to digimoncard.io
            image_url = orangeswim.get(exp_code, f"https://images.digimoncard.io/images/sets/{sid}.jpg")
            exp_meta_map[exp_code] = {
                "expansion": exp_code,
                "set_id": sid,
                "set_image_url": image_url,
            }
    exp_metadata = list(exp_meta_map.values())
    if exp_metadata:
        print(f"Upserting {len(exp_metadata)} expansion metadata entries...")
        for i in range(0, len(exp_metadata), batch_size):
            batch = exp_metadata[i : i + batch_size]
            supabase.table("expansion_metadata").upsert(batch).execute()

    result = supabase.table("cards").select("card_number", count="exact").execute()
    print(f"Done! Total cards (including variants): {result.count}")


if __name__ == "__main__":
    sync_cards()
