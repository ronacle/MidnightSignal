# Midnight Signal v13.8 — Alerts + Daily Recap

This build adds the retention loop on top of v13.7 Signal Receipts + Pro Analytics.

## Added

- In-app alert preferences for:
  - high-confidence signals
  - daily recap
  - signal settlement alerts
  - Pro-only alerts
- Alert event storage for high-confidence signals, settlements, and daily recaps.
- Daily recap cron endpoint with dry-run support.
- Dashboard card for alert preferences, latest alert events, and the daily recap preview.

## New API routes

```txt
GET/POST /api/alerts/preferences
GET      /api/alerts/events
GET      /api/cron/daily-recap
```

## Supabase setup

Run the existing signal results schema first if you have not already:

```sql
supabase/signal_results.sql
```

Then run:

```sql
supabase/alerts.sql
```

## Vercel cron suggestions

Hourly signal settlement:

```txt
/api/cron/settle-signals
0 * * * *
```

Daily recap generation:

```txt
/api/cron/daily-recap
0 21 * * *
```

Set `CRON_SECRET` in Vercel and send `Authorization: Bearer <CRON_SECRET>` if you want protected cron routes.

## Notes

- This build creates in-app alert events, not external email delivery yet.
- The next production step is to connect `/api/cron/daily-recap` to Resend, SendGrid, or Postmark for real email sending.
- Educational use only. Not financial advice.
