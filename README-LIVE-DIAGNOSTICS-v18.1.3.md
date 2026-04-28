# Midnight Signal 18.1.3 - Live Data Confidence + Diagnostics UI

Built from the corrected 18.1.2 live-data base.

## Added

- Live data confidence cards in the dashboard.
- `TrustSnapshot.diagnostics` with:
  - requested symbols
  - matched live symbols
  - missing live symbols
  - CoinGecko row count
  - fetch latency
  - global top symbol
  - currency / mode
  - fallback reason when live data fails
- `/api/signals/live` now returns the same diagnostics object directly.
- Response header: `X-Midnight-Live-Data: true`.
- No-store/no-cache headers preserved.

## Deploy check

After deploy, open:

```txt
/api/signals/live?mode=swing&currency=USD
```

Confirm:

- `snapshot.source` is `CoinGecko live`
- `diagnostics.globalTop` matches the Global Top Signal card
- `diagnostics.matchedSymbols` includes the assets you expect
- `diagnostics.missingSymbols` is empty or explainable
- `NIGHT` remains the Midnight asset ticker

If CoinGecko is unavailable or rate-limited, the UI will show fallback status and the reason.
