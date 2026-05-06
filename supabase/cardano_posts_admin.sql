alter table cardano_posts
add column if not exists status text default 'draft',
add column if not exists posted_at timestamp with time zone,
add column if not exists x_post_id text;
