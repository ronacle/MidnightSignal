# Midnight Signal v15.4 — Dual Signal Discovery

Production-ready Next.js App Router bundle for Vercel.

## What's new in v15.4

- Adds a separate **Your Top Signal** panel for the best current signal inside the user's watchlist.
- Adds a separate **Global Top Signal** discovery panel for the best current signal across the full asset universe.
- Adds smart exposure logic so the global signal is emphasized only when materially stronger, high-confidence, or Pro.
- Keeps user control intact: discovery does not replace or reorder the user's watchlist flow.
- Adds Pro monetization hooks around deeper global analytics.
- Updates copy across the feedback loop and performance engine to distinguish personal signals from global opportunities.

## Product logic

Midnight Signal now shows two truths clearly:

1. **Personal relevance** — what matters most inside the user's chosen assets.
2. **Objective discovery** — what is performing best outside or beyond that watchlist.

This avoids the misleading experience where “top signal” secretly means “top signal from your watchlist,” while still preserving the user's sense of control.

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

## Deploy

```bash
npm install
npm run build
```

## Supabase setup

Run the SQL files in `supabase/` as needed:

- `user_state.sql`
- `watchlists.sql`
- `signal_results.sql`
- `signal_feedback.sql`
- `signal_performance_views.sql`
- `alerts.sql`

Educational use only. Not financial advice.
