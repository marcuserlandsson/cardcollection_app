# Alt Art Variant Rework Design

## Overview

Promote card variants (alternate arts, rare pulls, reprints) from a secondary display-only table into first-class card entities. Each art version becomes its own row in the `cards` table with an independent card_number, collection quantity, and (eventually) independent pricing. This mirrors how Cardmarket treats each art version as a separate product.

## Goals

- Each variant is a browsable, collectible entity in the app
- Users can track how many copies of each specific variant they own
- Surplus/sell recommendations account for variant value differences
- Deck building stays card-level (4-copy rule applies across all variants of a card)
- Per-variant pricing deferred to a follow-up

## Non-Goals

- Per-variant pricing (future work)
- Per-variant deck tracking (decks reference base card, not specific arts)
- Cardmarket product ID mapping (future, needed for per-variant pricing)
- Price spike detection / alt art sell recommendations (future)

## Key Scheme

Each variant gets a human-readable `card_number`:

| Variant | card_number | base_card_number |
|---------|------------|------------------|
| Regular (variant_index 1) | `BT1-084` | `BT1-084` |
| Alt Art (variant_index 2) | `BT1-084-V2` | `BT1-084` |
| Rare Pull (variant_index 3) | `BT1-084-V3` | `BT1-084` |

- Regular prints keep the original card_number (no suffix)
- Subsequent variants get `-V{variant_index}` suffix
- `base_card_number` groups all variants of the same game card

## Database Schema Changes

### Cards table — new columns

- `base_card_number` (text, not null) — the raw card number without variant suffix. For grouping variants and deck/surplus logic.
- `variant_name` (text, not null, default 'Regular') — human-readable label: "Regular", "Alternate Art", "Rare Pull", etc.

### card_variants table — retired

All data absorbed into `cards`. Table dropped after migration.

### collection table — no schema changes

FK references `card_number`, which now includes variant-suffixed keys. Existing entries reference Regular variants (whose card_number is unchanged).

### deck_cards table — no schema changes

Continues referencing base card_numbers only (no variant suffixes in decks).

### card_prices table — no schema changes for now

Stays keyed by base card_number. Per-variant pricing is future work.

### card_expansions table — no schema changes

Each variant card gets its own expansion entries.

## Migration

SQL migration that:

1. Adds `base_card_number` (text) and `variant_name` (text, default 'Regular') columns to `cards`
2. Sets `base_card_number = card_number` and `variant_name = 'Regular'` for all existing rows
3. For each row in `card_variants` where `variant_index > 1`:
   - Inserts a new `cards` row with `card_number = {base}-V{variant_index}`
   - Copies card data (name, expansion, card_type, color, rarity, stats) from the base card
   - Sets `image_url` to `alt_art_url` from the variant row (or the base image if null)
   - Sets `variant_name` from the variant row
   - Sets `base_card_number` to the original card_number
4. Copies relevant `card_expansions` entries for new variant cards
5. No collection data migration needed — existing entries already point to Regular variants (unchanged card_numbers)
6. Drops `card_variants` table

## Sync Script Changes

### sync_cards.py

Current behavior: groups API entries by card_number, picks first as base card, creates card_variants rows for the rest.

New behavior:
- Every API entry becomes its own `cards` row
- First entry (variant_index 1): `card_number` = raw number, `variant_name` = "Regular"
- Subsequent entries: `card_number` = "{raw_number}-V{variant_index}", `variant_name` extracted from tcgplayer_name
- All entries: `base_card_number` = raw card number
- Alt art entries: `image_url` = alt art CDN URL
- Remove `card_variants` upsert logic entirely
- `card_expansions`: each variant card gets expansion entries from the API data

### sync_prices.py

No changes. Continues writing one price per base card_number. Per-variant pricing is future work.

## Frontend Changes

### Types (lib/types.ts)

`Card` interface gains:
- `base_card_number: string`
- `variant_name: string`

`CardVariant` interface removed.

### Card Grid / Database Page

No code changes needed — grid already renders one card per row from the `cards` query. With variants promoted to cards, each variant appears as its own entry. Alt arts show their correct image via `image_url`.

### Card Panel (card-panel.tsx)

- **Remove** the `CardVariants` thumbnail section
- **Add** "Other Versions" section: queries siblings by `base_card_number`, shows them as clickable rows. Clicking a sibling opens that variant's panel.
- Variant image swap state (`variantImageUrl`) removed — each variant has its own `image_url`
- Collection quantity control works per-variant automatically (uses `card_number`)
- Price display stays as-is (card-level pricing for now)

### Hooks (lib/hooks/use-cards.ts)

- Remove `useCardVariants` hook
- Add `useCardSiblings(baseCardNumber: string | null)` — queries `cards` where `base_card_number` matches, returns all variants. Disabled when null.
- `useCardExpansions` — unchanged

### Deck Building

- Adding a variant card to a deck uses its `base_card_number` as the deck_cards FK
- 4-copy validation groups by `base_card_number`: sum quantities across all variants of the same base card
- Deck card display can show the base card image or any variant — no change needed since decks already use base card_numbers

### Surplus / Sell Calculation

- Surplus computed at `base_card_number` level: sum owned quantities across all variants, subtract max(max_copies, sum across decks)
- Sell page groups variants under the same base card
- Default recommendation: sell Regular variants first, keep alt arts (users prefer playing with alt arts)
- Future: price spike detection could recommend selling valuable alt arts

### Import Parser

- Imported card numbers (e.g. "BT1-084") map to Regular variants by default (card_number unchanged)
- No parsing logic changes needed

### Components to Remove

- `components/cards/card-variants.tsx` — replaced by "Other Versions" in card panel

### Components to Modify

- `components/cards/card-panel.tsx` — remove variant thumbnail section, add "Other Versions" sibling list, remove variantImageUrl state
- `components/collection/import-modal.tsx` — no changes (imports target base card_numbers which are Regular variants)
- `components/dashboard/worth-selling.tsx` — update surplus calculation to group by base_card_number, show variant-level recommendations

## Modified Files Summary

### Database
- New migration: `supabase/migrations/005_promote_variants.sql`

### Sync Scripts
- `scripts/sync_cards.py` — rewrite card grouping to produce one card per variant, remove card_variants upsert

### Frontend
- `lib/types.ts` — add fields to Card, remove CardVariant
- `lib/hooks/use-cards.ts` — remove useCardVariants, add useCardSiblings
- `components/cards/card-panel.tsx` — replace variant thumbnails with "Other Versions" sibling list
- `components/cards/card-variants.tsx` — delete
- `components/dashboard/worth-selling.tsx` — group surplus by base_card_number
- `lib/utils.ts` — add `getBaseCardNumber(cardNumber: string)` helper to strip -V{N} suffix

### Documentation
- `docs/card-variants.md` — update to reflect new architecture
