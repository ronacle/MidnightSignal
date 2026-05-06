-- Cardano Nightly / Midnight Signal manual-cost-control workflow
-- Adds parent batches/templates, grouping generated posts under the source template.

create table if not exists cardano_batches (
  id uuid primary key default gen_random_uuid(),
  title text,
  template text not null,
  source_urls jsonb default '[]'::jsonb,
  status text default 'draft',
  created_at timestamptz default now(),
  processed_at timestamptz,
  raw_json jsonb default '{}'::jsonb
);

alter table cardano_posts
add column if not exists batch_id uuid references cardano_batches(id) on delete set null,
add column if not exists x_url text,
add column if not exists x_post_id text,
add column if not exists posted_at timestamptz;

create index if not exists cardano_batches_created_at_idx
on cardano_batches(created_at desc);

create index if not exists cardano_batches_status_idx
on cardano_batches(status);

create index if not exists cardano_posts_batch_id_idx
on cardano_posts(batch_id);


-- Posting schedule metadata for grouped editorial posts
alter table cardano_posts
add column if not exists slot text,
add column if not exists series text;
