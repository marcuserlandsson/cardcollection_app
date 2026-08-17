-- ============================================
-- Multi-game support
-- ============================================
-- Adds a game dimension to the shared cards table rather than splitting
-- cards per game: collection, deck_cards, wishlist, sell_list and the price
-- tables all key off cards.card_number and inherit the game transitively.
--
-- See docs/superpowers/specs/2026-08-17-multi-game-support-design.md

create table public.games (
  id text primary key,
  name text not null,
  short_name text not null,
  sort_order integer not null default 0
);

alter table public.games enable row level security;

create policy "Games are publicly readable"
  on public.games for select
  using (true);

insert into public.games (id, name, short_name, sort_order) values
  ('digimon',   'Digimon Card Game',           'Digimon',   1),
  ('cyberpunk', 'Cyberpunk Trading Card Game', 'Cyberpunk', 2);

-- The 'digimon' default is what makes this a one-shot migration: every
-- existing card, deck and expansion row backfills correctly with no script.
alter table public.cards
  add column game text not null default 'digimon' references public.games(id),
  add column attributes jsonb not null default '{}'::jsonb;

alter table public.decks
  add column game text not null default 'digimon' references public.games(id);

alter table public.expansion_metadata
  add column game text not null default 'digimon' references public.games(id);

-- Backfill Digimon stats into attributes. Nulls are stripped rather than
-- stored as JSON nulls, so `attributes ? 'dp'` means "this card has a DP".
-- The legacy columns stay until migration 011 confirms parity.
update public.cards
set attributes = jsonb_strip_nulls(jsonb_build_object(
  'level',          level,
  'play_cost',      play_cost,
  'dp',             dp,
  'evolution_cost', evolution_cost
));

create index idx_cards_game on public.cards (game);
create index idx_decks_game on public.decks (game);

-- A deck's cards must belong to the deck's game. An app-level check can be
-- bypassed by a direct API call, so the constraint lives here. security
-- definer with a pinned search_path so RLS visibility cannot defeat it.
create or replace function public.enforce_deck_card_game()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select d.game from public.decks d where d.id = new.deck_id)
     is distinct from
     (select c.game from public.cards c where c.card_number = new.card_number)
  then
    raise exception 'card % does not belong to the deck''s game', new.card_number;
  end if;
  return new;
end
$$;

create trigger trg_deck_cards_game
  before insert or update on public.deck_cards
  for each row execute function public.enforce_deck_card_game();
