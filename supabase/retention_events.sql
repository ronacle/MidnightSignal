create table if not exists retention_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  event_type text not null check (event_type in ('digest_viewed', 'weekly_report_viewed', 'missed_opportunity_clicked', 'digest_upgrade_clicked')),
  symbol text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists retention_events_user_created_idx on retention_events (user_id, created_at desc);
create index if not exists retention_events_type_idx on retention_events (event_type);

-- v15.7 generated retention snapshots
create table if not exists retention_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  snapshot_type text not null check (snapshot_type in ('daily_digest', 'weekly_report')),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists retention_snapshots_user_created_idx on retention_snapshots(user_id, created_at desc);
create index if not exists retention_snapshots_type_created_idx on retention_snapshots(snapshot_type, created_at desc);

alter table retention_snapshots enable row level security;

create policy if not exists "Users can read their retention snapshots"
  on retention_snapshots for select
  using (auth.uid() = user_id);
