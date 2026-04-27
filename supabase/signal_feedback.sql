create table if not exists public.signal_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  signal_id text not null,
  symbol text not null,
  mode text not null default 'swing',
  label text,
  confidence integer,
  action text not null check (action in ('acted', 'ignored')),
  outcome text check (outcome in ('win', 'loss', 'neutral')),
  signal_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists signal_feedback_user_created_idx on public.signal_feedback (user_id, created_at desc);
create index if not exists signal_feedback_signal_idx on public.signal_feedback (signal_id);
create index if not exists signal_feedback_symbol_idx on public.signal_feedback (symbol);

alter table public.signal_feedback enable row level security;

drop policy if exists "Users can read own signal feedback" on public.signal_feedback;
create policy "Users can read own signal feedback"
  on public.signal_feedback for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own signal feedback" on public.signal_feedback;
create policy "Users can insert own signal feedback"
  on public.signal_feedback for insert
  with check (auth.uid() = user_id);
