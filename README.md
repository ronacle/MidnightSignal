# Midnight Signal v15.5 — Conversion Intelligence

v15.5 turns the dual-signal system into an action layer. The dashboard no longer keeps an obsolete single Top Signal card above the experience. It replaces that area with two clear panels:

- **Your Top Signal** — the best current signal inside the user's watchlist, with deeper personal context.
- **Global Top Signal** — the best current signal across the full asset universe, with lightweight but credible comparison data.

## What's new in v15.5

- Replaces the old single hero Top Signal with the two-panel signal layout.
- Adds comparable but intentionally lighter Global Top Signal intelligence:
  - global confidence
  - global tracked win rate
  - exposure state
  - “why it matters” discovery context
  - comparison against the user's top signal
- Adds Global Signal conversion actions:
  - **Track this signal**
  - **Add to watchlist**
  - **Unlock global analytics**
- Tracks local conversion events for global signal interactions and syncs them to Supabase when signed in.
- Adds Supabase SQL for `signal_conversion_events`.
- Keeps the user's watchlist as the control layer while Global Top Signal acts as a discovery and monetization layer.

## Product principle

Your Top Signal gets depth. Global Top Signal gets enough proof to create action without duplicating the whole dashboard.

## Setup notes

1. Run the existing Supabase SQL files.
2. Add `supabase/signal_conversion_events.sql` for the v15.5 conversion event table.
3. Configure Supabase and Stripe environment variables as in prior versions.
4. Run locally:

```bash
npm install
npm run build
```

Educational use only. Not financial advice.
