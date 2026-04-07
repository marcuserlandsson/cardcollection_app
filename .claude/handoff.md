# Handoff

Current state of work for session continuity. Updated at the end of each session.

## Last Session Summary

Implemented full Cardtrader price sync pipeline and enhanced sell advisor UI:

- **Price sync** (`scripts/sync_prices.py`): Rewrote to properly use Cardtrader API per-expansion. Fetches blueprints + marketplace products for all 110 Digimon expansions, aggregates into low/avg/median prices. Handles per-variant pricing via suffix matching (a=alt art, s=SP, etc.) and cross-expansion matching (pre-release, resurgence, championship expansions). Result: ~5,875 individually priced cards.
- **DB migration 006**: Added `card_price_history` (30-day rolling snapshots) and `sell_list` (manual sell flags with per-user RLS).
- **DB migration 007**: Dropped FK constraints on price tables so prices can be keyed by base_card_number even when no exact card_number row exists.
- **Sell advisor page** (`app/sell/page.tsx`): Rewritten with price spike carousel, filter chips (All/Surplus/Sell List/Spiked), unified card list with source badges and spike indicators.
- **Sell utilities** (`lib/sell-utils.ts`): Extracted from utils.ts with spike detection (≥30% over 7 days), sell list integration, findSpikedCards.
- **New hooks**: `use-sell-list.ts` (CRUD), `use-price-history.ts` (7-day history for spike detection).
- **New components**: `PriceSpikeCards`, `SellFilterChips`, `SellListToggle`, updated `SellCardRow`.
- **Card panel**: Renamed "Cardmarket Price" → "Market Price", added spike indicator, added sell list toggle (hidden for guests).
- **Dashboard widget**: Added spike banner linking to sell advisor, inline spike badges.
- **Next.js config**: Added `world.digimoncard.com` to allowed image hosts.

## In Progress

Nothing actively in progress.

## Next Steps

- **Improve variant matching coverage**: The sync matches ~5,875 of 9,244 cards. More CT expansion keyword mappings can be added to `EXPANSION_KEYWORDS` and `SUFFIX_KEYWORDS` in `sync_prices.py` as new patterns are discovered.
- **Push to origin / deploy**: All changes are on main but not yet pushed.
- **Test the sell advisor** with real collection data — verify spike detection works once price history accumulates (needs 7+ days of daily sync runs).
- **Consider**: Export sell list to CSV/Cardmarket format, price history charts in UI.

## Open Questions

- Some niche promo variants (regionals finalist, specific event promos) have no Cardtrader listings — these will always show "No listings".
- The Cardtrader API `collector_number` mapping to our V-number variants is heuristic-based. If mismatches are found, the keyword scoring in `_variant_score()` can be tuned.
