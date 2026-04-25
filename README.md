# Midnight Signal v17 - Strategy Layer

v17 adds a single active strategy mode to Midnight Signal so users can guide the app through a clear decision framework instead of only reading raw signals.

## Highlights

- Single active strategy selection: Momentum, Breakout, Conservative, or Aggressive
- Strategy-ranked top signal
- Signal-to-strategy fit score and Act / Wait / Avoid guidance
- Strategy performance summary from recent receipts
- Strategy terms linked to the embedded learning/glossary panel
- Supabase-ready strategy persistence via `supabase/strategy_layer.sql`

## Run locally

```bash
npm install
npm run build
npm run dev
```

## SQL

Run `supabase/strategy_layer.sql` if you want signed-in users' active strategy and strategy events persisted in Supabase.
