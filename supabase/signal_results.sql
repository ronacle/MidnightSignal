-- Midnight Signal v13.5 - Signal Performance schema
-- Optional persistence layer for real signal result tracking.
-- The app currently ships with a deterministic simulated performance layer so the UI works without DB writes.

create table if not exists public.signal_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  symbol text not null,
  name text not null,
  label text not null check (label in ('Bullish', 'Neutral', 'Bearish')),
  direction text not null check (direction in ('long', 'short', 'watch')),
  trader_mode text not null check (trader_mode in ('scalp', 'swing', 'position')),
  confidence integer not null check (confidence between 0 and 100),
  entry_price numeric not null,
  exit_price numeric,
  return_pct numeric,
  outcome text check (outcome in ('win', 'loss', 'neutral')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists signal_results_user_closed_idx on public.signal_results(user_id, closed_at desc);
create index if not exists signal_results_symbol_closed_idx on public.signal_results(symbol, closed_at desc);
create index if not exists signal_results_mode_closed_idx on public.signal_results(trader_mode, closed_at desc);

alter table public.signal_results enable row level security;

create policy "Users can read own signal results"
  on public.signal_results for select
  using (auth.uid() = user_id);

create policy "Users can insert own signal results"
  on public.signal_results for insert
  with check (auth.uid() = user_id);

create policy "Users can update own signal results"
  on public.signal_results for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
