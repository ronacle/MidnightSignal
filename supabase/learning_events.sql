create table if not exists learning_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  term text not null,
  source text default 'inline_glossary',
  created_at timestamp with time zone default now()
);

create index if not exists idx_learning_events_user_term
on learning_events(user_id, term, created_at desc);

alter table learning_events enable row level security;

create policy "Users can view their own learning events"
on learning_events
for select
using (auth.uid() = user_id);

create policy "Users can insert their own learning events"
on learning_events
for insert
with check (auth.uid() = user_id);
