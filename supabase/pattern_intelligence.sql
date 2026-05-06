-- Midnight Signal v16.2 Pattern Intelligence
create table if not exists user_signal_patterns (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  pattern_key text not null,
  direction text check (direction in ('strength', 'weakness', 'opportunity')) not null,
  symbol text,
  signal_type text,
  confidence int default 50,
  description text,
  action text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, pattern_key)
);

create table if not exists pattern_insight_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  pattern_id uuid references user_signal_patterns(id) on delete cascade,
  event_type text check (event_type in ('pattern_viewed', 'pattern_applied', 'pattern_dismissed', 'pattern_boosted', 'pattern_suppressed')) not null,
  symbol text,
  signal_type text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

create index if not exists idx_user_signal_patterns_user_direction on user_signal_patterns(user_id, direction, updated_at desc);
create index if not exists idx_pattern_insight_events_user_created on pattern_insight_events(user_id, created_at desc);

alter table user_signal_patterns enable row level security;
alter table pattern_insight_events enable row level security;

create policy "Users can view their own signal patterns"
on user_signal_patterns for select using (auth.uid() = user_id);

create policy "Users can manage their own signal patterns"
on user_signal_patterns for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can view their own pattern events"
on pattern_insight_events for select using (auth.uid() = user_id);

create policy "Users can insert their own pattern events"
on pattern_insight_events for insert with check (auth.uid() = user_id);
