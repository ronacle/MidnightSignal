# Midnight Signal v13.7 — Signal Receipts + Pro Analytics

This build extends v13.6 persistent signal results with a receipt-first performance layer and Pro analytics.

## What changed

- Each settled signal now renders as a **signal receipt** with:
  - symbol and direction
  - entry price → exit price
  - return percentage
  - win/loss/neutral outcome
  - hold time
  - close date
  - explanatory result note
- The main performance hero now emphasizes receipts instead of vague history.
- Pro users get analytics breakdowns for:
  - 7 / 30 / 90 day performance windows
  - win rate and average return by symbol
  - win rate and average return by confidence tier
  - win rate and average return by trader mode
  - best and worst receipt
  - average hold time
- Free users see a limited receipt preview with Pro-gated analytics.
- Added more explicit educational / not-financial-advice copy near performance claims.

## Files changed

- `components/Dashboard.tsx`
- `lib/performance.ts`
- `lib/build.ts`
- `package.json`

## Deploy notes

This build uses the same Supabase `signal_results` schema from v13.6. No required database migration is needed if you already applied `supabase/signal_results.sql`.

Keep the v13.6 cron route active:

```txt
/api/cron/settle-signals
```

Recommended Vercel cron schedule:

```txt
0 * * * *
```

## Local validation

```bash
npm install
npm run build
```

If your environment cannot fetch dependencies, deploy to Vercel or run locally where npm install can complete.
