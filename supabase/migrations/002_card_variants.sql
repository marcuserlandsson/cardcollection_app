-- ============================================
-- Card variants table (alt arts, reprints, promos)
-- ============================================
-- Each row represents a distinct printable variant of a card
-- (e.g. regular, alternate art, reprint in a different set).
-- The base card data lives in `cards`; variants add pricing
-- and alt-art image info.

create table public.card_variants (
  id uuid primary key default gen_random_uuid(),
  card_number text references public.cards(card_number) on delete cascade not null,
  variant_name text not null,          -- e.g. "Alternate Art", "Resurgence Booster Reprint"
  tcgplayer_id integer,                -- unique TCGplayer product ID
  alt_art_url text,                    -- alt art image URL (null for regular printing)
  created_at timestamptz not null default now(),
  unique (card_number, tcgplayer_id)
);

alter table public.card_variants enable row level security;

create policy "Card variants are publicly readable"
  on public.card_variants for select
  using (true);

create index idx_card_variants_card_number on public.card_variants (card_number);
create index idx_card_variants_tcgplayer_id on public.card_variants (tcgplayer_id);
