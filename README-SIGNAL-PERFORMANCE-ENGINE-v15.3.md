# Midnight Signal v15.3 — Signal Performance Engine

v15.3 turns the v15.2 feedback loop into visible signal intelligence.

## Added

- `/api/signals/performance` aggregation endpoint
- Performance engine card on the dashboard
- Feedback-informed confidence badge
- Win rate, action rate, best signal type, and symbol breakdowns
- Pro-gated deeper performance analytics preview
- `supabase/signal_performance_views.sql` helper view

## How it works

1. Users mark each signal as acted, ignored, win, loss, or neutral.
2. The performance engine aggregates feedback by symbol and signal type.
3. Once enough feedback exists, the dashboard blends the current heuristic confidence with historical user outcomes.
4. Free users see the headline engine; Pro users see more breakdown depth.

## Setup

Run the existing Supabase SQL first:

```sql
supabase/signal_feedback.sql
```

Then optionally add the analytics view:

```sql
supabase/signal_performance_views.sql
```

## Local validation

```bash
npm install
npm run build
```
