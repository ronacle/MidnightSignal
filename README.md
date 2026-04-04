# Midnight Signal v8.4.0 Alive

This bundle keeps the stable v8.3.0 deployment-safe foundation and adds subtle motion, pulse, hover depth, and a more alive visual layer.

## What changed
- Top signal pulse ring and glow
- Hover lift on tracked assets and leaderboard rows
- Slight animated background energy
- Optional sound toggle UI placeholder (default off)
- Version bumped to `8.4.0`

## Still safe
- No top-level `BUILD` usage
- No `refreshTick` usage
- No prerender-time live API dependency on `/`
- Market data fetches are guarded with timeout + fallback
- Includes `/api/market` and `/api/version`
