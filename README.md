# Midnight Signal v11.8 — Cross-Device Account Sync

This bundle is a clean build focused on syncing account state across devices.

## What is included

- Next.js 15.3.8 app-router shell
- Supabase browser auth with magic link sign-in
- Synced state stored in a `user_state` table
- Local fallback storage when the user is signed out
- Cloud merge logic so the most recently updated state wins
- Poll-based refresh so another device can update this one without a full reload
- Version endpoint at `/api/state`

## Synced fields

- `mode`
- `currency`
- `strategy`
- `timeframe`
- `selectedAsset`
- `watchlist`
- `acceptedDisclaimer`
- `lastViewedAt`
- `updatedAt`

## Setup

1. Copy `.env.example` to `.env.local`
2. Add your Supabase project URL and anon key
3. Run `npm install`
4. Run `npm run dev`

## Required Supabase SQL

Run the SQL inside `supabase/user_state.sql`.

## Deploy notes

- Add the same two public env vars in Vercel
- Enable magic link auth in Supabase
- Set your site URL and redirect URL in Supabase auth settings
- Optional: enable Realtime later if you want instant push instead of polling

## Migration note

When a signed-out user later signs in, this build compares local state and cloud state by timestamp and keeps the newer one.
