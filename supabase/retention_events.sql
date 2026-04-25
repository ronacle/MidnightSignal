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
