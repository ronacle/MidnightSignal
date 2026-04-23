'use client';

import { useMemo, useState } from 'react';
import { MARKET_FIXTURES } from '@/lib/default-state';



export default function WatchlistPanel({ state, setState, onAssetOpen, assets = [], user, status, syncing = false, lastSyncedAt = null, experience, compact = false, sticky = false }) {
  const [newSymbol, setNewSymbol] = useState('LINK');
  const assetPool = useMemo(() => (assets?.length ? assets : MARKET_FIXTURES), [assets]);

  function addSymbol() {
    if (state.watchlist.includes(newSymbol)) return;
    setState((previous) => ({ ...previous, watchlist: [...previous.watchlist, newSymbol], selectedAsset: newSymbol }));
  }

  function removeSymbol(symbol) {
    setState((previous) => {
      const nextWatchlist = previous.watchlist.filter((item) => item !== symbol);
      return {
        ...previous,
        watchlist: nextWatchlist,
        selectedAsset: previous.selectedAsset === symbol ? (nextWatchlist[0] || 'BTC') : previous.selectedAsset
      };
    });
  }

  function selectSymbol(symbol) {
    setState((previous) => ({ ...previous, selectedAsset: symbol, watchlist: previous.watchlist.includes(symbol) ? [symbol, ...previous.watchlist.filter((item) => item !== symbol)] : previous.watchlist }));
    const asset = assetPool.find((item) => item.symbol === symbol) || {
      symbol,
      name: symbol,
      conviction: 52,
      sentiment: 'neutral',
      story: 'Custom watchlist asset waiting for live feed wiring.'
    };
    onAssetOpen?.(asset);
  }

  return (
    <aside className={`panel stack watchlist-rail compact-watchlist-panel ${compact ? 'is-compact' : ''} ${sticky ? 'is-sticky-floating' : ''} ${state?.livePulseEnabled ? 'watchlist-live' : ''}`}>
      <div className="row space-between">
        <div>
          <h2 className="section-title compact-title">{compact ? 'Quick Watchlist' : 'Watchlist'}</h2>
          <div className="muted small">{user ? 'Your prioritized assets across sessions' : experience?.intent === 'alerts' ? 'Local alert candidates until you sign in' : 'Your prioritized assets on this device'}</div>
        </div>
        <span className="badge">{user ? (syncing ? 'Syncing…' : 'Cloud watchlist') : 'Local watchlist'}</span>
      </div>



      {!compact ? (
        <div className="muted small watchlist-auth-note">
          {user
            ? `Watchlist follows ${user.email} across devices. ${lastSyncedAt ? `Last cloud sync ${new Date(lastSyncedAt).toLocaleString()}.` : 'Waiting for first cloud sync.'}`
            : 'Watchlist is available on Free without an account. Sign in later to sync it across devices.'}
        </div>
      ) : null}

      {!compact ? (
      <div className="watchlist-add-row">
        <select className="select compact-select" value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)}>
          {assetPool.map((asset) => <option key={asset.symbol} value={asset.symbol}>{asset.symbol}</option>)}
        </select>
        <button className="button compact-action" onClick={addSymbol}>Add</button>
      </div>
      ) : null}

      <div className={`watchlist-rail-grid ${compact ? 'is-compact' : ''}`}>
        {state.watchlist.map((symbol) => {
          const asset = assetPool.find((item) => item.symbol === symbol) || {
            symbol,
            name: symbol,
            conviction: 52,
            sentiment: 'neutral',
            story: 'Custom watchlist asset waiting for live feed wiring.'
          };

          return (
            <div className={`watchlist-rail-card ${compact ? 'is-compact' : ''} ${state?.livePulseEnabled ? 'is-live' : ''} ${state?.selectedAsset === symbol ? 'is-focused' : ''}`} key={symbol}>
              <div className="watchlist-rail-top">
                <div className="watchlist-rail-identity">
                  <span className="watchlist-rail-symbol">{asset.symbol}</span>
                  <span className="watchlist-rail-confidence">{asset.signalScore ?? asset.conviction}%</span>
                </div>

                <div className="watchlist-rail-actions">
                  <button
                    type="button"
                    className="rail-icon-action"
                    aria-label={`View ${asset.symbol}`}
                    title={`View ${asset.symbol}`}
                    onClick={() => selectSymbol(symbol)}
                  >
                    👁
                  </button>
                  <button
                    type="button"
                    className="rail-icon-action destructive"
                    aria-label={`Remove ${asset.symbol}`}
                    title={`Remove ${asset.symbol}`}
                    onClick={() => removeSymbol(symbol)}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {!compact ? <div className="watchlist-rail-name" title={asset.name}>{asset.name}</div> : null}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
