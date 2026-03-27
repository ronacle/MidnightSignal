Midnight Signal v8.0 auth + persistence

Build number: 2026.03.27-ui.8.0

What this build adds:
- Supabase magic-link login scaffold
- auth bar in the app
- remote persistence for watchlist and key preferences
- local mode still works if Supabase keys are not set

Setup:
1. Create a Supabase project.
2. Run supabase/schema.sql in the SQL editor.
3. Put your project URL and anon key into index.html:
   window.__SUPABASE_URL__
   window.__SUPABASE_ANON_KEY__
4. Deploy as usual.

Notes:
- This build does not add Stripe yet.
- It keeps all current signal logic and UI, and adds auth/persistence around it.
