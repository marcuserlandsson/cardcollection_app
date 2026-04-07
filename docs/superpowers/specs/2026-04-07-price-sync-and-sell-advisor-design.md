# Card Price Sync & Sell Advisor — Design Spec

## Overview

Implement a working Cardtrader-based price sync pipeline and enhance the sell advisor into a powerful tool for identifying what to sell and when. Three pillars:

1. **Price sync** — Rewrite `sync_prices.py` to properly use the Cardtrader API, fetching real marketplace data per expansion
2. **Price history** — Store 30 days of daily price snapshots to detect price spikes and trends
3. **Sell advisor UI** — Unified list with price spike highlights, manual sell list, and filter chips

## Data Model Changes

### New table: `card_price_history`

| Column | Type | Notes |
|--------|------|-------|
| card_number | text (FK → cards) | Composite PK with recorded_at |
| recorded_at | date | One entry per card per day, composite PK with card_number |
| price_avg | numeric | Average price in EUR |
| price_low | numeric | Lowest listing price in EUR |
| price_trend | numeric | Median price in EUR |

RLS: publicly readable (same as `card_prices`). Cleanup: rows older than 30 days are deleted during each sync run.

Storage estimate: ~4,000 base cards × 30 days × 60 bytes ≈ 7 MB — well within Supabase free tier (500 MB).

### New table: `sell_list`

| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid (FK → auth.users) | Composite PK with card_number |
| card_number | text (FK → cards) | Composite PK with user_id |
| added_at | timestamptz | Defaults to now() |

RLS: users can only read/write their own rows. This is a simple flag table — no quantity, the user decides quantities at Cardmarket listing time.

### Existing table: `card_prices` (unchanged)

Keeps its current schema. Updated on each sync run with the latest prices. Serves as the "current price" fast-lookup table (no date filtering needed).

## Price Sync Pipeline (`sync_prices.py`)

### Rewrite overview

Remove the Cardmarket API stub entirely. The sync script becomes Cardtrader-only.

### Sync flow

1. **Fetch game list** — `GET /games` → find the Digimon game entry and its `game_id`
2. **Fetch expansions** — `GET /expansions` filtered by game → get all Digimon expansion IDs
3. **For each expansion:**
   a. Fetch blueprints — `GET /blueprints/export?expansion_id=X` → build mapping of `blueprint_id` → `collector_number`
   b. Fetch marketplace products — `GET /marketplace/products?expansion_id=X` → returns up to 25 cheapest listings per blueprint
4. **Map and aggregate per card:**
   - Use the blueprint mapping to convert Cardtrader's `blueprint_id` to our `card_number` format
   - `price_low` = minimum listing price
   - `price_avg` = mean of all listings
   - `price_trend` = median of all listings (robust against outlier cheap/damaged cards)
5. **Upsert** aggregated prices into `card_prices` (current snapshot)
6. **Insert** into `card_price_history` with today's date (one row per card per day, idempotent via upsert on composite PK)
7. **Cleanup** — delete `card_price_history` rows where `recorded_at < today - 30 days`

### Rate limiting

Cardtrader API allows 10 requests per second for marketplace endpoints, 200 requests per 10 seconds globally. The script adds a 150ms delay between expansion fetches to stay comfortably under limits.

### Card number mapping

Cardtrader blueprints include a `collector_number` property (e.g., "BT1-001"). This needs to be matched against our `cards.card_number` (base card numbers). The mapping logic should handle format differences if they arise (e.g., leading zeros, different separator conventions). Cards in our DB that don't appear in Cardtrader get no price entry — the UI shows "No listings" for these.

### Error handling

- If an individual expansion fetch fails, log the error and continue with the remaining expansions
- If the entire Cardtrader API is unreachable, exit with a non-zero code so GitHub Actions reports the failure
- Print summary: total expansions processed, cards priced, cards with no listings, errors encountered

## Price Spike Detection

Calculated at query time, not during sync. A card is considered "spiking" when:

```
current price_trend ≥ 1.3 × price_trend from 7 days ago
```

This means a ≥30% increase over the past 7 days. The comparison uses `card_price_history` for the 7-day-ago value and `card_prices` for the current value.

If there is no history entry from 7 days ago (e.g., the card was just added, or history hasn't accumulated yet), the card is not flagged as spiking.

The spike calculation runs client-side — the frontend fetches current prices and recent history, then computes spikes in the `buildSellableCards` utility or a new dedicated function.

## Sell Advisor Page — UI Design

### Layout structure (top to bottom)

1. **Page title** — "Sell Advisor"
2. **Summary stats** — surplus card count + total estimated value (EUR)
3. **Price freshness** — "Prices updated Xh ago" with clock icon
4. **Price spike cards** — horizontal scrollable row of owned cards (in collection or on sell list) with significant price increases. Each card shows: thumbnail, name, card number, percentage increase, price change (old → new). Only appears when there are spikes to show. Clicking a spike card opens the card detail panel.
5. **Divider**
6. **Filter chips** — `All` | `Surplus` | `Sell List` | `Spiked ↑`
   - `All` shows surplus cards + sell list cards combined
   - `Surplus` shows only auto-detected surplus cards
   - `Sell List` shows only manually flagged sell list cards
   - `Spiked ↑` shows any owned card with a price spike — whether it's surplus, on the sell list, or just in the collection. This is the one filter that can surface cards not otherwise in the sell advisor, to prompt the user to consider selling
7. **Unified card list** — each row shows:
   - Card thumbnail
   - Card name + card number
   - Status badge: yellow "×N surplus" for surplus cards, purple "Sell list · ×N owned" for sell list cards
   - Inline spike badge: green "↑ X%" if the card has spiked
   - Price: total value in green (surplus × unit price for surplus cards, owned × unit price for sell list cards), unit price below in muted text
   - Cards without Cardtrader listings show "No listings" instead of a price — the card is still visible with its surplus/sell-list status
   - Sorted by total value descending (cards without prices sort to the bottom)
8. **Card clicks** open the existing card detail panel

### Auth gate

The sell advisor requires authentication. Unauthenticated users see the existing sign-in prompt.

## Card Detail Panel Updates

### Market Price section

- Rename label from "Cardmarket Price" to "Market Price"
- Show trend price (large, green) with a directional indicator if spiking (↑ X% badge next to price)
- Show low price below as secondary info
- No price history chart for now

### Sell list toggle

Add below the "My Collection" section:

- If card is NOT on sell list: button "Add to sell list" (neutral style)
- If card IS on sell list: button "On sell list ✓" (purple accent) — clicking removes from sell list
- Requires authentication (button hidden for guests)

## Dashboard Widget Updates

### "Worth Selling" widget

- If there are price spikes in the user's collection, show a one-liner above the card list: "⚡ N cards spiked this week" — links to sell advisor with "Spiked" filter pre-selected
- Top 5 cards continue to sort by total value
- Cards that have spiked get the green "↑ X%" inline badge

## Frontend Hooks & Data Flow

### New hook: `useSellList()`

Fetches the user's sell list entries from the `sell_list` table. Provides `addToSellList(cardNumber)` and `removeFromSellList(cardNumber)` mutations. Uses TanStack Query with queryKey `["sell-list"]`.

### New hook: `usePriceHistory(cardNumbers, days)`

Fetches price history for a set of card numbers over the past N days from `card_price_history`. Used to compute spike data. Uses TanStack Query with queryKey `["price-history", cardNumbers, days]`.

### Updated: `buildSellableCards()`

The existing function in `lib/utils.ts` is extended to:

- Accept sell list entries as an additional parameter
- Include sell list cards in the output (with their full owned quantity, not just surplus)
- Tag each `SellableCard` with its source: `"surplus"`, `"sell-list"`, or both
- Accept price history data and compute spike percentage for each card

### Updated type: `SellableCard`

```typescript
export interface SellableCard {
  card: Card;
  owned: number;
  needed: number;
  surplus: number;
  price: CardPrice | null;
  total_value: number | null;
  source: "surplus" | "sell-list" | "both";
  spike_pct: number | null; // e.g., 0.42 for 42% increase, null if no spike
}
```

## Database Migration

A single new migration file adding:

1. `card_price_history` table with composite PK and RLS policy
2. `sell_list` table with composite PK, RLS policies, and foreign keys
3. Index on `card_price_history(card_number, recorded_at)` for efficient lookups

## GitHub Actions

The existing `sync-data.yml` workflow already runs `sync_prices.py` daily with the `CARDTRADER_ACCESS_TOKEN` secret. No workflow changes needed — the rewritten script will run in the same pipeline.

## Out of Scope

- Cardmarket API integration (no longer accepting new applicants)
- Per-variant pricing (all variants share base card price)
- Price alerts/notifications (push notifications, email)
- Price history charts in the UI
- Bulk sell list operations
- Export sell list to CSV or Cardmarket import format
