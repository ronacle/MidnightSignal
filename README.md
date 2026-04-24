# Midnight Signal v13.4 — Retention + Signal Performance

Production-ready Next.js App Router bundle for Vercel.

## What's new in v13.4

- Simple signal performance layer: Worked / Failed / Neutral
- Pro Signal History panel
- Previous Signal Result card
- In-app Signal Alerts
- Conversion copy around signal history and confidence notes
- Keeps the working v13.3.3 checkout return polish, Stripe webhook, Supabase user plan sync, and Pro unlock flow

## Required environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=

NEXT_PUBLIC_SITE_URL=https://your-vercel-app.vercel.app
```

## Supabase table

The app expects `public.users`:

```sql
create table if not exists public.users (
  id uuid default gen_random_uuid() primary key,
  email text unique,
  plan text default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

## Stripe webhook endpoint

Use this endpoint:

```txt
https://YOUR-VERCEL-APP.vercel.app/api/stripe/webhook
```

Recommended events:

- checkout.session.completed
- customer.subscription.updated
- customer.subscription.deleted

## Deploy

```bash
npm install
npm run build
```

Educational use only. Not financial advice.
