Midnight Signal v8.3 live Stripe

Build number: 2026.03.27-ui.8.3

What this build adds:
- live checkout flow via /api/create-checkout
- billing portal via /api/create-portal
- webhook handler via /api/stripe-webhook
- plan-aware gating in the UI (Free vs Pro)
- Pro unlock driven by profile.plan from Supabase

Setup:
1. In Supabase, run supabase/schema.sql
2. In index.html, set:
   window.__SUPABASE_URL__
   window.__SUPABASE_ANON_KEY__
3. In Vercel, set env vars from .env.example
4. In Stripe, create a monthly Pro price and copy its price ID
5. In Stripe, register the webhook endpoint:
   https://YOUR-APP/api/stripe-webhook

Notes:
- Upgrade to Pro now opens a real Checkout Session URL returned by your server.
- Manage Billing opens the Stripe customer portal after a successful subscription exists.
