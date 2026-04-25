-- Midnight Signal v16.1 Recommendation Quality + Explainability
-- Run after v15.9 notification SQL.

create extension if not exists "uuid-ossp";

create table if not exists user_intelligence_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  risk_style text check (risk_style in ('cautious', 'balanced', 'aggressive')) default 'balanced',
  preferred_assets text[] not null default '{}',
  preferred_signal_types text[] not null default '{}',
  updated_at timestamptz default now()
);

create table if not exists personalized_signal_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  event_type text check (event_type in ('recommendation_viewed', 'recommendation_clicked', 'recommendation_added_to_watchlist', 'recommendation_dismissed', 'recommendation_more_like_this', 'recommendation_less_like_this', 'recommendation_not_interested')) not null,
  symbol text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_user_intelligence_profiles_updated
on user_intelligence_profiles(updated_at desc);

create index if not exists idx_personalized_signal_events_user_created
on personalized_signal_events(user_id, created_at desc);

create index if not exists idx_personalized_signal_events_user_symbol
on personalized_signal_events(user_id, symbol, created_at desc);

alter table user_intelligence_profiles enable row level security;
alter table personalized_signal_events enable row level security;

drop policy if exists "Users can view their intelligence profile" on user_intelligence_profiles;
create policy "Users can view their intelligence profile"
on user_intelligence_profiles for select
using (auth.uid() = user_id);

drop policy if exists "Users can create their intelligence profile" on user_intelligence_profiles;
create policy "Users can create their intelligence profile"
on user_intelligence_profiles for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their intelligence profile" on user_intelligence_profiles;
create policy "Users can update their intelligence profile"
on user_intelligence_profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can view their personalization events" on personalized_signal_events;
create policy "Users can view their personalization events"
on personalized_signal_events for select
using (auth.uid() = user_id);

drop policy if exists "Users can create personalization events" on personalized_signal_events;
create policy "Users can create personalization events"
on personalized_signal_events for insert
with check (auth.uid() = user_id);


-- v16.1 explicit recommendation preference controls.
create table if not exists recommendation_feedback (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  symbol text not null,
  action text check (action in ('more', 'less', 'hide')) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_recommendation_feedback_user_created
on recommendation_feedback(user_id, created_at desc);

create index if not exists idx_recommendation_feedback_user_symbol
on recommendation_feedback(user_id, symbol, created_at desc);

alter table recommendation_feedback enable row level security;

drop policy if exists "Users can view their recommendation feedback" on recommendation_feedback;
create policy "Users can view their recommendation feedback"
on recommendation_feedback for select
using (auth.uid() = user_id);

drop policy if exists "Users can create recommendation feedback" on recommendation_feedback;
create policy "Users can create recommendation feedback"
on recommendation_feedback for insert
with check (auth.uid() = user_id);
