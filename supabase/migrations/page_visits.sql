-- Run this in your Supabase SQL Editor
-- Tracks visits to shopgram.in homepage and /explore page

create table if not exists public.page_visits (
  id          uuid         default gen_random_uuid() primary key,
  page        text         not null,  -- 'home' | 'explore'
  session_id  text         not null,
  visited_at  timestamptz  default now() not null
);

create index if not exists page_visits_page_idx         on public.page_visits(page);
create index if not exists page_visits_visited_at_idx   on public.page_visits(visited_at);
create index if not exists page_visits_page_session_idx on public.page_visits(page, session_id);

alter table public.page_visits enable row level security;

-- Anyone (anon visitors) can insert
create policy "Anyone can record a page visit"
  on public.page_visits for insert
  with check (true);

-- Readable by all (aggregate stats, not sensitive)
create policy "Anyone can read page visits"
  on public.page_visits for select
  using (true);

-- Enable realtime
alter publication supabase_realtime add table public.page_visits;
