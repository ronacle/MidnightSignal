# Midnight Signal v16.5 - Embedded Learning Layer

This build restores the in-app learning/glossary experience so Midnight Signal remains a learning tool as the product becomes more advanced.

## What's new

- Inline glossary term links inside the signal breakdown and recommendation copy
- Learning Glossary panel with anchor-style jump/highlight behavior
- Expanded glossary term set for signals, metrics, personalization, and the Midnight Network
- Optional learning event tracking API at `/api/learning/events`
- Optional Supabase SQL at `supabase/learning_events.sql`

## Core identity

The default guest watchlist remains the Midnight Network bundle:

- BTC
- ADA
- NIGHT

Legacy Midnight/MID aliases continue to resolve to NIGHT.

## Run locally

```bash
npm install
npm run build
```

Educational use only. Not financial advice.
