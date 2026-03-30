-- ============================================
-- Card expansions join table (many-to-many)
-- ============================================
-- A card can appear in multiple expansions (reprints, promos).
-- The `cards.expansion` column remains as the "home" set (matching
-- the card number prefix). This table tracks all sets a card belongs to.

create table public.card_expansions (
  card_number text references public.cards(card_number) on delete cascade not null,
  expansion text not null,
  primary key (card_number, expansion)
);

alter table public.card_expansions enable row level security;

create policy "Card expansions are publicly readable"
  on public.card_expansions for select
  using (true);

create index idx_card_expansions_expansion on public.card_expansions (expansion);
