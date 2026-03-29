-- ============================================
-- Cards table (synced from Digimon Card API)
-- ============================================
create table public.cards (
  card_number text primary key,
  name text not null,
  expansion text not null,
  card_type text not null,
  color text not null,
  rarity text,
  dp integer,
  play_cost integer,
  level integer,
  evolution_cost integer,
  image_url text,
  max_copies integer not null default 4,
  last_updated timestamptz not null default now()
);

alter table public.cards enable row level security;

create policy "Cards are publicly readable"
  on public.cards for select
  using (true);

create index idx_cards_expansion on public.cards (expansion);
create index idx_cards_name on public.cards using gin (name gin_trgm_ops);
create index idx_cards_color on public.cards (color);
create index idx_cards_card_type on public.cards (card_type);

-- ============================================
-- Collection table (user's owned cards)
-- ============================================
create table public.collection (
  user_id uuid references auth.users(id) on delete cascade not null,
  card_number text references public.cards(card_number) on delete cascade not null,
  quantity integer not null default 1 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, card_number)
);

alter table public.collection enable row level security;

create policy "Users can view their own collection"
  on public.collection for select
  using (auth.uid() = user_id);

create policy "Users can insert into their own collection"
  on public.collection for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own collection"
  on public.collection for update
  using (auth.uid() = user_id);

create policy "Users can delete from their own collection"
  on public.collection for delete
  using (auth.uid() = user_id);

-- ============================================
-- Decks table
-- ============================================
create table public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.decks enable row level security;

create policy "Users can view their own decks"
  on public.decks for select
  using (auth.uid() = user_id);

create policy "Users can insert their own decks"
  on public.decks for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own decks"
  on public.decks for update
  using (auth.uid() = user_id);

create policy "Users can delete their own decks"
  on public.decks for delete
  using (auth.uid() = user_id);

-- ============================================
-- Deck cards table
-- ============================================
create table public.deck_cards (
  deck_id uuid references public.decks(id) on delete cascade not null,
  card_number text references public.cards(card_number) on delete cascade not null,
  quantity integer not null default 1 check (quantity >= 1),
  primary key (deck_id, card_number)
);

alter table public.deck_cards enable row level security;

create policy "Users can view their own deck cards"
  on public.deck_cards for select
  using (
    exists (
      select 1 from public.decks
      where decks.id = deck_cards.deck_id
      and decks.user_id = auth.uid()
    )
  );

create policy "Users can insert into their own deck cards"
  on public.deck_cards for insert
  with check (
    exists (
      select 1 from public.decks
      where decks.id = deck_cards.deck_id
      and decks.user_id = auth.uid()
    )
  );

create policy "Users can update their own deck cards"
  on public.deck_cards for update
  using (
    exists (
      select 1 from public.decks
      where decks.id = deck_cards.deck_id
      and decks.user_id = auth.uid()
    )
  );

create policy "Users can delete their own deck cards"
  on public.deck_cards for delete
  using (
    exists (
      select 1 from public.decks
      where decks.id = deck_cards.deck_id
      and decks.user_id = auth.uid()
    )
  );

-- ============================================
-- Card prices table
-- ============================================
create table public.card_prices (
  card_number text primary key references public.cards(card_number) on delete cascade,
  price_avg numeric,
  price_low numeric,
  price_trend numeric,
  fetched_at timestamptz not null default now()
);

alter table public.card_prices enable row level security;

create policy "Card prices are publicly readable"
  on public.card_prices for select
  using (true);
