# Midnight Signal v13.9 — Personalized Watchlists

This build adds a personalization layer on top of v13.8 alerts and recaps.

## Added

- Personalized watchlist panel on the dashboard
- “Top signal for you” selected from the user’s watchlist
- Free plan watchlist cap: 3 symbols
- Pro watchlist cap: 50 symbols
- Per-symbol high-confidence alert toggles
- Per-symbol settlement alert toggles
- Supabase persistence for signed-in users
- Local-storage fallback for guests
- Watchlist-weighted performance summary

## New files

- `lib/watchlist.ts`
- `app/api/watchlist/route.ts`
- `supabase/watchlists.sql`
- `README-PERSONALIZED-WATCHLISTS-v13.9.md`

## Supabase setup

Run this SQL after the previous v13.6 and v13.8 SQL files:

```sql
supabase/watchlists.sql
```

## Local verification

```bash
npm install
npm run build
npm run dev
```

## Product logic

Free users can personalize up to 3 symbols. Pro users can expand to 50 symbols, making watchlists a natural upgrade reason after alerts and receipt history.

Midnight Signal remains educational market context only. It is not financial advice.
