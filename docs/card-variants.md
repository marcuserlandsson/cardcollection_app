# Card Variants & Alt Art — Data Model

This document describes how CardBoard handles card variants (alt arts, reprints,
promos) as first-class card entities with independent collection tracking.

## Overview

The Digimon Card API returns multiple entries per card number when a card has
variant printings (alternate art, reprints in different sets, rare pulls, etc.).
All variants share the same card number, gameplay stats, and rules text — they
differ only in artwork and market price.

**Each variant is a separate row in the `cards` table** with a suffixed
`card_number` (e.g. "BT1-084-V2"). The `base_card_number` column groups all
variants of the same game card.

**Example:** AD1-025 (Omnimon) has 3 variants:
- `AD1-025` — Regular printing (~€24)
- `AD1-025-V2` — Alternate Art (~€38)
- `AD1-025-V3` — Rare Pull (~€400)

## Key Scheme

| Variant | card_number | base_card_number | variant_name |
|---------|-------------|------------------|--------------|
| Regular (variant_index 1) | `BT1-084` | `BT1-084` | Regular |
| Alt Art (variant_index 2) | `BT1-084-V2` | `BT1-084` | Alternate Art |
| Rare Pull (variant_index 3) | `BT1-084-V3` | `BT1-084` | Rare Pull |

- Regular prints keep the original card_number (no suffix)
- Subsequent variants get `-V{variant_index}` suffix
- `base_card_number` is always the raw card number without suffix

## Data Sources

### Digimon Card API (`digimoncard.io/api-public/search.php`)

- **Bulk endpoint:** `?series=Digimon Card Game` returns ~8,500 entries
- **Unique base cards:** ~4,100 (the rest are variant duplicates)
- Variants share the same `id` (card number) but differ in `tcgplayer_name`
  and `tcgplayer_id`
- The API provides a `pretty_url` field for linking to digimoncard.io
- The API does **not** expose image URLs, set IDs, or Cardmarket product mappings

### Card Images

**Regular images** (from `images.digimoncard.io`):
```
https://images.digimoncard.io/images/cards/{card_number}.jpg
```

**Variant images** (from `world.digimoncard.com`):
```
https://world.digimoncard.com/images/cardlist/card/{card_number}_P{N}.png
```
- `_P1` = 2nd variant (variant_index 2), `_P2` = 3rd variant, etc.
- This CDN is reliable across all sets including newer ones (AD1, BT12+)
- The older `images.digimoncard.io/images/cards/alt/` pattern is deprecated
  (returns 404 for many newer sets)

**CardTrader images** (applied by `sync_images.py`):
- Per-variant images from CardTrader blueprints override the CDN URLs
- Most reliable source for variant-specific artwork

**Set cover images:**
```
https://images.digimoncard.io/images/sets/{set_id}.jpg
```

### Cardmarket Pricing

Cardmarket treats each art version as a separate product with its own `idProduct`
and independent pricing. URL patterns:

1. **Same-set variants:** `.../Singles/{Set-Slug}/{Card-Name}-{Card-Number}-V{N}`
2. **Cross-set reprints:** `.../Singles/{Set-Slug}/{Card-Name}-{Card-Number}`
3. **Older alt art suffix:** `.../Singles/{Set-Slug}/{Card-Name}-{Card-Number}-AA`

CardBoard does **not** store or construct Cardmarket URLs. We link to the card's
page on digimoncard.io using `pretty_url`, which shows all Cardmarket variants.

## Set ID Discovery

Internal set IDs used in alt art image URLs are discovered by scraping
digimoncard.io's pack listing pages. The sync script caches these in
`scripts/set_ids.json` and refreshes every 7 days.

## Database Schema

### `cards` table

One row per variant. Each variant is a first-class entity with its own
`card_number`, `image_url`, and `variant_name`.

| Column | Description |
|--------|-------------|
| `card_number` | Primary key (e.g. "BT1-084", "BT1-084-V2") |
| `base_card_number` | Raw card number without suffix, for grouping |
| `variant_name` | "Regular", "Alternate Art", "Rare Pull", etc. |
| `name` | Card name |
| `expansion` | Set code (e.g. "BT-01") |
| `image_url` | Card image URL (regular or alt art depending on variant) |
| `pretty_url` | digimoncard.io slug for linking |
| ... | Other gameplay fields (type, color, rarity, dp, etc.) |

### `card_prices` table

Prices per base card. Currently keyed by `card_number` (base card number).
Per-variant pricing is planned as future work.

### `collection` table

Per-variant tracking. Each variant has its own collection quantity.
Primary key: `(user_id, card_number)`.

### `deck_cards` table

Decks reference **base card numbers** (no variant suffix). The 4-copy rule
applies across all variants of the same base card.

## How Things Work

### Collection Tracking
Users own specific variants. "3x BT1-084" and "1x BT1-084-V2" are tracked
separately. The total owned across all variants of a base card determines
surplus for selling.

### Deck Building
Decks use base card numbers. Adding any variant of a card to a deck stores
the base card number. The 4-copy rule applies to the total across all variants.

### Surplus / Sell Calculation
Surplus is computed at the `base_card_number` level:
`surplus = total_owned_across_variants - max(max_copies, sum_deck_needs)`

When recommending which variants to sell, Regular versions are preferred first
(users typically prefer playing with alt arts).

### Card Panel — Other Versions
The card detail panel shows an "Other Versions" section with clickable thumbnails
of sibling variants. Clicking navigates to that variant's panel. This uses the
`useCardSiblings(baseCardNumber)` hook which queries `cards` by `base_card_number`.

## Sync Pipeline

```
sync_cards.py
├── load_set_ids()         → scrape/cache set IDs from digimoncard.io/packs
├── fetch_all_cards()      → bulk fetch from Digimon Card API
├── Group entries by card_number
├── For each card:
│   └── Each API entry → card row in `cards` table
│       ├── variant_index 1 → card_number = raw number, variant_name = "Regular"
│       ├── variant_index N → card_number = "{raw}-V{N}", variant_name from API
│       └── All entries get base_card_number = raw card number
├── Upsert cards (batch 500)
└── Upsert card_expansions (batch 500)
```

## Variant Index vs Alt Art Index

- **variant_index**: Position across ALL variants of a card from the API. Starts at 1.
  Used in the `-V{N}` card_number suffix.
- **alt_art_idx**: Count of only "Alternate Art" variants. Used for CDN image URL suffix.

## Limitations

- **Variant images:** The `world.digimoncard.com` CDN covers most sets but may
  lack some promos and starter deck variants. `sync_images.py` fills gaps with
  CardTrader images.
- **Cardmarket URLs:** Cannot be reliably constructed. Use digimoncard.io instead.
- **Set ID staleness:** New sets need IDs discovered via scraping (weekly refresh).
- **Per-variant pricing:** Not yet implemented. All variants of a card share the
  base card's price. Future work will map to Cardmarket `idProduct` per variant.
