-- Midnight Signal v13.9 - Personalized Watchlists schema
-- Stores per-user symbol watchlists plus per-symbol alert preferences.

create table if not exists public.watchlist_symbols (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  position integer not null default 0,
  high_confidence_alerts boolean not null default true,
  settlement_alerts boolean not null default true,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, symbol)
);

create index if not exists watchlist_symbols_user_position_idx on public.watchlist_symbols(user_id, position asc);
create index if not exists watchlist_symbols_symbol_idx on public.watchlist_symbols(symbol);

alter table public.watchlist_symbols enable row level security;

create policy "Users can read own watchlist"
  on public.watchlist_symbols for select
  using (auth.uid() = user_id);

create policy "Users can manage own watchlist"
  on public.watchlist_symbols for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
