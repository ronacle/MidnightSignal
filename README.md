# Midnight Signal v13.0.0

Clean production starter bundle for Vercel.

## Includes

- Next.js App Router structure
- Root `app/layout.tsx`
- v13 dashboard UI
- Agreement-of-understanding modal
- Beginner / Pro session mode
- Scalp / Swing / Position trader modes
- Persistent localStorage settings
- Watchlist-first layout
- Tonight's Top Signal
- Signal Breakdown Panel
- Confidence visualization
- Floating glossary
- Soft Pro Insight lock
- Build/version footer

## Local setup

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run start
```

## Vercel

Upload this folder or connect it to GitHub. Vercel should detect Next.js automatically.

## Notes

This version uses a local heuristic signal engine in `lib/signals.ts`. It is ready to later swap in CoinGecko or backend data without rewriting the UI.

Educational use only. Not financial advice.
