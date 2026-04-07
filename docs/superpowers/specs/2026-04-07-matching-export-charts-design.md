# Variant Matching, Sell Export & Price Charts Design

**Date:** 2026-04-07
**Scope:** Three incremental features building on the existing price sync and sell advisor infrastructure.

---

## Feature 1: Improved Variant Matching Coverage

### Problem

The price sync currently matches ~5,875 of ~9,244 cards (~64%). The gap comes from:
- CT entries scoring 0 due to missing suffix/expansion keyword mappings
- Overly strict Regular fallback that rejects entries from expansions containing "pre-release" or "promo"
- Unrecognized CT suffixes not in `SUFFIX_KEYWORDS`

### Solution

#### Diagnostic mode

Add a `--diagnose` flag to `sync_prices.py` that collects all CT entries that fail to match any variant after the scoring pass. Output is grouped by CT expansion name, showing collector number, suffix, and base card number. This provides a concrete list of gaps to address.

When `--diagnose` is active, the script skips the upsert/history steps and only prints the diagnostic report.

Diagnostic output format (stdout):
```
=== Unmatched CT Entries ===

Expansion: "Digimon Card Game - BT17 Pre-Release" (id=12345)
  BT17-001    suffix=""    base_in_db=yes
  BT17-003a   suffix="a"   base_in_db=yes

Expansion: "Digimon Card Game - Winner Pack 2024" (id=67890)
  P-100       suffix=""    base_in_db=no
  ...

Summary: 3,369 unmatched / 9,244 total CT entries
```

#### Relaxed fallback logic

After the scoring pass in `match_ct_to_variants()`, add a second pass: for any base card that received zero prices from the scoring pass, if there's exactly one unassigned CT entry with no suffix for that base, assign it to the Regular variant regardless of expansion name.

The current code skips this when the expansion contains "pre-release" or "promo", but many legitimate main-set cards appear in CT expansions with those words (e.g., "BT-17 Pre-Release" contains the same Regular cards as "BT-17").

#### Expanded keyword mappings

After running the diagnostic, add missing entries to `SUFFIX_KEYWORDS` and `EXPANSION_KEYWORDS` to cover the gaps surfaced. The diagnostic output drives which mappings to add — no guesswork.

### Files modified

- `scripts/sync_prices.py`

---

## Feature 2: Sell List CSV Export

### Problem

The sell advisor identifies surplus cards worth selling but provides no way to act on the information outside the app.

### Solution

#### Export button

An "Export CSV" button in the sell page header, next to the summary section. Uses the `Download` Lucide icon. Only visible when there are cards to export.

#### Export content

Exports the **currently filtered** cards (respects active filter chip). Columns:

| CSV Column | Source |
|---|---|
| Card Number | `card.card_number` |
| Name | `card.name` |
| Expansion | `card.expansion` |
| Variant | `card.variant_name` |
| Rarity | `card.rarity` |
| Quantity | `item.surplus` if > 0, else `item.owned` (for sell-list-only cards where surplus is 0) |
| Price (EUR) | `price_low` fallback `price_trend` |
| Total Value (EUR) | `item.total_value` |
| Condition | Hardcoded "Near Mint" |
| Language | Hardcoded "English" |

#### Implementation

Pure client-side CSV generation. Build CSV string from `filteredCards` array, create a Blob with `text/csv` MIME type, trigger download via temporary `<a>` element. File named `cardboard-sell-export-YYYY-MM-DD.csv`.

No new dependencies. No API route.

### Files modified

- `app/sell/page.tsx` (add export button)
- `lib/export-csv.ts` (new — CSV generation utility)

---

## Feature 3: Price History Sparkline

### Problem

Price history data is collected daily (30-day rolling window) but not visualized. Users can only see the current price and a spike badge.

### Solution

#### Library

Recharts — React-native SVG charts. Import only `LineChart`, `Line`, `Tooltip`, `ResponsiveContainer` to minimize bundle impact.

#### Data source

Extend the card panel to call `usePriceHistory(30)` and filter entries for the selected card's `base_card_number`. The sell page continues to use `usePriceHistory(7)` for spike detection — TanStack Query caches these separately by query key.

#### UI placement

Inside the "Market Price" section of `card-panel.tsx`, below the trend text. A small sparkline (~60px tall, full width of the price container).

#### Sparkline design

- **Line:** `var(--green)` color, no dots, smooth curve
- **Tooltip:** Small dark pill showing date and formatted price on hover
- **No axes, no grid** — minimal chrome
- **Empty state:** If fewer than 2 data points, don't render the chart
- **Data plotted:** `price_trend` (median) over time

### Files modified

- `package.json` (add `recharts` dependency)
- `components/cards/card-panel.tsx` (add sparkline below price)
- `components/cards/price-sparkline.tsx` (new — sparkline component)
