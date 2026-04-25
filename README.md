# Midnight Signal v15.6 — Retention Intelligence

A complete Next.js App Router repo built from v15.5, preserving the working dependency/config layer while adding the v15.6 retention system.

## What changed in v15.6

- Keeps the v15.5 dual-signal conversion system intact.
- Adds a Retention Intelligence dashboard section.
- Adds daily signal digest preview logic.
- Adds weekly performance report preview logic.
- Adds missed-opportunity tracking when the global top signal outperforms the user's watchlist leader.
- Adds `/api/retention/events`, `/api/retention/digest`, and `/api/retention/weekly-report`.
- Adds `supabase/retention_events.sql` for persistent retention-event tracking.
- Removes old extra README files so this repo has one main README.

## Deploy notes

1. Run Supabase SQL files as needed, including `supabase/retention_events.sql`.
2. Set the existing Supabase and Stripe environment variables.
3. Install and build:

```bash
npm install
npm run build
```

## Product direction

v15.6 is the habit layer: it turns signal discovery, feedback, and performance receipts into daily and weekly reasons for users to return.
