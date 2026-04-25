# Midnight Signal v13.6 — Persistent Signal Results + Cron Settlement

This build upgrades v13.5 from proof-style simulated outcomes into a production-ready persistence path.

## Added

- `lib/signal-storage.ts`
  - Saves open signals into Supabase.
  - Reads closed signal results for dashboard performance metrics.
  - Settles open signals after the configured settlement window.

- `/api/signals/save`
  - Called by the dashboard after each market refresh.
  - Saves the top 5 current signals as open records.

- `/api/signals/results`
  - Reads settled results from Supabase.
  - Dashboard uses database results when available and falls back to deterministic simulated results when empty.

- `/api/cron/settle-signals`
  - Settles open signals using current CoinGecko price data.
  - Calculates return %, win/loss/neutral, exit price, and result note.
  - Supports optional `CRON_SECRET` bearer auth.

## Required Supabase table

Run:

```sql
supabase/signal_results.sql
```

The table already supports open signals by keeping `closed_at`, `exit_price`, `return_pct`, and `outcome` null until settlement.

## Environment variables

Required for persistence:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Optional:

```env
CRON_SECRET=your-random-secret
SIGNAL_SETTLE_AFTER_HOURS=24
SIGNAL_MAX_OPEN_PER_MODE=20
```

## Vercel cron

Create a cron job for:

```txt
/api/cron/settle-signals
```

Suggested schedule:

```txt
0 * * * *
```

If `CRON_SECRET` is set, call it with:

```txt
Authorization: Bearer your-random-secret
```

## Dashboard behavior

- If settled database records exist, the performance dashboard uses real persistent results.
- If none exist yet, the UI falls back to the deterministic v13.5 simulated performance layer so the product still looks complete during setup/demo.
