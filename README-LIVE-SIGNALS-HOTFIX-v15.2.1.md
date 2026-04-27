# Midnight Signal v15.2.1 - Live Signals Hotfix

This hotfix keeps the v15.2 live data refresh but restores two product expectations:

- The dashboard hero/top signal is again the market-wide global top signal, not the user's watchlist-filtered top signal.
- The Midnight asset is restored as ticker `NIGHT` with name `Midnight`.

Notes:
- `NIGHT` remains in the local signal universe even when the live market provider does not support it.
- Existing localStorage values using the old `MID` symbol are migrated to `NIGHT` on load.
- Watchlist personalization still exists, but it no longer overrides the global top signal.
