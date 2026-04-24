# Midnight Signal v13.3.3 — Pro Unlock Sync

Clean Next.js App Router bundle for Vercel.

## What changed in v13.3.3
- Pro status now reads from `public.users.plan`
- Guest checkout can unlock by email, not only Supabase auth user ID
- Stripe webhook writes `stripe_customer_id` and `stripe_subscription_id`
- Checkout success page refreshes Pro access automatically
- Pro badge/buttons update when `plan = pro`
- Webhook logs Supabase errors instead of silently skipping writes

## Required env vars
Copy `.env.example` to `.env.local` locally and set the same values in Vercel.

```env
NEXT_PUBLIC_APP_URL=https://YOUR-VERCEL-APP.vercel.app
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Supabase table
Run this in Supabase SQL editor if your `users` table does not already match it:

```sql
create table if not exists public.users (
  id uuid default gen_random_uuid() primary key,
  email text unique,
  plan text not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

## Supabase auth redirect
In Supabase Auth URL settings, add your deployed Vercel URL and `http://localhost:3000` for local testing.

## Stripe
Use your recurring $9/month Founder Access Price ID in `STRIPE_PRICE_ID`.

Webhook endpoint:
`https://YOUR-DOMAIN/api/stripe/webhook`

Listen for:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Only `checkout.session.completed` is required for the initial Pro unlock in this build.

## Deploy
```bash
npm install
npm run build
```


## v13.3.3 Checkout Return Polish

- Detects Stripe checkout return via `?checkout=success`.
- Shows a temporary **Finalizing your Pro access…** banner.
- Retries Supabase plan sync every 1.5 seconds for up to 10 attempts so users do not need a manual refresh after Stripe redirects back.
- Persists the checkout email before redirect so guest checkout can sync by email after returning.
