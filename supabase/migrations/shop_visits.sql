-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Creates the shop_visits table for real-time visit tracking

create table if not exists public.shop_visits (
  id          uuid         default gen_random_uuid() primary key,
  shop_id     uuid         not null references public.shops(id) on delete cascade,
  visited_at  timestamptz  default now() not null,
  session_id  text         not null
);

-- Fast count queries
create index if not exists shop_visits_shop_id_idx       on public.shop_visits(shop_id);
create index if not exists shop_visits_visited_at_idx    on public.shop_visits(visited_at);
create index if not exists shop_visits_shop_session_idx  on public.shop_visits(shop_id, session_id);

-- Enable Row Level Security
alter table public.shop_visits enable row level security;

-- Anyone (including anonymous visitors) can insert a visit
create policy "Anyone can record a visit"
  on public.shop_visits for insert
  with check (true);

-- Only the shop owner can read their own visit stats
create policy "Shop owner can read own visits"
  on public.shop_visits for select
  using (
    shop_id in (
      select id from public.shops where email = auth.email()
    )
  );

-- Enable realtime for live dashboard updates
-- (Supabase Dashboard → Database → Replication → shop_visits toggle ON)
-- Or run:
alter publication supabase_realtime add table public.shop_visits;
