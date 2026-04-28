# Midnight Signal v18.1.1 — Fully Live Data Hookup

Built from the uploaded `Midnight 18.1 jsx fix.zip` source of truth.

## What changed
- Added `app/api/signals/live/route.ts` as the single live-signal endpoint.
- Updated `lib/market.ts` to use CoinGecko `/coins/markets` with 1h, 24h, and 7d movement.
- Forced no-store responses so Next/Vercel does not serve stale signal data.
- Updated the dashboard refresh flow to call `/api/signals/live` instead of importing live fetch logic into the client bundle.
- Added a 5-minute dashboard refresh loop.
- Preserved existing v18.1 layout, global top signal, watchlist top signal, and `NIGHT` identity.

## Verify locally
```bash
npm install
npm run build
npm run dev
```
