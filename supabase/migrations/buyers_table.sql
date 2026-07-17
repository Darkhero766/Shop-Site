-- buyers table: stores buyer profiles linked to Supabase Auth users
create table if not exists public.buyers (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  default_address text,
  default_city text,
  default_pincode text,
  default_state text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists buyers_updated_at on public.buyers;
create trigger buyers_updated_at
  before update on public.buyers
  for each row execute procedure public.set_updated_at();

-- Enable Row Level Security
alter table public.buyers enable row level security;

-- Buyers can read their own row
create policy "buyers_select_own"
  on public.buyers for select
  using (auth.uid() = id);

-- Buyers can insert their own row
create policy "buyers_insert_own"
  on public.buyers for insert
  with check (auth.uid() = id);

-- Buyers can update their own row
create policy "buyers_update_own"
  on public.buyers for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
