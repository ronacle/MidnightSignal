create table if not exists retention_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  snapshot_type text check (snapshot_type in ('daily_digest', 'weekly_report')) not null,
  payload jsonb not null,
  created_at timestamp with time zone default now()
);

create index if not exists idx_retention_snapshots_user_type_created on retention_snapshots(user_id, snapshot_type, created_at desc);

alter table retention_snapshots enable row level security;
create policy "Users can view their own retention snapshots" on retention_snapshots for select using (auth.uid() = user_id);
create policy "Users can insert their own retention snapshots" on retention_snapshots for insert with check (auth.uid() = user_id);
