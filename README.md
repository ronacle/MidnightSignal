# Midnight Signal v16.1 — Recommendation Quality + Explainability

This build upgrades v16 Personal Intelligence with a trust layer for recommendations.

## Added in v16.1

- **Why this?** explanations for the top recommended signal
- recommendation score breakdown: personal match, history, global strength, freshness
- user controls: **More like this**, **Less like this**, and **Not interested**
- recommendation feedback loop that adjusts future personalized ranking
- Supabase support for explicit recommendation feedback
- updated personalization API support for v16.1 events

## SQL

Run or re-run:

```sql
-- supabase/personal_intelligence.sql
```

It is idempotent and adds the v16.1 `recommendation_feedback` table plus expanded personalization event types.

## Local build

```bash
npm install
npm run build
```

Educational use only. Not financial advice.
