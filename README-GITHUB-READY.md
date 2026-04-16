# Midnight Signal v11.81.6 GitHub-ready package

This repo has been flattened so the app files are at the repository root.

## Upload to GitHub
1. Unzip this folder.
2. Create a new GitHub repo.
3. Upload the contents of this folder to the repo root.
4. Connect the repo to Vercel.

## Local run
```bash
npm install
npm run dev
```

## Production build
```bash
npm install
npm run build
```

## Notes
- `.DS_Store` files were removed.
- `.gitignore` was added.
- `package-lock.json` is present and points at the public npm registry.


v11.84 adds visible account persistence for watchlist, alert rules, recent alert history, and onboarding state using the existing Supabase-backed user_state table.
