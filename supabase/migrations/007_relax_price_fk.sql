-- ============================================
-- Relax card_prices FK constraint
-- ============================================
-- Prices are keyed by base_card_number (e.g. "BT1-010") but some
-- base card numbers don't exist as card_number rows in the cards
-- table (only variant suffixed rows like "BT1-010-V2" exist).
-- Drop the FK so the sync script can store prices for all base cards.
-- ============================================

alter table public.card_prices
  drop constraint if exists card_prices_card_number_fkey;

-- Also relax the FK on card_price_history for the same reason
alter table public.card_price_history
  drop constraint if exists card_price_history_card_number_fkey;
