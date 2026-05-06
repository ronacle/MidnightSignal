# Manual X Posting for Cardano Admin

This build adds manual X publishing to `/cardano-admin`.

## What changed

- Added `twitter-api-v2` dependency.
- Added `app/api/cardano/post-to-x/route.ts`.
- Replaced the disabled "Post to X soon" button with a real "Post to X" action.
- The API route:
  - verifies the current Supabase user is an allowed Cardano admin,
  - requires the post to be `approved`,
  - prevents duplicate posting if `status = posted` or `x_post_id` exists,
  - uploads `image_url` to X when present,
  - posts the tweet text,
  - updates Supabase with `status = posted`, `x_post_id`, and `posted_at`.

## Required Vercel environment variables

```env
X_API_KEY=
X_API_SECRET=
X_ACCESS_TOKEN=
X_ACCESS_TOKEN_SECRET=
```

Existing required variables still apply:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CARDANO_ADMIN_EMAILS=ronjc1981@gmail.com
```

## X developer app settings

Your X app must have OAuth 1.0a user context credentials with Read and Write permissions.

## Supabase schema

This repo already includes `supabase/cardano_posts_admin.sql`, which adds:

```sql
alter table cardano_posts
add column if not exists status text default 'draft',
add column if not exists posted_at timestamp with time zone,
add column if not exists x_post_id text;
```

## Usage

1. Sign in to `/cardano-admin`.
2. Review/edit a draft.
3. Approve it.
4. Click `Post to X`.
5. The post card updates to `posted` and shows a link to the X post.
