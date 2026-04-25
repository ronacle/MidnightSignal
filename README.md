# Midnight Signal v16.2 - Pattern Intelligence

v16.2 adds repeatable pattern detection on top of the Personal Intelligence layer.

## Highlights

- Detects strongest user signal patterns from feedback and receipts
- Detects avoid/suppression patterns from losses and ignored signals
- Adds a new opportunity pattern for high-strength global assets outside the watchlist
- Adds pattern-aware recommendation scoring
- Adds Pattern Intelligence cards inside the Recommended for You panel
- Adds `app/api/personalization/patterns` for storing and logging pattern insights
- Adds `supabase/pattern_intelligence.sql`

## Local setup

```bash
npm install
npm run build
npm run dev
```

## Supabase SQL

Run the SQL files in `supabase/` as needed. New for v16.2:

```text
supabase/pattern_intelligence.sql
```

Educational use only. Not financial advice.
