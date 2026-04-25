# Midnight Signal v16.0 — Personal Intelligence Layer

v16 builds on v15.9 and adds adaptive personalization on top of signals, feedback, global discovery, conversion events, retention snapshots, and notification automation.

## What changed

- Personalized signal ranking via `lib/personalization.ts`
- `Recommended for You` dashboard panel
- User intelligence profile API
- Personalized signal event API
- Supabase SQL for `user_intelligence_profiles` and `personalized_signal_events`
- Version/build metadata updated to `16.0.0`
- Excess README files removed

## SQL to run

Run:

```sql
supabase/personal_intelligence.sql
```

Run this after the previous v15.9 notification SQL.

## Local build

```bash
npm install
npm run build
```

## Environment notes

Keep the same environment variables from v15.9. Personalization uses existing Supabase service-role access on server routes.
