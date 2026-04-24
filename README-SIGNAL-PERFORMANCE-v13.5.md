# Midnight Signal v13.5 - Signal Performance Proof

This build upgrades v13.4 with a proof-first signal performance layer.

## Added

- `lib/performance.ts`
  - Builds deterministic signal result history from current signals.
  - Scores each signal as win, loss, or neutral.
  - Calculates win rate, average return, total simulated return, current streak, best/worst result, and confidence accuracy.

- Dashboard performance UI
  - New top-level performance summary in Tonight's Brief.
  - New Signal Performance System hero panel.
  - Recent closes with result badges and simulated return percentages.
  - Pro-gated expanded signal result notes.

- `supabase/signal_results.sql`
  - Optional persistence schema for real signal result storage.
  - Includes indexes and RLS policies for user-owned results.

## Notes

The shipped UI uses a deterministic simulated result layer so the app works immediately without a new backend job. The Supabase schema is included for the next step: persist real signal opens/closes and replace simulated results with database-backed outcomes.

## Validation

I attempted dependency installation/build validation in the workspace, but `npm ci` timed out before installing `node_modules`. No local build artifacts were included in this zip.
