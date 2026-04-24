# Midnight Signal v13.3 — Real Users + Payments

Clean Next.js App Router bundle for Vercel.

## What changed
- Supabase magic-link auth client
- Persistent user session
- Stripe Checkout route for Founder Pro access
- Stripe webhook route that upgrades `profiles.plan` to `pro`
- Real Pro UI unlocking based on profile plan
- `.env.example` included

## Required env vars
Copy `.env.example` to `.env.local` locally and set the same values in Vercel.

## Supabase table
Run this in Supabase SQL editor:

```sql
create table if not exists profiles (
  id uuid primary key,
  email text unique,
  plan text not null default 'free',
  stripe_customer_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

## Supabase auth redirect
In Supabase Auth URL settings, add your deployed Vercel URL and `http://localhost:3000` for local testing.

## Stripe
Create a recurring subscription price for $9/month Founder Access and paste that price ID into `STRIPE_PRICE_ID`.

Webhook endpoint:
`https://YOUR-DOMAIN/api/stripe/webhook`

Listen for:
- `checkout.session.completed`

## Deploy
```bash
npm install
npm run build
```
