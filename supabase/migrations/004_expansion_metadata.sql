-- ============================================
-- Expansion metadata table
-- ============================================
-- Stores set cover image IDs scraped from digimoncard.io.
-- Used by the frontend to display set images.

create table public.expansion_metadata (
  expansion text primary key,
  set_id integer,                     -- digimoncard.io internal set ID
  set_image_url text,                 -- full URL to set cover image
  created_at timestamptz not null default now()
);

alter table public.expansion_metadata enable row level security;

create policy "Expansion metadata is publicly readable"
  on public.expansion_metadata for select
  using (true);
