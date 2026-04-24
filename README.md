# Midnight Signal v13.1.0

Launch Polish + Trust Layer.

## What changed from v13

- Added live CoinGecko price hook with safe fallback demo data.
- Added trust cards: data source, data last updated, market condition.
- Added confidence-change explanation under the top signal.
- Added refresh button for the Top 20 signal grid.
- Added diagnostic build/version footer.
- Improved mobile spacing and launch polish while preserving the v13 layout.

## Deploy on Vercel

1. Upload this folder or connect it to GitHub.
2. Run `npm install`.
3. Vercel build command: `npm run build`.
4. Output: Next.js default.

## Notes

Midnight Signal is educational only and not financial advice. The app gracefully falls back to seeded demo data if the live CoinGecko request fails or rate-limits.
