Midnight Signal v8.0.1 auth redirect patch

Build number: 2026.03.27-ui.8.0.1

Fixes:
- handles Supabase auth session after magic-link redirect
- listens for auth state changes on app load
- improves sign-in messaging so users know to return after clicking the email link

Still required in Supabase:
- set Site URL
- add your deployed app URL to Redirect URLs
