-- ============================================
-- Promote card variants into the cards table
-- ============================================
-- Each art version (regular, alt art, rare pull) becomes its own row
-- in the cards table with a synthetic card_number suffix.
-- See docs/superpowers/specs/2026-03-31-alt-art-variant-rework-design.md

-- Step 1: Add new columns to cards
alter table public.cards
  add column base_card_number text,
  add column variant_name text not null default 'Regular';

-- Step 2: Backfill base_card_number for existing cards
update public.cards
  set base_card_number = card_number;

-- Step 3: Make base_card_number not null after backfill
alter table public.cards
  alter column base_card_number set not null;

-- Step 4: Insert variant cards from card_variants (variant_index > 1)
-- Each becomes a new card row with suffixed card_number
insert into public.cards (
  card_number, name, expansion, card_type, color, rarity,
  dp, play_cost, level, evolution_cost, image_url, pretty_url,
  max_copies, base_card_number, variant_name
)
select
  cv.card_number || '-V' || cv.variant_index as card_number,
  c.name,
  c.expansion,
  c.card_type,
  c.color,
  c.rarity,
  c.dp,
  c.play_cost,
  c.level,
  c.evolution_cost,
  coalesce(cv.alt_art_url, c.image_url) as image_url,
  c.pretty_url,
  c.max_copies,
  cv.card_number as base_card_number,
  cv.variant_name
from public.card_variants cv
join public.cards c on c.card_number = cv.card_number
where cv.variant_index > 1;

-- Step 5: Copy card_expansions entries for new variant cards
insert into public.card_expansions (card_number, expansion)
select
  cv.card_number || '-V' || cv.variant_index as card_number,
  ce.expansion
from public.card_variants cv
join public.card_expansions ce on ce.card_number = cv.card_number
where cv.variant_index > 1
on conflict (card_number, expansion) do nothing;

-- Step 6: Add index on base_card_number for sibling queries
create index idx_cards_base_card_number on public.cards (base_card_number);

-- Step 7: Drop card_variants table (no longer needed)
drop table public.card_variants;
