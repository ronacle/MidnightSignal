# Midnight Signal v15.9 - Notification Automation + Preferences Hardening

v15.9 builds on v15.8 by moving notification delivery from manual previews toward production-safe automation.

## What's new

- Cron-ready notification scheduler: `app/api/cron/notifications/route.ts`
- Daily digest and weekly report automation using retention snapshots
- Preference enforcement for email, push, daily, weekly, and missed-opportunity notifications
- Quiet-hours guardrails before automated sends
- Delivery logs with `sent`, `failed`, `skipped`, `duplicate`, and `test_mode` states
- Duplicate-send protection using a unique delivery key per user, snapshot/period, type, and channel
- Admin test mode so you can dry-run sends without blasting users
- Notification logs API for recent delivery history
- Updated Supabase SQL in `supabase/notifications.sql`

## Required SQL

Run:

1. `supabase/retention_snapshots.sql`
2. `supabase/notifications.sql`

## Required environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
CRON_SECRET=
```

## Cron usage

Daily digest:

```bash
curl -X POST https://your-domain.com/api/cron/notifications \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"type":"daily_digest"}'
```

Weekly report:

```bash
curl -X POST https://your-domain.com/api/cron/notifications \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"type":"weekly_report"}'
```

Admin test mode:

```bash
curl -X POST https://your-domain.com/api/cron/notifications \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"type":"daily_digest","testMode":true,"userId":"USER_UUID"}'
```

## Local validation

```bash
npm install
npm run build
```
