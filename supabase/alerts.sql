-- Midnight Signal v13.8 - Alerts + Daily Recap schema
-- Stores per-user alert preferences and in-app alert events.

create table if not exists public.alert_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  high_confidence_alerts boolean not null default true,
  daily_recap boolean not null default true,
  settlement_alerts boolean not null default true,
  pro_only_alerts boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alert_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text not null check (type in ('high_confidence', 'settlement', 'daily_recap', 'pro_signal')),
  title text not null,
  body text not null,
  symbol text,
  signal_result_id uuid references public.signal_results(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  dedupe_key text unique,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists alert_events_user_created_idx on public.alert_events(user_id, created_at desc);
create index if not exists alert_events_type_created_idx on public.alert_events(type, created_at desc);

alter table public.alert_preferences enable row level security;
alter table public.alert_events enable row level security;

create policy "Users can read own alert preferences"
  on public.alert_preferences for select
  using (auth.uid() = user_id);

create policy "Users can update own alert preferences"
  on public.alert_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can read own alert events"
  on public.alert_events for select
  using (auth.uid() = user_id or user_id is null);
