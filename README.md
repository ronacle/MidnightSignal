# Midnight Signal v10

This build is **safe to deploy immediately**.
It includes:

- stable App Router build
- signal engine + watchlist + visit memory
- auth/session UI
- premium gating UI
- backend-ready billing routes
- environment status panel

## Important
This bundle **builds without env vars**.
If Stripe / Supabase env vars are missing, the app falls back gracefully and shows setup status instead of crashing.

## Environment variables
See `.env.example`.
