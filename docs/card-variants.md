# Card Variants & Alt Art — Data Model

This document describes how CardBoard handles card variants (alt arts, reprints,
promos) including image sourcing and pricing.

## Overview

The Digimon Card API returns multiple entries per card number when a card has
variant printings (alternate art, reprints in different sets, rare pulls, etc.).
All variants share the same card number, gameplay stats, and rules text — they
differ only in artwork and market price.

**Example:** AD1-025 (Omnimon) has 3 variants:
- Regular printing (~€24)
- Alternate Art (~€38)
- Rare Pull (~€400)

## Data Sources

### Digimon Card API (`digimoncard.io/api-public/search.php`)

- **Bulk endpoint:** `?series=Digimon Card Game` returns ~8,500 entries
- **Unique cards:** ~4,100 (the rest are variant duplicates)
- Variants share the same `id` (card number) but differ in `tcgplayer_name`
  and `tcgplayer_id`
- The API provides a `pretty_url` field (e.g. `omnimon-alter-s-ex9-021`) for
  linking to card detail pages on digimoncard.io
- The API does **not** expose image URLs, set IDs, or Cardmarket product mappings

### Card Images (`images.digimoncard.io`)

**Regular images:**
```
https://images.digimoncard.io/images/cards/{card_number}.jpg
https://images.digimoncard.io/images/cards/{card_number}.webp
```
Both `.jpg` and `.webp` extensions work for all cards.

**Alt art images:**
```
https://images.digimoncard.io/images/cards/alt/{card_number}-set-{set_id}-{variant_idx}.webp
```
- `set_id` — internal numeric ID from digimoncard.io (see "Set ID Discovery")
- `variant_idx` — 1-based index counting only alt art variants within the card
  (not the same as the overall variant index)

**Set cover images:**
```
https://images.digimoncard.io/images/sets/{set_id}.jpg
```

### Cardmarket Pricing

Cardmarket lists card products with URLs following these patterns:

1. **Same-set variants** (alt art, rare pull within one set):
   ```
   .../Singles/{Set-Slug}/{Card-Name}-{Card-Number}-V{N}
   ```
   Example: `Digimon-Generation/Omnimon-AD1-025-V1`, `...-V2`, `...-V3`

2. **Cross-set reprints** (same card printed in different sets):
   ```
   .../Singles/{Set-Slug}/{Card-Name}-{Card-Number}
   ```
   Example: `Across-Time/WarGrowlmon-BT12-016`, `Digimon-Generation/WarGrowlmon-BT12-016`

3. **Older alt art suffix**:
   ```
   .../Singles/{Set-Slug}/{Card-Name}-{Card-Number}-AA
   ```
   Example: `Double-Diamond/Omnimon-BT1-084-AA`

**Important:** The Cardmarket URL cannot be reliably constructed from the
Digimon Card API data alone, because:
- Cross-set reprints require knowing which Cardmarket sets list a given card
- The set slug, V-number, and suffix patterns vary and aren't exposed by the API
- digimoncard.io maintains its own internal mapping to Cardmarket products
  (visible on each card's detail page)

For this reason, CardBoard does **not** store or construct Cardmarket URLs.
Instead, we link to the card's page on digimoncard.io using `pretty_url`,
which shows all Cardmarket variants with current prices.

### digimoncard.io Card Pages

Each card has a detail page at `https://digimoncard.io/card/{pretty_url}` that
shows:
- All Cardmarket listings across all sets, with current prices
- The "Current" printing (newest/primary set)
- Links to each Cardmarket product page

This is the best reference for users wanting detailed per-variant pricing.

## Set ID Discovery

The internal set IDs used in alt art image URLs are **not exposed** by the
public API. They are discovered by scraping digimoncard.io's pack listing pages.

**How it works:**
1. Fetch `https://digimoncard.io/packs?page={N}` (paginated, ~250 packs total)
2. Extract pack page URLs from the HTML
3. On each pack page, find the set cover image tag:
   ```html
   <img src="https://images.digimoncard.io/images/sets/{SET_ID}.jpg" ...>
   ```
4. Map the pack name to the extracted set ID

**Examples of discovered set IDs:**
| Expansion | Set ID |
|-----------|--------|
| BT-01: Booster New Evolution | 706 |
| BT-16: Booster Beginning Observer | 25502 |
| EX-09: Extra Booster Versus Monsters | 35890 |
| AD-01: Advanced Booster Digimon Generation | 41535 |

The sync script caches these in `scripts/set_ids.json` (gitignored) and
refreshes every 7 days.

## Database Schema

### `cards` table
One row per unique card number. Contains gameplay data, the regular image URL,
and expansion info. Primary key: `card_number`.

| Column | Description |
|--------|-------------|
| `card_number` | Primary key (e.g. "BT12-016") |
| `name` | Card name |
| `expansion` | Set code (e.g. "BT-12") |
| `image_url` | Regular card image URL |
| `pretty_url` | digimoncard.io slug for linking to card detail page |
| ... | Other gameplay fields (type, color, rarity, dp, etc.) |

### `card_variants` table
One row per variant printing. Links to the base card via `card_number`.

| Column | Description |
|--------|-------------|
| `card_number` | FK to cards table |
| `variant_name` | Human label: "Regular", "Alternate Art", "Rare Pull", etc. |
| `variant_index` | 1-based order from the API response |
| `tcgplayer_id` | TCGplayer product ID (unique per variant) |
| `alt_art_url` | Full CDN URL for alt art image, or null for regular printings |

Unique constraint: `(card_number, tcgplayer_id)`

### `card_prices` table
Prices per card. Currently keyed by `card_number` (single price per card).
Future enhancement could add per-variant pricing.

## Variant Index vs Alt Art Index

These are different numbers:

- **variant_index**: Sequential position across ALL variants of a card as
  returned by the API (regular, alt art, reprints, promos). Starts at 1.

- **alt_art_idx**: Sequential count of only the "Alternate Art" variants.
  Used for the CDN image URL suffix. Example: if variant_index 2 and 4 are
  both alt arts, they get alt_art_idx 1 and 2 respectively.

## Sync Pipeline

```
sync_cards.py
├── load_set_ids()         → scrape/cache set IDs from digimoncard.io/packs
├── fetch_all_cards()      → bulk fetch from Digimon Card API
├── Group entries by card_number
├── For each card:
│   ├── First entry → base card in `cards` table (with pretty_url)
│   └── All entries → variant rows in `card_variants` table
│       ├── Assign variant_index by API order
│       └── Build alt_art_url for "Alternate Art" variants using set_id
├── Upsert cards (batch 500)
└── Upsert variants (batch 500)
```

## Limitations

- **Alt art images:** Only available when the set ID is known AND the image has
  been uploaded to the CDN. Very new sets may not have images yet.
- **Cardmarket URLs:** Cannot be reliably constructed from API data. Use the
  digimoncard.io card page (`pretty_url`) instead, which shows all Cardmarket
  listings with prices.
- **Set ID staleness:** New sets need their IDs discovered via scraping. The
  cache refreshes weekly, so new sets are picked up within a week of being
  added to digimoncard.io.
- **Cross-set variants:** A card reprinted in multiple sets (e.g. BT12-016
  appears in Across Time, Digimon Generation, Demo Decks, and promo sets)
  will have variant entries only for the TCGplayer-tracked variants from the
  API, not for every Cardmarket set listing.
