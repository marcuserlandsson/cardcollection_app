-- ============================================
-- Public sell-list shares (Phase 2b)
-- One row per user; payload is a frozen snapshot of their sell list.
-- ============================================
create table public.sell_shares (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token text unique not null,
  title text,
  contact_note text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_sell_shares_token on public.sell_shares (token);

alter table public.sell_shares enable row level security;

create policy "Users can view their own share"
  on public.sell_shares for select
  using (auth.uid() = user_id);

create policy "Users can create their own share"
  on public.sell_shares for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own share"
  on public.sell_shares for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own share"
  on public.sell_shares for delete
  using (auth.uid() = user_id);

-- Public read by EXACT token only (no enumeration; no public select policy).
create or replace function public.get_sell_share(p_token text)
returns table (
  title text,
  contact_note text,
  payload jsonb,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select s.title, s.contact_note, s.payload, s.updated_at
  from public.sell_shares s
  where s.token = p_token;
$$;

grant execute on function public.get_sell_share(text) to anon, authenticated;
