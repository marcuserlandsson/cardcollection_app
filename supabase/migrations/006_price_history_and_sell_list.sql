-- ============================================
-- Card price history table (30-day rolling)
-- ============================================
create table public.card_price_history (
  card_number text not null references public.cards(card_number) on delete cascade,
  recorded_at date not null default current_date,
  price_avg numeric,
  price_low numeric,
  price_trend numeric,
  primary key (card_number, recorded_at)
);

alter table public.card_price_history enable row level security;

create policy "Card price history is publicly readable"
  on public.card_price_history for select
  using (true);

create index idx_card_price_history_lookup on public.card_price_history (card_number, recorded_at desc);

-- ============================================
-- Sell list table (user's manual sell flags)
-- ============================================
create table public.sell_list (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_number text not null references public.cards(card_number) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (user_id, card_number)
);

alter table public.sell_list enable row level security;

create policy "Users can view their own sell list"
  on public.sell_list for select
  using (auth.uid() = user_id);

create policy "Users can insert into their own sell list"
  on public.sell_list for insert
  with check (auth.uid() = user_id);

create policy "Users can delete from their own sell list"
  on public.sell_list for delete
  using (auth.uid() = user_id);
