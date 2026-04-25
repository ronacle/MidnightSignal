# Midnight Signal v16.4 - Asset-Aware Signal Intelligence

v16.4 adds Midnight Network context on top of the v16.3 Asset Identity Layer.

## What changed

- Guest default watchlist remains **BTC / ADA / NIGHT**.
- `NIGHT` is treated as the correct Midnight asset; legacy `MID` aliases still normalize to `NIGHT`.
- Added a Midnight Network spotlight for BTC, ADA, and NIGHT.
- Added asset-aware roles:
  - BTC = liquidity / macro anchor
  - ADA = Cardano ecosystem anchor
  - NIGHT = Midnight ecosystem asset
- Added bundle-level intelligence:
  - network strength score
  - strongest contributor
  - weakest contributor
  - divergence alert
- Added optional SQL: `supabase/midnight_network.sql`.

## Local run

```bash
npm install
npm run build
npm run dev
```

## Notes

Midnight Signal is educational market guidance, not financial advice.
