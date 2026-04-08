# Variant Matching, Sell Export & Price Charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve price sync coverage from ~64% to >85%, add CSV export from the sell advisor, and add a 30-day price sparkline to the card panel.

**Architecture:** Three independent features that share no code between them. Feature 1 is Python-only (sync script changes). Feature 2 is pure client-side TypeScript (CSV generation + button). Feature 3 adds Recharts dependency and a new React component in the card panel.

**Tech Stack:** Python 3 (sync script), TypeScript, Next.js, React, Recharts, Tailwind CSS, Lucide React

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `scripts/sync_prices.py` | Add `--diagnose` flag, relax fallback, expand keyword mappings |
| Create | `lib/export-csv.ts` | CSV generation utility for sell export |
| Modify | `app/sell/page.tsx` | Add export button to sell page header |
| Create | `components/cards/price-sparkline.tsx` | Recharts sparkline component |
| Modify | `components/cards/card-panel.tsx` | Integrate sparkline into Market Price section |
| Modify | `package.json` | Add `recharts` dependency |

---

## Task 1: Add `--diagnose` flag to sync_prices.py

**Files:**
- Modify: `scripts/sync_prices.py:303-466`

- [ ] **Step 1: Add argparse and diagnose flag**

At the top of `sync_prices.py`, add the import and parse args in `sync_prices()`:

```python
# Add to imports at top of file (after line 6)
import argparse
```

Replace the `sync_prices()` function signature and first few lines (lines 303-309):

```python
def sync_prices(diagnose: bool = False):
    if not CARDTRADER_ACCESS_TOKEN:
        print("ERROR: CARDTRADER_ACCESS_TOKEN is not set.")
        sys.exit(1)

    print("Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
```

Replace the `__main__` block (lines 469-470):

```python
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sync card prices from Cardtrader")
    parser.add_argument("--diagnose", action="store_true",
                        help="Print unmatched CT entries instead of upserting prices")
    args = parser.parse_args()
    sync_prices(diagnose=args.diagnose)
```

- [ ] **Step 2: Collect unmatched entries and add diagnostic output**

After the matching call on line 416, add diagnostic collection and reporting. Replace everything from line 416 to end of function:

```python
    # Step 4: Match CT entries to our card_number variants
    print(f"\nMatching {len(ct_entries)} CT prices to card variants...")
    all_prices = match_ct_to_variants(ct_entries, variants_by_base, variant_names_by_card)

    if diagnose:
        # Collect unmatched entries grouped by expansion
        matched_bases = set()
        for card_number in all_prices:
            # Extract base from card_number (strip -V2 etc.)
            base = re.sub(r"-V\d+$", "", card_number)
            matched_bases.add(base)

        from collections import defaultdict
        unmatched_by_exp: dict[str, list[tuple[str, str, bool]]] = defaultdict(list)
        total_ct = 0
        for base, suffix, exp_name, price_data in ct_entries:
            total_ct += 1
            if base not in matched_bases:
                in_db = base in known_base_numbers
                unmatched_by_exp[exp_name].append((f"{base}{suffix}", suffix, in_db))

        total_unmatched = sum(len(v) for v in unmatched_by_exp.values())
        print(f"\n=== Unmatched CT Entries ===\n")
        for exp_name in sorted(unmatched_by_exp.keys()):
            entries = unmatched_by_exp[exp_name]
            print(f'Expansion: "{exp_name}"')
            for collector_num, suffix, in_db in sorted(entries):
                db_str = "yes" if in_db else "no"
                print(f'  {collector_num:<16} suffix="{suffix}"    base_in_db={db_str}')
            print()

        print(f"Summary: {total_unmatched} unmatched / {total_ct} total CT entries")
        print(f"Matched: {len(all_prices)} card prices assigned")
        return

    # Step 5: Upsert current prices into card_prices
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

    # Step 6: Insert daily snapshot into card_price_history
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

    # Step 7: Prune history older than 30 days
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
```

- [ ] **Step 3: Commit**

```bash
git add scripts/sync_prices.py
git commit -m "feat: add --diagnose flag to sync_prices.py for unmatched entry reporting"
```

---

## Task 2: Relax the Regular fallback in match_ct_to_variants

**Files:**
- Modify: `scripts/sync_prices.py:240-300`

- [ ] **Step 1: Update the fallback logic**

Replace the fallback block at the end of `match_ct_to_variants()` (the comment starting "For unassigned CT entries..." through `break`). The current code (lines 291-298) only assigns unassigned no-suffix entries to Regular if Regular hasn't been assigned. The new logic adds a broader second pass: for any base that got zero matches from the scoring pass, assign the first unassigned no-suffix entry to Regular regardless of expansion name.

Replace lines 291-300 with:

```python
        # Fallback 1: Unassigned CT entries with no suffix → Regular if unpriced
        regular_cn = our_variants[0] if our_variants else None
        if regular_cn and regular_cn not in all_prices:
            for i, (suffix, exp_name, price_data) in enumerate(ct_list):
                if i not in assigned and not suffix:
                    all_prices[regular_cn] = price_data
                    assigned.add(i)
                    break

    # Second pass: for bases that got zero matches from scoring, assign
    # the first no-suffix CT entry to Regular regardless of expansion name.
    # This catches cards from "Pre-Release" or "Promo" expansions that are
    # really just the same Regular card.
    for base, ct_list in ct_by_base.items():
        our_variants = variants_by_base.get(base, [])
        if not our_variants:
            continue
        regular_cn = our_variants[0]
        if regular_cn in all_prices:
            continue  # already has a price from first pass

        for _i, (suffix, exp_name, price_data) in enumerate(ct_list):
            if not suffix:
                all_prices[regular_cn] = price_data
                break

    return all_prices
```

- [ ] **Step 2: Commit**

```bash
git add scripts/sync_prices.py
git commit -m "feat: relax Regular fallback to match cards from promo/pre-release expansions"
```

---

## Task 3: Run diagnostic and expand keyword mappings

This task requires running the sync script against the live Cardtrader API. The implementer should:

**Files:**
- Modify: `scripts/sync_prices.py:164-205`

- [ ] **Step 1: Run diagnostic**

```bash
cd scripts
python sync_prices.py --diagnose 2>&1 | tee diagnose_output.txt
```

Review the output to identify which expansions and suffixes are causing the most unmatched entries where `base_in_db=yes`.

- [ ] **Step 2: Add missing suffix and expansion keywords**

Based on diagnostic output, add missing entries to `SUFFIX_KEYWORDS` and `EXPANSION_KEYWORDS` in `scripts/sync_prices.py` (lines 165-205). Common patterns to look for:

- New suffix letters not in `SUFFIX_KEYWORDS` (e.g., `"t"` for textured)
- CT expansion names that contain keywords not yet mapped (e.g., "Tamer Party", "Regional", etc.)

Example additions (actual additions depend on diagnostic output):

```python
# In SUFFIX_KEYWORDS, add any new suffixes found:
SUFFIX_KEYWORDS: dict[str, list[str]] = {
    "a": ["alternate art", "alt art"],
    "s": ["sp", "special rare"],
    "sec": ["secret"],
    "g": ["gold"],
    "b": ["black & white", "black and white"],
    "P1": ["pre-release", "promo"],
    "p": ["participant"],
    "c": ["champion"],
    "f": ["finalist"],
    # Add new suffixes from diagnostic output here
}
```

```python
# In EXPANSION_KEYWORDS, add any new expansion patterns found:
# Add entries like:
#   ("tamer party", ["tamer party"]),
#   ("regional", ["regional"]),
# based on what the diagnostic output shows
```

- [ ] **Step 3: Re-run diagnostic to verify improvement**

```bash
python sync_prices.py --diagnose 2>&1 | tail -5
```

Compare the new "Summary: X unmatched / Y total" line to the previous run. Target: >85% match rate (under ~1,400 unmatched).

- [ ] **Step 4: Clean up and commit**

```bash
rm -f diagnose_output.txt
git add scripts/sync_prices.py
git commit -m "feat: expand keyword mappings to improve price match coverage"
```

---

## Task 4: Create CSV export utility

**Files:**
- Create: `lib/export-csv.ts`

- [ ] **Step 1: Create the export utility**

Create `lib/export-csv.ts`:

```typescript
import type { SellableCard } from "./types";
import { formatPrice } from "./utils";

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function generateSellCsv(items: SellableCard[]): string {
  const headers = [
    "Card Number",
    "Name",
    "Expansion",
    "Variant",
    "Rarity",
    "Quantity",
    "Price (EUR)",
    "Total Value (EUR)",
    "Condition",
    "Language",
  ];

  const rows = items.map((item) => {
    const qty = item.surplus > 0 ? item.surplus : item.owned;
    const unitPrice = item.price?.price_low ?? item.price?.price_trend ?? null;
    const totalValue = item.total_value;

    return [
      item.card.card_number,
      escapeCsvField(item.card.name),
      item.card.expansion,
      item.card.variant_name,
      item.card.rarity ?? "",
      String(qty),
      unitPrice !== null ? unitPrice.toFixed(2) : "",
      totalValue !== null ? totalValue.toFixed(2) : "",
      "Near Mint",
      "English",
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/export-csv.ts
git commit -m "feat: add CSV export utility for sell list"
```

---

## Task 5: Add export button to sell page

**Files:**
- Modify: `app/sell/page.tsx:1-192`

- [ ] **Step 1: Add imports**

Add to the imports at the top of `app/sell/page.tsx`:

```typescript
// Add to the lucide-react import (line 21):
import { TrendingUp, Clock, LogIn, Download } from "lucide-react";

// Add new import after the existing imports (after line 23):
import { generateSellCsv, downloadCsv } from "@/lib/export-csv";
```

- [ ] **Step 2: Add export handler**

Add the export callback inside `SellPage()`, after the `handleCardClick` callback (after line 132):

```typescript
  const handleExport = useCallback(() => {
    if (filteredCards.length === 0) return;
    const csv = generateSellCsv(filteredCards);
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(csv, `cardboard-sell-export-${date}.csv`);
  }, [filteredCards]);
```

- [ ] **Step 3: Add export button to the page layout**

Replace the summary section (lines 151-153) to include the export button alongside it:

```tsx
      {sellableCards.length > 0 && (
        <div className="flex items-start justify-between">
          <SellSummary surplusCount={totalSurplus} totalValue={totalValue > 0 ? totalValue : null} />
          <button
            onClick={handleExport}
            disabled={filteredCards.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--elevated)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>
      )}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add app/sell/page.tsx
git commit -m "feat: add CSV export button to sell advisor page"
```

---

## Task 6: Install Recharts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install recharts**

```bash
npm install recharts
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add recharts dependency for price sparkline"
```

---

## Task 7: Create price sparkline component

**Files:**
- Create: `components/cards/price-sparkline.tsx`

- [ ] **Step 1: Create the sparkline component**

Create `components/cards/price-sparkline.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatPrice } from "@/lib/utils";
import type { PriceHistoryEntry } from "@/lib/types";

interface PriceSparklineProps {
  history: PriceHistoryEntry[];
}

function SparklineTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { date: string; price: number } }> }) {
  if (!active || !payload?.[0]) return null;
  const { date, price } = payload[0].payload;
  return (
    <div className="rounded-md bg-[var(--elevated)] border border-[var(--border)] px-2 py-1 text-xs shadow-lg">
      <div className="text-[var(--text-muted)]">{date}</div>
      <div className="font-medium text-[var(--green)]">{formatPrice(price)}</div>
    </div>
  );
}

export default function PriceSparkline({ history }: PriceSparklineProps) {
  const data = useMemo(() => {
    return history
      .filter((h) => h.price_trend !== null)
      .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
      .map((h) => ({
        date: new Date(h.recorded_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        }),
        price: h.price_trend!,
      }));
  }, [history]);

  if (data.length < 2) return null;

  return (
    <div className="mt-2 h-[60px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Tooltip
            content={<SparklineTooltip />}
            cursor={false}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="var(--green)"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: "var(--green)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/cards/price-sparkline.tsx
git commit -m "feat: add price sparkline component using Recharts"
```

---

## Task 8: Integrate sparkline into card panel

**Files:**
- Modify: `components/cards/card-panel.tsx:1-204`

- [ ] **Step 1: Add imports and fetch 30-day history**

Add the sparkline import to the top of `card-panel.tsx`:

```typescript
// Add after the existing imports (after line 16):
import PriceSparkline from "@/components/cards/price-sparkline";
```

Add a 30-day history query. Replace the existing `usePriceHistory(7)` call on line 30 with two separate calls:

```typescript
  const { data: priceHistory7d } = usePriceHistory(7);
  const { data: priceHistory30d } = usePriceHistory(30);
```

Update the spike calculation to use the 7-day history (replace `priceHistory` with `priceHistory7d` in the spike computation block, lines 31-36):

```typescript
  const spikePct = (() => {
    if (!card || !price?.price_trend || !priceHistory7d) return null;
    const base = card.base_card_number;
    const history = priceHistory7d.filter((h) => h.card_number === base);
    return computeSpikePct(price, history);
  })();
```

Add the filtered 30-day history for the sparkline:

```typescript
  const cardHistory30d = useMemo(() => {
    if (!card || !priceHistory30d) return [];
    const base = card.base_card_number;
    return priceHistory30d.filter((h) => h.card_number === base);
  }, [card, priceHistory30d]);
```

Note: Also add `useMemo` to the React import on line 3:

```typescript
import { useEffect, useMemo, useRef, useState } from "react";
```

- [ ] **Step 2: Add sparkline to the Market Price section**

In the Market Price section (around line 199), add the sparkline after the trend price text. Insert before the closing `</div>` of the Market Price container:

```tsx
          {price?.price_trend !== null && price?.price_trend !== undefined && (
            <p className="mt-1 text-xs text-[var(--text-muted)]">Trend: {formatPrice(price.price_trend)}</p>
          )}
          <PriceSparkline history={cardHistory30d} />
        </div>
```

This replaces the existing trend line + closing div (lines 196-199).

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add components/cards/card-panel.tsx
git commit -m "feat: integrate 30-day price sparkline into card panel"
```
