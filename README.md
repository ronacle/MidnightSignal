# Midnight Signal v16.3 - Asset Identity Layer

v16.3 adds canonical asset identity so ambiguous symbols resolve correctly across the app. The Midnight Network default experience now highlights:

- BTC - Bitcoin
- ADA - Cardano
- NIGHT - Midnight on Cardano

## What changed

- Added `lib/assets.ts` as the canonical asset registry.
- Replaced the old guest default watchlist `ADA / MID / BTC` with `BTC / ADA / NIGHT`.
- Added alias normalization so `Midnight`, `Midnight Network`, and legacy `MID` resolve to `NIGHT`.
- Updated signal generation to source assets from the registry instead of scattered hardcoded tuples.
- Updated CoinGecko lookup mapping to use canonical symbols where live IDs exist.
- Added `supabase/asset_identity.sql` for optional database-side identity and alias storage.

## SQL

Run the new SQL file if you want Supabase to also store canonical identities and aliases:

```sql
-- supabase/asset_identity.sql
```

This is additive. Existing watchlist rows using `MID` will be normalized in the client to `NIGHT` when loaded.

## Local build

```bash
npm install
npm run build
```

Educational use only. Not financial advice.
