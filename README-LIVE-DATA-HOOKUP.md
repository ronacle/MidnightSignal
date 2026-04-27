# Midnight Signal 18.1 Live Data Hookup

This build uses the uploaded Midnight 18.1 JSX fix repo as the source of truth and adds only the live-data hookup.

## What changed

- Added `/api/signals/live` as a dynamic, no-cache server route.
- Updated the dashboard to request fresh signals through that route.
- Reworked `lib/market.ts` to score confidence from CoinGecko live market data: current price, 1h change, 24h change, 7d change, and liquidity context.
- Added a 5-minute live refresh loop.
- Preserved the existing global top signal and watchlist signal structure from the uploaded repo.
- Preserved Midnight as `NIGHT`; it remains a canonical asset even without a stable public CoinGecko market id.

If CoinGecko rate limits or fails, Midnight Signal falls back to the existing canonical dataset so the app remains usable.

```bash
npm install
npm run build
npm run dev
```
