create table if not exists public.signal_conversion_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  event_type text not null check (event_type in ('global_added_to_watchlist', 'global_tracked', 'global_upgrade_clicked')),
  symbol text not null,
  signal_id text not null,
  mode text default 'swing',
  confidence_gap numeric default 0,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists signal_conversion_events_user_created_idx
  on public.signal_conversion_events (user_id, created_at desc);

create index if not exists signal_conversion_events_symbol_created_idx
  on public.signal_conversion_events (symbol, created_at desc);

alter table public.signal_conversion_events enable row level security;

drop policy if exists "Users can read own conversion events" on public.signal_conversion_events;
create policy "Users can read own conversion events"
  on public.signal_conversion_events for select
  using (auth.uid() = user_id);
