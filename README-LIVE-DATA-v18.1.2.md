# Midnight Signal v18.1.2 — Corrected Live Data Hookup

This build uses the uploaded `Midnight 18.1 jsx fix` zip as the source of truth and adds only the corrected live-data layer.

## What changed

- Added `/api/signals/live` as the browser-safe live signal source.
- Removed direct client-side `getMarketSnapshot` usage from `Dashboard.tsx`.
- Added strict no-store/no-cache headers to the live signal API response.
- Dashboard refreshes live signal data every 5 minutes.
- Preserved the existing 18.1 layout, including Global Top Signal and Top Signal in Your Watchlist.
- Mapped Midnight correctly as ticker `NIGHT` with CoinGecko id `midnight-3`.
- Re-scores assets from live CoinGecko 1h / 24h / 7d movement.

## How to verify after deploy

Open:

```txt
/api/signals/live?mode=swing&currency=USD
```

Confirm:

- `snapshot.source` is `CoinGecko live`
- `snapshot.updatedAt` changes on refresh
- `diagnostics.globalTop` matches `snapshot.signals[0].symbol`
- `NIGHT` has a live market price instead of the old fallback price
