-- ============================================
-- Wishlist table (user's manual "want to acquire" list)
-- ============================================
create table public.wishlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_number text not null references public.cards(card_number) on delete cascade,
  quantity integer not null default 4 check (quantity >= 1),
  added_at timestamptz not null default now(),
  primary key (user_id, card_number)
);

alter table public.wishlist enable row level security;

create policy "Users can view their own wishlist"
  on public.wishlist for select
  using (auth.uid() = user_id);

create policy "Users can add to their own wishlist"
  on public.wishlist for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own wishlist"
  on public.wishlist for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can remove from their own wishlist"
  on public.wishlist for delete
  using (auth.uid() = user_id);
