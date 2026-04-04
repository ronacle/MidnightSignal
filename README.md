# Midnight Signal v8.3.0 Stable

This bundle is designed to be deployment-safe on Vercel.

## What is fixed
- No top-level `BUILD` usage
- No `refreshTick` usage
- No prerender-time live API dependency on `/`
- Market data fetches are guarded with timeout + fallback
- Includes `/api/market` and `/api/version`

## Deploy
1. Upload contents to your GitHub repo root
2. Push to Vercel
3. Build command: `npm run vercel-build`

## Notes
- Home page renders from fallback data first, then refreshes client-side
- Version endpoint: `/api/version`
- Market endpoint: `/api/market`
