# Midnight Signal v15.7 - Automated Retention Engine

Midnight Signal v15.7 builds on v15.6 and turns the retention foundation into generated, notification-ready content.

## What changed in v15.7

- Daily Digest Generator: compares the user's top watchlist signal against the global top signal.
- Weekly Report Generator: summarizes acted, ignored, win/loss/neutral, conversion, and missed-opportunity activity.
- Snapshot Storage: `retention_snapshots` stores generated digest/report payloads so future emails and push notifications use stable history.
- Dashboard copy/version updated to Automated Retention Engine.
- Notification-ready API structure for v15.8 email/push delivery.

## Key routes

- `GET /api/retention/digest`
- `GET /api/retention/weekly-report`
- `POST /api/retention/snapshots`
- `POST /api/retention/events`

## Supabase

Run `supabase/retention_events.sql` to create or update retention event and snapshot tables.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm start
```
