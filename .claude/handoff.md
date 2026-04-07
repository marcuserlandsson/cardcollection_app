# Handoff

Current state of work for session continuity. Updated at the end of each session.

## Last Session Summary

Two fixes this session:

1. **sync_images.py HTTP/2 connection fix**: The GitHub Actions cron job was failing because Supabase's HTTP/2 connection gets terminated after ~10,000 requests (`last_stream_id:19999`). The script was making ~12,800 individual requests on a single connection. Added `new_supabase_client()` helper that recreates the client every 2,000 requests to stay under the limit.

2. **Switched pricing to use minimum listing (`price_low`)**: All price displays and value calculations now default to `price_low` instead of `price_trend` (median). This affects:
   - Card panel (primary price display)
   - Sell card rows (unit price)
   - Sell total value calculations
   - Collection value (collection-summary + dashboard-stats)
   - Added **outlier detection**: when `price_low < 50%` of `price_trend`, a yellow warning badge appears ("Outlier?") indicating the cheapest listing may be mispriced or damaged. Uses `isOutlierLow()` in `sell-utils.ts`.

## In Progress

Nothing actively in progress.

## Next Steps

- **Commit and push** the changes from this session (sync_images fix + price_low switch).
- **Improve variant matching coverage**: The sync matches ~5,875 of 9,244 cards. More CT expansion keyword mappings can be added.
- **Test the sell advisor** with real collection data — verify spike detection works once price history accumulates.
- **Consider**: Export sell list to CSV/Cardmarket format, price history charts in UI.

## Open Questions

- The outlier threshold (50% of median) may need tuning based on real data — some legitimate cheap listings could get flagged. Monitor and adjust `OUTLIER_THRESHOLD` in `sell-utils.ts` if needed.
- Some niche promo variants have no Cardtrader listings — these will always show "No listings".
- The sell page has a pre-existing Suspense boundary warning during `next build` (useSearchParams not wrapped). Not related to this session's changes.
