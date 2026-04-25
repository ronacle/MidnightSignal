# Midnight Signal v15.8 - Notification Engine

v15.8 builds on the v15.7 Automated Retention Engine by delivering retention snapshots through notification-ready email and browser-push workflows.

## Included

- Daily digest email preview endpoint
- Weekly report email preview endpoint
- Notification preferences API
- Push subscription storage API
- Notification delivery log table
- Dashboard notification controls
- Supabase SQL: `supabase/notifications.sql`

## Required SQL

Run the existing v15.7 retention SQL first if you have not already, then run `supabase/notifications.sql`.

## Email setup

Set these environment variables to enable Resend delivery:

```bash
RESEND_API_KEY=your_resend_key
RESEND_FROM_EMAIL="Midnight Signal <notifications@yourdomain.com>"
```

Without those variables, the app still generates notification payloads, but email delivery returns a safe provider-missing status.

## Push setup

v15.8 stores browser push preferences and subscription payloads. The database/API shape is ready for production web-push delivery; VAPID delivery can be added next without changing tables.

## Run locally

```bash
npm install
npm run build
npm run dev
```
