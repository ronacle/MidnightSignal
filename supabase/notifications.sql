create table if not exists notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text not null,
  subscription jsonb not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, endpoint)
);

create table if not exists notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  notification_type text check (notification_type in ('daily_digest', 'weekly_report', 'missed_opportunity')) not null,
  channels text[] not null default '{}',
  payload jsonb not null,
  provider_result jsonb not null default '{}'::jsonb,
  opened_at timestamp with time zone,
  clicked_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create index if not exists idx_notification_deliveries_user_created on notification_deliveries(user_id, created_at desc);
create index if not exists idx_push_subscriptions_user on push_subscriptions(user_id);

alter table notification_preferences enable row level security;
alter table push_subscriptions enable row level security;
alter table notification_deliveries enable row level security;

create policy "Users can view their notification preferences"
on notification_preferences for select using (auth.uid() = user_id);
create policy "Users can upsert their notification preferences"
on notification_preferences for insert with check (auth.uid() = user_id);
create policy "Users can update their notification preferences"
on notification_preferences for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can view their push subscriptions"
on push_subscriptions for select using (auth.uid() = user_id);
create policy "Users can insert their push subscriptions"
on push_subscriptions for insert with check (auth.uid() = user_id);
create policy "Users can update their push subscriptions"
on push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their push subscriptions"
on push_subscriptions for delete using (auth.uid() = user_id);

create policy "Users can view their notification deliveries"
on notification_deliveries for select using (auth.uid() = user_id);
create policy "Users can insert their notification deliveries"
on notification_deliveries for insert with check (auth.uid() = user_id);
