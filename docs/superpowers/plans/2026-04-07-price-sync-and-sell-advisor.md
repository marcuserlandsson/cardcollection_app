# Price Sync & Sell Advisor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a working Cardtrader price sync pipeline with 30-day price history, a manual sell list, and an enhanced sell advisor UI with price spike detection.

**Architecture:** Rewrite `sync_prices.py` to fetch prices per-expansion from Cardtrader API, storing current prices in `card_prices` and daily snapshots in `card_price_history`. Add a `sell_list` table for manual sell flags. Frontend computes price spikes client-side by comparing current prices against 7-day-old history. The sell advisor page becomes a unified list with filter chips, inline badges, and a horizontal spike card carousel.

**Tech Stack:** Python (requests, supabase-py), Supabase (Postgres, RLS), Next.js, TypeScript, TanStack Query, Tailwind CSS, Lucide React icons.

---

## File Map

### New files
- `supabase/migrations/006_price_history_and_sell_list.sql` — migration for `card_price_history` and `sell_list` tables
- `lib/hooks/use-sell-list.ts` — hook for sell list CRUD
- `lib/hooks/use-price-history.ts` — hook for fetching price history
- `lib/sell-utils.ts` — spike detection and extended sell logic (extracted from utils.ts to keep files focused)
- `components/sell/price-spike-cards.tsx` — horizontal scrollable spike card carousel
- `components/sell/sell-filter-chips.tsx` — filter chip row component
- `components/sell/sell-list-toggle.tsx` — add/remove from sell list button

### Modified files
- `scripts/sync_prices.py` — full rewrite for Cardtrader API
- `lib/types.ts` — add `SellListEntry`, `PriceHistoryEntry`, update `SellableCard`
- `lib/utils.ts` — remove `buildSellableCards` (moved to `sell-utils.ts`), keep other utilities
- `lib/hooks/use-prices.ts` — add `usePriceHistory` export (re-export from new file)
- `components/sell/sell-card-row.tsx` — update for source badges and spike indicators
- `components/sell/sell-summary.tsx` — no changes needed (already generic enough)
- `components/cards/card-panel.tsx` — rename price label, add spike indicator, add sell list toggle
- `components/dashboard/worth-selling.tsx` — add spike banner and inline spike badges
- `app/sell/page.tsx` — full rewrite with filters, spike cards, sell list integration

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/006_price_history_and_sell_list.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- ============================================
-- Price history table (30-day rolling snapshots)
-- ============================================
create table public.card_price_history (
  card_number text not null references public.cards(card_number) on delete cascade,
  recorded_at date not null default current_date,
  price_avg numeric,
  price_low numeric,
  price_trend numeric,
  primary key (card_number, recorded_at)
);

create index idx_price_history_lookup
  on public.card_price_history (card_number, recorded_at desc);

alter table public.card_price_history enable row level security;

create policy "Price history is publicly readable"
  on public.card_price_history for select
  using (true);

-- ============================================
-- Sell list table (user's manual sell flags)
-- ============================================
create table public.sell_list (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_number text not null references public.cards(card_number) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (user_id, card_number)
);

alter table public.sell_list enable row level security;

create policy "Users can view their own sell list"
  on public.sell_list for select
  using (auth.uid() = user_id);

create policy "Users can add to their own sell list"
  on public.sell_list for insert
  with check (auth.uid() = user_id);

create policy "Users can remove from their own sell list"
  on public.sell_list for delete
  using (auth.uid() = user_id);
```

- [ ] **Step 2: Apply migration to Supabase**

Run the migration against the Supabase database. If using local Supabase CLI:
```bash
npx supabase db push
```

Or apply manually via the Supabase dashboard SQL editor by pasting the contents of the migration file.

- [ ] **Step 3: Verify tables exist**

Run in the Supabase SQL editor:
```sql
select count(*) from information_schema.tables
where table_schema = 'public'
and table_name in ('card_price_history', 'sell_list');
-- Expected: 2
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/006_price_history_and_sell_list.sql
git commit -m "feat: add card_price_history and sell_list tables"
```

---

### Task 2: Rewrite Price Sync Script

**Files:**
- Modify: `scripts/sync_prices.py` (full rewrite)

- [ ] **Step 1: Rewrite sync_prices.py**

Replace the entire file with the Cardtrader-only implementation:

```python
"""
Sync card prices from Cardtrader API into Supabase.

Fetches marketplace listings per expansion, aggregates into
price_low/price_avg/price_trend, and stores both current prices
and daily history snapshots.

Usage:
    python scripts/sync_prices.py

Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and
CARDTRADER_ACCESS_TOKEN in environment or .env.local.
"""

import os
import sys
import time
import statistics
from datetime import date, timedelta

import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv(".env.local", override=True)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

CARDTRADER_ACCESS_TOKEN = os.environ.get("CARDTRADER_ACCESS_TOKEN")
CARDTRADER_BASE_URL = "https://api.cardtrader.com/api/v2"

# Rate limiting: 150ms between requests to stay under 10 req/sec
REQUEST_DELAY = 0.15


def cardtrader_get(path: str, params: dict | None = None) -> dict | list:
    """Make an authenticated GET request to Cardtrader API."""
    headers = {"Authorization": f"Bearer {CARDTRADER_ACCESS_TOKEN}"}
    resp = requests.get(
        f"{CARDTRADER_BASE_URL}{path}",
        params=params or {},
        headers=headers,
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def find_digimon_game_id() -> int | None:
    """Find the Cardtrader game_id for Digimon."""
    games = cardtrader_get("/games")
    for game in games:
        name = game.get("display_name", "") or game.get("name", "")
        if "digimon" in name.lower():
            return game["id"]
    return None


def fetch_expansions(game_id: int) -> list[dict]:
    """Fetch all expansions for a game."""
    expansions = cardtrader_get("/expansions", {"game_id": game_id})
    return expansions


def fetch_blueprints(expansion_id: int) -> dict[int, str]:
    """Fetch blueprints for an expansion. Returns {blueprint_id: collector_number}."""
    blueprints = cardtrader_get("/blueprints/export", {"expansion_id": expansion_id})
    mapping = {}
    for bp in blueprints:
        bp_id = bp.get("id")
        # collector_number may be in properties_hash or at top level
        collector_num = None
        props = bp.get("properties_hash", {})
        if isinstance(props, dict):
            collector_num = props.get("collector_number")
        if not collector_num:
            collector_num = bp.get("collector_number")
        if bp_id and collector_num:
            mapping[bp_id] = str(collector_num).strip()
    return mapping


def fetch_marketplace_prices(expansion_id: int) -> dict[int, list[float]]:
    """Fetch marketplace products for an expansion. Returns {blueprint_id: [prices_eur]}."""
    try:
        products = cardtrader_get("/marketplace/products", {"expansion_id": expansion_id})
    except requests.HTTPError as e:
        if e.response is not None and e.response.status_code == 404:
            return {}
        raise

    prices_by_blueprint: dict[int, list[float]] = {}
    for product in products:
        bp_id = product.get("blueprint_id")
        if not bp_id:
            continue
        price_cents = product.get("price", {}).get("cents", 0)
        if price_cents > 0:
            prices_by_blueprint.setdefault(bp_id, []).append(price_cents / 100.0)

    return prices_by_blueprint


def aggregate_prices(price_list: list[float]) -> dict:
    """Aggregate a list of prices into low/avg/trend."""
    return {
        "price_low": min(price_list),
        "price_avg": round(sum(price_list) / len(price_list), 4),
        "price_trend": round(statistics.median(price_list), 4),
    }


def sync_prices():
    if not CARDTRADER_ACCESS_TOKEN:
        print("ERROR: CARDTRADER_ACCESS_TOKEN not set.")
        print("Set it in .env.local or as a GitHub Actions secret.")
        sys.exit(1)

    print("Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Load all card numbers from our DB for matching
    result = supabase.table("cards").select("card_number, base_card_number").execute()
    all_cards = result.data
    # Build set of base card numbers for matching
    base_card_numbers = set(row["base_card_number"] for row in all_cards)
    print(f"Loaded {len(base_card_numbers)} base card numbers from database")

    # Step 1: Find Digimon game
    print("Finding Digimon game on Cardtrader...")
    game_id = find_digimon_game_id()
    if not game_id:
        print("ERROR: Could not find Digimon game on Cardtrader.")
        sys.exit(1)
    print(f"Found Digimon game_id: {game_id}")

    # Step 2: Fetch expansions
    print("Fetching expansions...")
    expansions = fetch_expansions(game_id)
    print(f"Found {len(expansions)} expansions")

    # Step 3: Process each expansion
    all_prices: dict[str, dict] = {}  # card_number -> {price_low, price_avg, price_trend}
    errors = 0

    for i, expansion in enumerate(expansions):
        exp_id = expansion.get("id")
        exp_name = expansion.get("name", f"ID:{exp_id}")

        try:
            # Fetch blueprints for card number mapping
            bp_mapping = fetch_blueprints(exp_id)
            time.sleep(REQUEST_DELAY)

            # Fetch marketplace prices
            marketplace = fetch_marketplace_prices(exp_id)
            time.sleep(REQUEST_DELAY)

            matched = 0
            for bp_id, price_list in marketplace.items():
                collector_num = bp_mapping.get(bp_id)
                if not collector_num:
                    continue
                # Match against our base card numbers
                if collector_num in base_card_numbers:
                    card_number = collector_num
                elif collector_num.upper() in base_card_numbers:
                    card_number = collector_num.upper()
                else:
                    continue

                agg = aggregate_prices(price_list)
                # Keep the best data if a card appears in multiple expansions
                if card_number not in all_prices or len(price_list) > all_prices[card_number].get("_listing_count", 0):
                    agg["_listing_count"] = len(price_list)
                    all_prices[card_number] = agg
                matched += 1

            print(f"  [{i+1}/{len(expansions)}] {exp_name}: {len(marketplace)} blueprints with listings, {matched} matched to DB")

        except Exception as e:
            print(f"  [{i+1}/{len(expansions)}] {exp_name}: ERROR - {e}")
            errors += 1
            time.sleep(REQUEST_DELAY)

    # Remove internal tracking field
    for p in all_prices.values():
        p.pop("_listing_count", None)

    if not all_prices:
        print("WARNING: No prices fetched from Cardtrader.")
        if errors == len(expansions):
            print("All expansions failed. Check your CARDTRADER_ACCESS_TOKEN.")
            sys.exit(1)
        sys.exit(0)

    # Step 4: Upsert current prices
    print(f"\nUpserting {len(all_prices)} current prices...")
    batch = []
    for card_number, price_data in all_prices.items():
        batch.append({
            "card_number": card_number,
            "price_avg": price_data["price_avg"],
            "price_low": price_data["price_low"],
            "price_trend": price_data["price_trend"],
        })
        if len(batch) >= 100:
            supabase.table("card_prices").upsert(batch).execute()
            batch = []
    if batch:
        supabase.table("card_prices").upsert(batch).execute()

    # Step 5: Insert daily history snapshot
    today = date.today().isoformat()
    print(f"Inserting price history for {today}...")
    batch = []
    for card_number, price_data in all_prices.items():
        batch.append({
            "card_number": card_number,
            "recorded_at": today,
            "price_avg": price_data["price_avg"],
            "price_low": price_data["price_low"],
            "price_trend": price_data["price_trend"],
        })
        if len(batch) >= 100:
            supabase.table("card_price_history").upsert(batch).execute()
            batch = []
    if batch:
        supabase.table("card_price_history").upsert(batch).execute()

    # Step 6: Cleanup old history
    cutoff = (date.today() - timedelta(days=30)).isoformat()
    print(f"Cleaning up history older than {cutoff}...")
    supabase.table("card_price_history").delete().lt("recorded_at", cutoff).execute()

    # Summary
    total_in_db = supabase.table("card_prices").select("card_number", count="exact").execute()
    unmatched = len(base_card_numbers) - len(all_prices)
    print(f"\nDone!")
    print(f"  Expansions processed: {len(expansions)} ({errors} errors)")
    print(f"  Cards priced: {len(all_prices)}")
    print(f"  Cards without listings: {unmatched}")
    print(f"  Total in card_prices table: {total_in_db.count}")


if __name__ == "__main__":
    sync_prices()
```

- [ ] **Step 2: Test locally with dry run**

```bash
cd scripts
python sync_prices.py
```

Expected output: Script connects to Supabase, finds Digimon game, iterates expansions, prints progress per expansion, upserts prices. Check for any API errors or mapping issues.

If the Cardtrader API returns a different structure than expected (e.g., `collector_number` is in a different field), adjust the `fetch_blueprints` function accordingly based on the actual response.

- [ ] **Step 3: Verify data in Supabase**

Check in the Supabase dashboard:
```sql
select count(*) from card_prices;
-- Should show > 0

select * from card_prices order by price_trend desc limit 5;
-- Should show real prices

select count(*) from card_price_history where recorded_at = current_date;
-- Should match the card_prices count
```

- [ ] **Step 4: Commit**

```bash
git add scripts/sync_prices.py
git commit -m "feat: rewrite sync_prices.py for Cardtrader API

Fetches prices per-expansion via blueprints + marketplace endpoints.
Aggregates listings into low/avg/median prices. Stores daily history
snapshots and cleans up entries older than 30 days."
```

---

### Task 3: Frontend Types and Sell Utilities

**Files:**
- Modify: `lib/types.ts`
- Create: `lib/sell-utils.ts`
- Modify: `lib/utils.ts`

- [ ] **Step 1: Update types in `lib/types.ts`**

Add the new types and update `SellableCard`:

```typescript
// Add after the CardPrice interface (after line 48):

export interface PriceHistoryEntry {
  card_number: string;
  recorded_at: string;
  price_avg: number | null;
  price_low: number | null;
  price_trend: number | null;
}

export interface SellListEntry {
  user_id: string;
  card_number: string;
  added_at: string;
}
```

Update the `SellableCard` interface (replace lines 56-63):

```typescript
export interface SellableCard {
  card: Card;
  owned: number;
  needed: number;
  surplus: number;
  price: CardPrice | null;
  total_value: number | null;
  source: "surplus" | "sell-list" | "both";
  spike_pct: number | null;
}
```

- [ ] **Step 2: Create `lib/sell-utils.ts`**

This file contains the extended sell logic and spike detection:

```typescript
import type {
  Card,
  CollectionEntry,
  DeckCard,
  CardPrice,
  SellableCard,
  SellListEntry,
  PriceHistoryEntry,
} from "./types";

const SPIKE_THRESHOLD = 0.3; // 30% increase
const SPIKE_LOOKBACK_DAYS = 7;

export function computeSpikePct(
  currentPrice: number | null,
  history: PriceHistoryEntry[]
): number | null {
  if (!currentPrice || history.length === 0) return null;

  // Find the entry closest to SPIKE_LOOKBACK_DAYS ago
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - SPIKE_LOOKBACK_DAYS);
  const targetStr = targetDate.toISOString().slice(0, 10);

  // Sort by date ascending and find the entry closest to target
  const sorted = [...history].sort((a, b) =>
    a.recorded_at.localeCompare(b.recorded_at)
  );

  let oldEntry: PriceHistoryEntry | null = null;
  for (const entry of sorted) {
    if (entry.recorded_at <= targetStr) {
      oldEntry = entry;
    }
  }

  if (!oldEntry || !oldEntry.price_trend || oldEntry.price_trend <= 0) return null;

  const pctChange = (currentPrice - oldEntry.price_trend) / oldEntry.price_trend;
  return pctChange >= SPIKE_THRESHOLD ? pctChange : null;
}

export function buildSellableCards(
  cards: Card[],
  collection: CollectionEntry[],
  deckCards: DeckCard[],
  prices: CardPrice[],
  sellList: SellListEntry[],
  priceHistory: PriceHistoryEntry[]
): SellableCard[] {
  const collectionMap = new Map(
    collection.map((c) => [c.card_number, c.quantity])
  );
  const priceMap = new Map(prices.map((p) => [p.card_number, p]));
  const sellListSet = new Set(sellList.map((s) => s.card_number));

  const deckCardsByBase = new Map<string, DeckCard[]>();
  for (const dc of deckCards) {
    const existing = deckCardsByBase.get(dc.card_number) || [];
    existing.push(dc);
    deckCardsByBase.set(dc.card_number, existing);
  }

  // Group price history by card_number
  const historyByCard = new Map<string, PriceHistoryEntry[]>();
  for (const entry of priceHistory) {
    const existing = historyByCard.get(entry.card_number) || [];
    existing.push(entry);
    historyByCard.set(entry.card_number, existing);
  }

  // Group cards by base_card_number for surplus calculation
  const cardsByBase = new Map<string, Card[]>();
  for (const card of cards) {
    const base = card.base_card_number;
    const existing = cardsByBase.get(base) || [];
    existing.push(card);
    cardsByBase.set(base, existing);
  }

  const sellable: SellableCard[] = [];
  const processedCards = new Set<string>();

  for (const [base, variants] of cardsByBase) {
    const totalOwned = variants.reduce(
      (sum, v) => sum + (collectionMap.get(v.card_number) || 0),
      0
    );
    if (totalOwned === 0) continue;

    const usages = deckCardsByBase.get(base) || [];
    const needed = Math.max(
      variants[0].max_copies,
      usages.reduce((sum, dc) => sum + dc.quantity, 0)
    );
    const surplus = Math.max(0, totalOwned - needed);

    const price = priceMap.get(base) || null;
    const history = historyByCard.get(base) || [];
    const spikePct = computeSpikePct(price?.price_trend ?? null, history);

    // Check if any variant is on sell list
    const onSellList = variants.some((v) => sellListSet.has(v.card_number));

    if (surplus > 0) {
      // Recommend selling Regular variants first
      const sortedVariants = [...variants].sort((a, b) => {
        if (a.variant_name === "Regular" && b.variant_name !== "Regular") return -1;
        if (a.variant_name !== "Regular" && b.variant_name === "Regular") return 1;
        return a.card_number.localeCompare(b.card_number);
      });

      let remaining = surplus;
      for (const variant of sortedVariants) {
        if (remaining <= 0) break;
        const owned = collectionMap.get(variant.card_number) || 0;
        if (owned === 0) continue;
        const sellQty = Math.min(owned, remaining);
        const totalValue = price?.price_trend ? sellQty * price.price_trend : null;
        const isOnSellList = sellListSet.has(variant.card_number);

        sellable.push({
          card: variant,
          owned,
          needed,
          surplus: sellQty,
          price,
          total_value: totalValue,
          source: isOnSellList ? "both" : "surplus",
          spike_pct: spikePct,
        });
        processedCards.add(variant.card_number);
        remaining -= sellQty;
      }
    }

    // Add sell-list-only cards (not already added as surplus)
    if (onSellList) {
      for (const variant of variants) {
        if (processedCards.has(variant.card_number)) continue;
        if (!sellListSet.has(variant.card_number)) continue;
        const owned = collectionMap.get(variant.card_number) || 0;
        if (owned === 0) continue;
        const totalValue = price?.price_trend ? owned * price.price_trend : null;

        sellable.push({
          card: variant,
          owned,
          needed,
          surplus: 0,
          price,
          total_value: totalValue,
          source: "sell-list",
          spike_pct: spikePct,
        });
        processedCards.add(variant.card_number);
      }
    }
  }

  return sellable.sort(
    (a, b) => (b.total_value ?? -1) - (a.total_value ?? -1)
  );
}

export type SpikedCard = {
  card: Card;
  owned: number;
  price: CardPrice;
  spike_pct: number;
  old_price: number;
};

export function findSpikedCards(
  cards: Card[],
  collection: CollectionEntry[],
  prices: CardPrice[],
  priceHistory: PriceHistoryEntry[],
  sellList: SellListEntry[]
): SpikedCard[] {
  const collectionMap = new Map(
    collection.map((c) => [c.card_number, c.quantity])
  );
  const sellListSet = new Set(sellList.map((s) => s.card_number));
  const priceMap = new Map(prices.map((p) => [p.card_number, p]));

  const historyByCard = new Map<string, PriceHistoryEntry[]>();
  for (const entry of priceHistory) {
    const existing = historyByCard.get(entry.card_number) || [];
    existing.push(entry);
    historyByCard.set(entry.card_number, existing);
  }

  const spiked: SpikedCard[] = [];

  for (const card of cards) {
    const owned = collectionMap.get(card.card_number) || 0;
    const onSellList = sellListSet.has(card.card_number);
    if (owned === 0 && !onSellList) continue;

    const base = card.base_card_number;
    const price = priceMap.get(base);
    if (!price?.price_trend) continue;

    const history = historyByCard.get(base) || [];
    const spikePct = computeSpikePct(price.price_trend, history);
    if (spikePct === null) continue;

    // Find old price for display
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - SPIKE_LOOKBACK_DAYS);
    const targetStr = targetDate.toISOString().slice(0, 10);
    const sorted = [...history].sort((a, b) =>
      a.recorded_at.localeCompare(b.recorded_at)
    );
    let oldPrice = 0;
    for (const entry of sorted) {
      if (entry.recorded_at <= targetStr && entry.price_trend) {
        oldPrice = entry.price_trend;
      }
    }

    // Only include one variant per base card (prefer the one we own most of)
    const existingIdx = spiked.findIndex((s) => s.card.base_card_number === base);
    if (existingIdx >= 0) {
      if (owned > spiked[existingIdx].owned) {
        spiked[existingIdx] = { card, owned, price, spike_pct: spikePct, old_price: oldPrice };
      }
    } else {
      spiked.push({ card, owned, price, spike_pct: spikePct, old_price: oldPrice });
    }
  }

  return spiked.sort((a, b) => b.spike_pct - a.spike_pct);
}
```

- [ ] **Step 3: Update `lib/utils.ts` — remove `buildSellableCards`**

Remove the `buildSellableCards` function and `calculateSurplus` function from `lib/utils.ts` (lines 1-92). Keep the imports for types that are still used. The file should contain only:

```typescript
export function formatPrice(value: number | null): string {
  if (value === null) return "Price not available";
  return `€${value.toFixed(2)}`;
}

export function getCardImageUrl(cardNumber: string): string {
  const base = cardNumber.replace(/-V\d+$/, "");
  return `https://images.digimoncard.io/images/cards/${base}.jpg`;
}

export function getBaseCardNumber(cardNumber: string): string {
  return cardNumber.replace(/-V\d+$/, "");
}

export function timeAgo(date: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
```

- [ ] **Step 4: Update imports in files that used `buildSellableCards` from `lib/utils`**

In `app/sell/page.tsx`, change:
```typescript
// Old:
import { buildSellableCards, timeAgo } from "@/lib/utils";
// New:
import { timeAgo } from "@/lib/utils";
import { buildSellableCards } from "@/lib/sell-utils";
```

In `components/dashboard/worth-selling.tsx`, change:
```typescript
// Old:
import { buildSellableCards, formatPrice } from "@/lib/utils";
// New:
import { formatPrice } from "@/lib/utils";
import { buildSellableCards } from "@/lib/sell-utils";
```

- [ ] **Step 5: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds. There will be type errors in the sell page and dashboard widget because `buildSellableCards` now expects additional parameters — these will be fixed in later tasks. For now, temporarily pass empty arrays `[]` for the new `sellList` and `priceHistory` parameters in both files to keep the build green.

In `app/sell/page.tsx`:
```typescript
const sellableCards = cards && collection && allDeckCards && prices
  ? buildSellableCards(cards, collection, allDeckCards ?? [], prices, [], [])
  : [];
```

In `components/dashboard/worth-selling.tsx`:
```typescript
const sellableCards =
  cards && collection && allDeckCards && prices
    ? buildSellableCards(cards, collection, allDeckCards, prices, [], [])
    : [];
```

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/sell-utils.ts lib/utils.ts app/sell/page.tsx components/dashboard/worth-selling.tsx
git commit -m "feat: add sell-utils with spike detection and sell list support

Extract buildSellableCards to lib/sell-utils.ts with new parameters
for sell list entries and price history. Add SellListEntry,
PriceHistoryEntry types. Add findSpikedCards utility."
```

---

### Task 4: Frontend Hooks (Sell List, Price History)

**Files:**
- Create: `lib/hooks/use-sell-list.ts`
- Create: `lib/hooks/use-price-history.ts`

- [ ] **Step 1: Create `lib/hooks/use-sell-list.ts`**

```typescript
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { SellListEntry } from "@/lib/types";

const supabase = createClient();

export function useSellList() {
  return useQuery<SellListEntry[]>({
    queryKey: ["sell-list"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("sell_list")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as SellListEntry[];
    },
  });
}

export function useAddToSellList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cardNumber: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("sell_list").upsert({
        user_id: user.id,
        card_number: cardNumber,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sell-list"] });
    },
  });
}

export function useRemoveFromSellList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cardNumber: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("sell_list")
        .delete()
        .eq("user_id", user.id)
        .eq("card_number", cardNumber);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sell-list"] });
    },
  });
}
```

- [ ] **Step 2: Create `lib/hooks/use-price-history.ts`**

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { PriceHistoryEntry } from "@/lib/types";

const supabase = createClient();

export function usePriceHistory(days: number = 7) {
  return useQuery<PriceHistoryEntry[]>({
    queryKey: ["price-history", days],
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from("card_price_history")
        .select("*")
        .gte("recorded_at", cutoffStr);
      if (error) throw error;
      return data as PriceHistoryEntry[];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes — history doesn't change often
  });
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds. Hooks aren't imported anywhere yet.

- [ ] **Step 4: Commit**

```bash
git add lib/hooks/use-sell-list.ts lib/hooks/use-price-history.ts
git commit -m "feat: add useSellList and usePriceHistory hooks"
```

---

### Task 5: Sell List Toggle Component

**Files:**
- Create: `components/sell/sell-list-toggle.tsx`
- Modify: `components/cards/card-panel.tsx`

- [ ] **Step 1: Create `components/sell/sell-list-toggle.tsx`**

```typescript
"use client";

import { useSellList, useAddToSellList, useRemoveFromSellList } from "@/lib/hooks/use-sell-list";
import { ClipboardList, Check, Loader2 } from "lucide-react";

interface SellListToggleProps {
  cardNumber: string;
}

export default function SellListToggle({ cardNumber }: SellListToggleProps) {
  const { data: sellList } = useSellList();
  const addMutation = useAddToSellList();
  const removeMutation = useRemoveFromSellList();

  const isOnList = sellList?.some((s) => s.card_number === cardNumber) ?? false;
  const isPending = addMutation.isPending || removeMutation.isPending;

  const handleToggle = () => {
    if (isPending) return;
    if (isOnList) {
      removeMutation.mutate(cardNumber);
    } else {
      addMutation.mutate(cardNumber);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
        isOnList
          ? "bg-[var(--purple-translucent)] text-[var(--purple)] border border-[var(--purple-border)]"
          : "bg-[var(--elevated)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--surface)]"
      }`}
    >
      {isPending ? (
        <Loader2 size={15} className="animate-spin" />
      ) : isOnList ? (
        <Check size={15} />
      ) : (
        <ClipboardList size={15} />
      )}
      {isOnList ? "On sell list" : "Add to sell list"}
    </button>
  );
}
```

- [ ] **Step 2: Add sell list toggle to card panel**

In `components/cards/card-panel.tsx`, add the import at the top (after the other component imports):

```typescript
import SellListToggle from "@/components/sell/sell-list-toggle";
```

Then add the sell list toggle between the Collection section and the Deck Usage section. Find this code block (around line 152-155):

```typescript
        {/* Collection */}
        <div className="mt-3 rounded-lg bg-[var(--elevated)] p-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">My Collection</div>
          <QuantityControl cardNumber={card.card_number} />
        </div>

        {/* Deck Usage */}
```

Replace with:

```typescript
        {/* Collection */}
        <div className="mt-3 rounded-lg bg-[var(--elevated)] p-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">My Collection</div>
          <QuantityControl cardNumber={card.card_number} />
        </div>

        {/* Sell List */}
        <SellListToggle cardNumber={card.card_number} />

        {/* Deck Usage */}
```

- [ ] **Step 3: Update price label and add spike indicator in card panel**

In `components/cards/card-panel.tsx`, find the Price section (around line 163-175):

```typescript
        {/* Price */}
        <div className="mt-3 rounded-lg bg-[var(--elevated)] p-3">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Cardmarket Price</div>
          <div className="flex items-baseline gap-3">
            <span className="flex items-center gap-1.5 text-lg font-bold text-[var(--green)]">
              <Coins size={16} />
              {formatPrice(price?.price_trend ?? null)}
            </span>
            {price?.price_low !== null && price?.price_low !== undefined && (
              <span className="text-xs text-[var(--text-muted)]">Low: {formatPrice(price.price_low)}</span>
            )}
          </div>
        </div>
```

Replace with:

```typescript
        {/* Price */}
        <div className="mt-3 rounded-lg bg-[var(--elevated)] p-3">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Market Price</div>
          <div className="flex items-baseline gap-3">
            <span className="flex items-center gap-1.5 text-lg font-bold text-[var(--green)]">
              <Coins size={16} />
              {formatPrice(price?.price_trend ?? null)}
            </span>
            {price?.price_low !== null && price?.price_low !== undefined && (
              <span className="text-xs text-[var(--text-muted)]">Low: {formatPrice(price.price_low)}</span>
            )}
          </div>
        </div>
```

(The only change here is "Cardmarket Price" → "Market Price". Spike indicator on the price will be connected once the price history hook is wired in Task 7.)

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add components/sell/sell-list-toggle.tsx components/cards/card-panel.tsx
git commit -m "feat: add sell list toggle to card panel, rename to Market Price"
```

---

### Task 6: Sell Advisor UI Components

**Files:**
- Create: `components/sell/price-spike-cards.tsx`
- Create: `components/sell/sell-filter-chips.tsx`
- Modify: `components/sell/sell-card-row.tsx`

- [ ] **Step 1: Create `components/sell/price-spike-cards.tsx`**

```typescript
import CardImage from "@/components/cards/card-image";
import { formatPrice } from "@/lib/utils";
import { Zap } from "lucide-react";
import type { SpikedCard } from "@/lib/sell-utils";
import type { Card } from "@/lib/types";

interface PriceSpikeCardsProps {
  spikedCards: SpikedCard[];
  onCardClick: (card: Card) => void;
}

export default function PriceSpikeCards({ spikedCards, onCardClick }: PriceSpikeCardsProps) {
  if (spikedCards.length === 0) return null;

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-[var(--yellow)]">
          <Zap size={14} />
          Price Spikes
        </div>
        <span className="text-xs text-[var(--text-dim)]">
          {spikedCards.length} this week
        </span>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
        {spikedCards.map((item) => (
          <button
            key={item.card.card_number}
            onClick={() => onCardClick(item.card)}
            className="flex-shrink-0 w-[148px] rounded-xl border border-[var(--yellow-border)] bg-[var(--surface)] p-2.5 text-left transition-colors hover:bg-[var(--elevated)]"
          >
            <div className="relative mb-2 h-[72px] w-full overflow-hidden rounded-lg border border-[var(--border)]">
              <CardImage
                cardNumber={item.card.card_number}
                alt={item.card.name}
                imageUrl={item.card.image_url}
                fill
                sizes="132px"
                className="object-cover"
              />
            </div>
            <p className="truncate text-xs font-semibold">{item.card.name}</p>
            <p className="text-[10px] text-[var(--text-dim)]">{item.card.card_number}</p>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-sm font-bold text-[var(--green)]">
                ↑ {Math.round(item.spike_pct * 100)}%
              </span>
              <span className="text-[10px] text-[var(--text-dim)]">
                {formatPrice(item.old_price)} → {formatPrice(item.price.price_trend)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/sell/sell-filter-chips.tsx`**

```typescript
export type SellFilter = "all" | "surplus" | "sell-list" | "spiked";

interface SellFilterChipsProps {
  active: SellFilter;
  onChange: (filter: SellFilter) => void;
  counts: { all: number; surplus: number; sellList: number; spiked: number };
}

const FILTERS: { key: SellFilter; label: string; countKey: keyof SellFilterChipsProps["counts"] }[] = [
  { key: "all", label: "All", countKey: "all" },
  { key: "surplus", label: "Surplus", countKey: "surplus" },
  { key: "sell-list", label: "Sell List", countKey: "sellList" },
  { key: "spiked", label: "Spiked ↑", countKey: "spiked" },
];

export default function SellFilterChips({ active, onChange, counts }: SellFilterChipsProps) {
  return (
    <div className="flex gap-2">
      {FILTERS.map(({ key, label, countKey }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            active === key
              ? "bg-[var(--accent)] text-[var(--background)]"
              : "bg-[var(--elevated)] text-[var(--text-muted)] border border-[var(--border)] hover:bg-[var(--surface)]"
          }`}
        >
          {label}
          {counts[countKey] > 0 && (
            <span className={`ml-1.5 ${active === key ? "opacity-75" : "text-[var(--text-dim)]"}`}>
              {counts[countKey]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Update `components/sell/sell-card-row.tsx`**

Replace the entire file to support source badges and spike indicators:

```typescript
import CardImage from "@/components/cards/card-image";
import { formatPrice } from "@/lib/utils";
import { Coins, PackageMinus, ClipboardList } from "lucide-react";
import type { SellableCard } from "@/lib/types";

interface SellCardRowProps {
  item: SellableCard;
  onClick: () => void;
}

export default function SellCardRow({ item, onClick }: SellCardRowProps) {
  const isSellListOnly = item.source === "sell-list";

  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition-colors duration-150 hover:bg-[var(--elevated)]">
      <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded-md border border-[var(--border)]">
        <CardImage cardNumber={item.card.card_number} alt={item.card.name} imageUrl={item.card.image_url} fill sizes="44px" className="object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{item.card.name}</p>
        <p className="text-xs text-[var(--text-muted)]">{item.card.card_number}</p>
        <div className="flex items-center gap-1.5 mt-1">
          {isSellListOnly ? (
            <span className="flex items-center gap-1 text-xs font-medium text-[var(--purple)]">
              <ClipboardList size={11} />
              Sell list · ×{item.owned} owned
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium text-[var(--yellow)]">
              <PackageMinus size={11} />
              ×{item.surplus} surplus
            </span>
          )}
          {item.spike_pct !== null && (
            <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold text-[var(--green)] bg-[var(--green-translucent)]">
              ↑ {Math.round(item.spike_pct * 100)}%
            </span>
          )}
          {item.source === "both" && (
            <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-[var(--purple)] bg-[var(--purple-translucent)]">
              <ClipboardList size={9} />
              Sell list
            </span>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        {item.price ? (
          <>
            <p className="flex items-center justify-end gap-1 text-sm font-bold text-[var(--green)]">
              <Coins size={14} />
              {formatPrice(item.total_value)}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{formatPrice(item.price.price_trend)} each</p>
          </>
        ) : (
          <p className="text-xs italic text-[var(--text-dim)]">No listings</p>
        )}
      </div>
    </button>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: Build succeeds. New components aren't imported by the page yet.

- [ ] **Step 5: Commit**

```bash
git add components/sell/price-spike-cards.tsx components/sell/sell-filter-chips.tsx components/sell/sell-card-row.tsx
git commit -m "feat: add spike cards, filter chips, and updated sell card row"
```

---

### Task 7: Rewrite Sell Advisor Page

**Files:**
- Modify: `app/sell/page.tsx`

- [ ] **Step 1: Rewrite `app/sell/page.tsx`**

Replace the entire file:

```typescript
"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useCollection } from "@/lib/hooks/use-collection";
import { useAllDeckCards } from "@/lib/hooks/use-decks";
import { usePrices } from "@/lib/hooks/use-prices";
import { useSellList } from "@/lib/hooks/use-sell-list";
import { usePriceHistory } from "@/lib/hooks/use-price-history";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { buildSellableCards, findSpikedCards } from "@/lib/sell-utils";
import { timeAgo, formatPrice } from "@/lib/utils";
import SellSummary from "@/components/sell/sell-summary";
import SellCardRow from "@/components/sell/sell-card-row";
import PriceSpikeCards from "@/components/sell/price-spike-cards";
import SellFilterChips from "@/components/sell/sell-filter-chips";
import type { SellFilter } from "@/components/sell/sell-filter-chips";
import CardPanel from "@/components/cards/card-panel";
import Link from "next/link";
import { TrendingUp, Clock, LogIn } from "lucide-react";
import type { Card } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

const supabase = createClient();

export default function SellPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const supabaseAuth = createClient();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [filter, setFilter] = useState<SellFilter>("all");

  const { data: collection } = useCollection();
  const { data: allDeckCards } = useAllDeckCards();
  const { data: prices } = usePrices();
  const { data: sellList } = useSellList();
  const { data: priceHistory } = usePriceHistory(7);

  useEffect(() => {
    supabaseAuth.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthChecked(true);
    });
  }, [supabaseAuth.auth]);

  // Fetch card data for all owned cards + sell list cards
  const ownedCardNumbers = collection?.map((c) => c.card_number) ?? [];
  const sellListCardNumbers = sellList?.map((s) => s.card_number) ?? [];
  const allRelevantCardNumbers = [...new Set([...ownedCardNumbers, ...sellListCardNumbers])];

  const { data: cards } = useQuery<Card[]>({
    queryKey: ["sell-cards", allRelevantCardNumbers],
    queryFn: async () => {
      if (allRelevantCardNumbers.length === 0) return [];
      const { data, error } = await supabase.from("cards").select("*").in("card_number", allRelevantCardNumbers);
      if (error) throw error;
      return data as Card[];
    },
    enabled: allRelevantCardNumbers.length > 0,
  });

  const sellableCards = useMemo(() => {
    if (!cards || !collection || !allDeckCards || !prices) return [];
    return buildSellableCards(
      cards, collection, allDeckCards, prices,
      sellList ?? [], priceHistory ?? []
    );
  }, [cards, collection, allDeckCards, prices, sellList, priceHistory]);

  const spikedCards = useMemo(() => {
    if (!cards || !collection || !prices || !priceHistory) return [];
    return findSpikedCards(cards, collection, prices, priceHistory, sellList ?? []);
  }, [cards, collection, prices, priceHistory, sellList]);

  // Filter logic
  const filteredCards = useMemo(() => {
    switch (filter) {
      case "surplus":
        return sellableCards.filter((c) => c.source === "surplus" || c.source === "both");
      case "sell-list":
        return sellableCards.filter((c) => c.source === "sell-list" || c.source === "both");
      case "spiked":
        return sellableCards.filter((c) => c.spike_pct !== null);
      default:
        return sellableCards;
    }
  }, [sellableCards, filter]);

  const filterCounts = useMemo(() => ({
    all: sellableCards.length,
    surplus: sellableCards.filter((c) => c.source === "surplus" || c.source === "both").length,
    sellList: sellableCards.filter((c) => c.source === "sell-list" || c.source === "both").length,
    spiked: sellableCards.filter((c) => c.spike_pct !== null).length,
  }), [sellableCards]);

  const totalSurplus = sellableCards.reduce((sum, s) => sum + s.surplus, 0);
  const totalValue = sellableCards.reduce((sum, s) => sum + (s.total_value ?? 0), 0);

  const latestFetch = prices?.reduce((latest, p) => {
    return !latest || p.fetched_at > latest ? p.fetched_at : latest;
  }, "" as string);

  const handleCardClick = useCallback((card: Card) => { setSelectedCard(card); }, []);

  if (authChecked && !user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <TrendingUp size={40} className="text-[var(--border)]" />
        <p className="text-[var(--text-muted)]">Sign in to access the sell advisor.</p>
        <Link href="/login" className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--background)] hover:bg-[var(--accent-hover)]">
          <LogIn size={15} />
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Sell Advisor</h1>

      {sellableCards.length > 0 && (
        <SellSummary surplusCount={totalSurplus} totalValue={totalValue > 0 ? totalValue : null} />
      )}

      {latestFetch && (
        <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <Clock size={12} />
          Prices updated {timeAgo(latestFetch)}
        </p>
      )}

      <PriceSpikeCards spikedCards={spikedCards} onCardClick={handleCardClick} />

      {(sellableCards.length > 0 || spikedCards.length > 0) && (
        <>
          {spikedCards.length > 0 && <div className="border-t border-[var(--border)]" />}
          <SellFilterChips active={filter} onChange={setFilter} counts={filterCounts} />
        </>
      )}

      {filteredCards.length === 0 && sellableCards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <TrendingUp size={40} className="mb-3 text-[var(--border)]" />
          <p className="text-sm text-[var(--text-muted)]">No surplus cards to sell.</p>
          <p className="text-xs text-[var(--text-dim)]">Cards beyond your playset limit or deck needs will appear here.</p>
        </div>
      )}

      {filteredCards.length === 0 && sellableCards.length > 0 && (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">No cards match this filter.</p>
      )}

      <div className="space-y-2">
        {filteredCards.map((item) => (
          <SellCardRow key={item.card.card_number} item={item} onClick={() => handleCardClick(item.card)} />
        ))}
      </div>

      <CardPanel card={selectedCard} onClose={() => setSelectedCard(null)} onCardSelect={setSelectedCard} />
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/sell/page.tsx
git commit -m "feat: rewrite sell advisor page with filters, spikes, and sell list"
```

---

### Task 8: Update Dashboard Widget

**Files:**
- Modify: `components/dashboard/worth-selling.tsx`

- [ ] **Step 1: Update `components/dashboard/worth-selling.tsx`**

Replace the entire file:

```typescript
"use client";

import Link from "next/link";
import { useCollection } from "@/lib/hooks/use-collection";
import { useAllDeckCards } from "@/lib/hooks/use-decks";
import { usePrices } from "@/lib/hooks/use-prices";
import { useSellList } from "@/lib/hooks/use-sell-list";
import { usePriceHistory } from "@/lib/hooks/use-price-history";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { buildSellableCards, findSpikedCards } from "@/lib/sell-utils";
import { formatPrice } from "@/lib/utils";
import CardImage from "@/components/cards/card-image";
import { TrendingUp, PackageMinus, Coins, Zap } from "lucide-react";
import type { Card } from "@/lib/types";

const supabase = createClient();

export default function WorthSelling() {
  const { data: collection } = useCollection();
  const { data: allDeckCards } = useAllDeckCards();
  const { data: prices } = usePrices();
  const { data: sellList } = useSellList();
  const { data: priceHistory } = usePriceHistory(7);

  const cardNumbers = collection?.map((c) => c.card_number) ?? [];
  const { data: cards } = useQuery<Card[]>({
    queryKey: ["dashboard-cards", cardNumbers],
    queryFn: async () => {
      if (cardNumbers.length === 0) return [];
      const { data, error } = await supabase.from("cards").select("*").in("card_number", cardNumbers);
      if (error) throw error;
      return data as Card[];
    },
    enabled: cardNumbers.length > 0,
  });

  const sellableCards =
    cards && collection && allDeckCards && prices
      ? buildSellableCards(cards, collection, allDeckCards, prices, sellList ?? [], priceHistory ?? [])
      : [];

  const spikedCards =
    cards && collection && prices && priceHistory
      ? findSpikedCards(cards, collection, prices, priceHistory, sellList ?? [])
      : [];

  const top5 = sellableCards.slice(0, 5);

  if (top5.length === 0) {
    return (
      <div className="rounded-xl bg-[var(--surface)] p-5">
        <h2 className="text-sm font-semibold">Worth Selling</h2>
        <div className="mt-4 flex flex-col items-center py-4">
          <TrendingUp size={28} className="text-[var(--border)]" />
          <p className="mt-2 text-xs text-[var(--text-muted)]">No surplus cards to sell.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Worth Selling</h2>
        <Link href="/sell" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
          View all
        </Link>
      </div>

      {spikedCards.length > 0 && (
        <Link
          href="/sell?filter=spiked"
          className="mt-2 flex items-center gap-1.5 rounded-lg bg-[var(--yellow-translucent)] border border-[var(--yellow-border)] px-3 py-2 text-xs font-medium text-[var(--yellow)] transition-colors hover:bg-[var(--yellow-translucent)]"
        >
          <Zap size={12} />
          {spikedCards.length} card{spikedCards.length !== 1 ? "s" : ""} spiked this week
        </Link>
      )}

      <div className="mt-3 space-y-2">
        {top5.map((item) => (
          <Link
            key={item.card.card_number}
            href="/sell"
            className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[var(--elevated)]"
          >
            <div className="relative h-10 w-7 flex-shrink-0 overflow-hidden rounded border border-[var(--border)]">
              <CardImage cardNumber={item.card.card_number} alt={item.card.name} imageUrl={item.card.image_url} fill sizes="28px" className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{item.card.name}</p>
              <div className="flex items-center gap-1.5">
                <p className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                  <PackageMinus size={10} />
                  x{item.surplus} surplus
                </p>
                {item.spike_pct !== null && (
                  <span className="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-bold text-[var(--green)] bg-[var(--green-translucent)]">
                    ↑ {Math.round(item.spike_pct * 100)}%
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="flex items-center gap-1 text-sm font-bold text-[var(--yellow)]">
                <Coins size={12} />
                {formatPrice(item.total_value)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Support `?filter=spiked` query param in sell page**

In `app/sell/page.tsx`, add `useSearchParams` to read the initial filter from the URL. Add this import:

```typescript
import { useSearchParams } from "next/navigation";
```

Then update the filter state initialization. Replace:

```typescript
const [filter, setFilter] = useState<SellFilter>("all");
```

With:

```typescript
const searchParams = useSearchParams();
const initialFilter = (searchParams.get("filter") as SellFilter) || "all";
const [filter, setFilter] = useState<SellFilter>(initialFilter);
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/worth-selling.tsx app/sell/page.tsx
git commit -m "feat: add spike banner and badges to dashboard worth-selling widget"
```

---

### Task 9: Final Integration and Polish

**Files:**
- Modify: `components/cards/card-panel.tsx` (add spike indicator to price)

- [ ] **Step 1: Add spike indicator to card panel price display**

In `components/cards/card-panel.tsx`, add the price history import at the top:

```typescript
import { usePriceHistory } from "@/lib/hooks/use-price-history";
import { computeSpikePct } from "@/lib/sell-utils";
```

Inside the component, after the existing `useCardPrice` hook call:

```typescript
const { data: price } = useCardPrice(card?.card_number ?? null);
```

Add:

```typescript
const { data: priceHistory } = usePriceHistory(7);
const spikePct = (() => {
  if (!card || !price?.price_trend || !priceHistory) return null;
  const base = card.base_card_number;
  const history = priceHistory.filter((h) => h.card_number === base);
  return computeSpikePct(price.price_trend, history);
})();
```

Then update the price display section. Find:

```typescript
          <div className="flex items-baseline gap-3">
            <span className="flex items-center gap-1.5 text-lg font-bold text-[var(--green)]">
              <Coins size={16} />
              {formatPrice(price?.price_trend ?? null)}
            </span>
            {price?.price_low !== null && price?.price_low !== undefined && (
              <span className="text-xs text-[var(--text-muted)]">Low: {formatPrice(price.price_low)}</span>
            )}
          </div>
```

Replace with:

```typescript
          <div className="flex items-baseline gap-3">
            <span className="flex items-center gap-1.5 text-lg font-bold text-[var(--green)]">
              <Coins size={16} />
              {formatPrice(price?.price_trend ?? null)}
            </span>
            {spikePct !== null && (
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-bold text-[var(--green)] bg-[var(--green-translucent)]">
                ↑ {Math.round(spikePct * 100)}%
              </span>
            )}
            {price?.price_low !== null && price?.price_low !== undefined && (
              <span className="text-xs text-[var(--text-muted)]">Low: {formatPrice(price.price_low)}</span>
            )}
          </div>
```

- [ ] **Step 2: Run full build and lint**

```bash
npm run build && npm run lint
```

Expected: Both pass with no errors.

- [ ] **Step 3: Commit**

```bash
git add components/cards/card-panel.tsx
git commit -m "feat: add spike indicator to card panel price display"
```

- [ ] **Step 4: Manual smoke test**

Start the dev server:
```bash
npm run dev
```

Verify:
1. Sell advisor page loads, shows summary + filter chips
2. If price data exists, cards appear in the list with correct badges
3. Filter chips work (switching between All/Surplus/Sell List/Spiked)
4. Card panel opens when clicking a card, shows "Market Price" label
5. Sell list toggle appears in card panel and works (add/remove)
6. Dashboard "Worth Selling" widget shows data
7. If no price data yet, run `python scripts/sync_prices.py` first to populate

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: polish sell advisor after smoke test"
```

---

## Task Dependency Summary

```
Task 1 (Migration) → Task 2 (Sync Script) — can run in parallel
                   → Task 3 (Types + Sell Utils) → Task 4 (Hooks) → Task 5 (Sell Toggle)
                                                                   → Task 6 (UI Components) → Task 7 (Sell Page)
                                                                                             → Task 8 (Dashboard)
                                                                                             → Task 9 (Final Polish)
```

Tasks 1 and 2 are independent of each other.
Tasks 1 and 3 are independent of each other.
Tasks 5 and 6 are independent of each other (both depend on 4).
Tasks 7 and 8 can be done in either order (both depend on 6).
Task 9 depends on everything else being done.
