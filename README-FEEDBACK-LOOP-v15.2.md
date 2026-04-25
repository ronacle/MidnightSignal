# Midnight Signal v15.2 — Feedback Loop

This release adds the first user-feedback learning loop. Midnight Signal can now capture whether a user acted on a signal, ignored it, and whether the outcome was a win, loss, or neutral.

## Added
- Feedback Loop card on the top signal.
- Local feedback persistence for guest mode.
- Supabase-backed POST/GET endpoint at `/api/signals/feedback`.
- New `supabase/signal_feedback.sql` migration.
- Learning Loop Score that blends retention, receipt quality, and user feedback.

## Setup
1. Run `supabase/signal_feedback.sql` in Supabase.
2. Ensure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured in Vercel.
3. Deploy normally with `npm install && npm run build`.

## Product intent
This is the bridge from static signal display to adaptive signal quality. v15.3 can use this table to rank signal types by real user outcomes.
