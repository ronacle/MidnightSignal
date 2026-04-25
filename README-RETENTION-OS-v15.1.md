# Midnight Signal v15.1 - Retention OS

Built from the v14.1 Conversion Layer repo.

## What changed

- Updated build metadata and package identity to v15.1.0.
- Renamed the visible product layer from Conversion Layer to Retention OS.
- Added a Retention Score panel that combines journey progress, receipt quality, and Pro depth.
- Added Tonight's Review Plan, a four-step nightly action loop based on the current top signal, market condition, performance streak, and plan status.
- Moved local storage to a v15.1 key so the new release starts clean without mutating older v13/v14 browser state.

## Deploy

```bash
npm install
npm run build
vercel --prod
```

## Notes

The existing Supabase, Stripe checkout, webhook, watchlist, alerts, daily recap, signal results, and Pro analytics routes are preserved from v14.1.
