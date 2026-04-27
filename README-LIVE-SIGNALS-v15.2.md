# Midnight Signal v15.2 — Live Signals

This build makes the top signal respond to fresh market data instead of static fallback scoring.

## What changed

- Added `app/api/signals/live/route.ts`
  - Server-side live signal refresh endpoint
  - `dynamic = 'force-dynamic'`
  - `revalidate = 0`
  - `Cache-Control: no-store`

- Rebuilt `lib/market.ts`
  - Uses CoinGecko `/coins/markets`
  - Pulls 1h, 24h, and 7d change data
  - Uses `cache: 'no-store'` and `next: { revalidate: 0 }`

- Rebuilt `lib/signals.ts`
  - Signal confidence now recalculates from live 1h/24h/7d movement
  - Top signal can rotate as live market conditions change
  - Fallback demo data remains available if the market feed is down

- Updated `components/Dashboard.tsx`
  - Fetches live signals through `/api/signals/live`
  - Refreshes on mode/currency changes
  - Auto-refreshes every 5 minutes
  - Saves refreshed signals for settlement/history

## Deploy

```bash
npm install
npm run build
vercel --prod
```

## Notes

If CoinGecko rate-limits or fails, the app will display fallback demo data and the data source badge will show that state.
