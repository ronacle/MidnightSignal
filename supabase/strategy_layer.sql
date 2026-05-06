create table if not exists user_strategies (
  user_id uuid primary key references auth.users(id) on delete cascade,
  strategy text check (strategy in ('momentum', 'breakout', 'conservative', 'aggressive')) not null default 'momentum',
  updated_at timestamp with time zone default now()
);

create table if not exists strategy_performance_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  strategy text check (strategy in ('momentum', 'breakout', 'conservative', 'aggressive')) not null,
  signal_id text,
  symbol text,
  fit_score integer,
  action text check (action in ('viewed', 'acted', 'waited', 'avoided', 'selected')) not null default 'viewed',
  created_at timestamp with time zone default now()
);

create index if not exists idx_strategy_performance_events_user_strategy
on strategy_performance_events(user_id, strategy, created_at desc);

alter table user_strategies enable row level security;
alter table strategy_performance_events enable row level security;

create policy "Users manage their strategy"
on user_strategies
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage their strategy events"
on strategy_performance_events
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
