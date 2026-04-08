# Handoff

Current state of work for session continuity. Updated at the end of each session.

## Last Session Summary

Three features implemented:

1. **Improved variant matching coverage**: Added `--diagnose` flag to `sync_prices.py`, relaxed the Regular fallback to match cards from promo/pre-release CT expansions, stripped whitespace suffixes, and added `pr` suffix keyword. Match count improved from ~5,875 to 5,897. Only 61 CT entries remain unmatched, of which 53 are cards not in our database (ST12, ST13 starter decks, misc promos) and 8 are niche variant mismatches.

2. **Sell list CSV export**: Added `lib/export-csv.ts` with `generateSellCsv()` and `downloadCsv()`. Export button on the sell page exports the currently filtered cards with hardcoded English + Near Mint. Includes UTF-8 BOM for Excel compatibility.

3. **Price history sparkline**: Added Recharts dependency and `components/cards/price-sparkline.tsx` — a 60px sparkline showing 30-day `price_trend` history in the card panel's Market Price section. Green line, tooltip on hover, no axes. Card panel now fetches both 7-day (for spike detection) and 30-day (for sparkline) history via separate TanStack Query cache entries.

Also fixed: wrapped sell page `useSearchParams()` in Suspense boundary (pre-existing `next build` failure).

## In Progress

Nothing actively in progress.

## Next Steps

- **Run a full price sync** (`python scripts/sync_prices.py`) to push the improved matching live.
- **Alt art rework**: Treat alt art cards as separate DB entities with independent pricing/collection tracking. This is the next major architectural change.
- **Duplicate type interfaces**: `PriceHistoryEntry` and `SellListEntry` are defined twice in `lib/types.ts` (lines 50+88, 58+82). Should be deduplicated.
- **Remaining 8 unmatched `base_in_db=yes` cards**: AD1-024 (sec), BT9-111 (P1), P-207/208/209/210 (b), EX4-065 (P1), P-084 (a). These are niche variants where our DB variant_name doesn't match CT's suffix keywords. Low priority.

## Open Questions

- The outlier threshold (50% of median) may need tuning — monitor and adjust `OUTLIER_THRESHOLD` in `sell-utils.ts`.
- Sparkline will only be useful once price history accumulates over several days. Currently shows nothing for new cards.
