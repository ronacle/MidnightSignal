'use client';

import { useMemo, useState } from 'react';
import { MARKET_FIXTURES } from '@/lib/default-state';
import { getConvictionTier } from '@/lib/utils';

const AVAILABLE = ['BTC', 'ETH', 'ADA', 'SOL', 'XRP', 'DOGE', 'LINK', 'AVAX'];

export default function WatchlistPanel({ state, setState, onAssetOpen }) {
  const [newSymbol, setNewSymbol] = useState('LINK');
  const assets = useMemo(() => MARKET_FIXTURES, []);

  function addSymbol() {
    if (state.watchlist.includes(newSymbol)) return;
    setState((previous) => ({ ...previous, watchlist: [...previous.watchlist, newSymbol] }));
  }

  function removeSymbol(symbol) {
    setState((previous) => ({
      ...previous,
      watchlist: previous.watchlist.filter((item) => item !== symbol),
      selectedAsset: previous.selectedAsset === symbol ? previous.watchlist[0] || 'BTC' : previous.selectedAsset
    }));
  }

  function selectSymbol(symbol) {
    setState((previous) => ({ ...previous, selectedAsset: symbol }));
    const asset = assets.find((item) => item.symbol === symbol) || {
      symbol,
      name: symbol,
      conviction: 52,
      sentiment: 'neutral',
      story: 'Custom watchlist asset waiting for live feed wiring.'
    };
    onAssetOpen?.(asset);
  }

  return (
    <aside className="panel stack watchlist-rail compact-watchlist-panel">
      <div className="row space-between">
        <div>
          <h2 className="section-title compact-title">Watchlist</h2>
          <div className="muted small">Your prioritized assets</div>
        </div>
        <span className="badge">Synced</span>
      </div>

      <div className="watchlist-add-row">
        <select className="select compact-select" value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)}>
          {AVAILABLE.map((symbol) => <option key={symbol}>{symbol}</option>)}
        </select>
        <button className="button compact-action" onClick={addSymbol}>Add</button>
      </div>

      <div className="watchlist-compact-grid">
        {state.watchlist.map((symbol) => {
          const asset = assets.find((item) => item.symbol === symbol) || {
            symbol,
            name: symbol,
            conviction: 52,
            sentiment: 'neutral',
            story: 'Custom watchlist asset waiting for live feed wiring.'
          };

          return (
            <div className="watchlist-compact-card" key={symbol}>
              <div className="watchlist-compact-main">
                <div className="watchlist-compact-symbol">{asset.symbol}</div>
                <div className="watchlist-compact-name">{asset.name}</div>
              </div>

              <div className="watchlist-compact-meta">
                <span className="watchlist-meta-pill">{asset.conviction}%</span>
                <span className="watchlist-meta-pill">{getConvictionTier(asset.conviction)}</span>
              </div>

              <div className="watchlist-compact-actions">
                <button
                  type="button"
                  className="icon-action"
                  aria-label={`View ${asset.symbol}`}
                  title={`View ${asset.symbol}`}
                  onClick={() => selectSymbol(symbol)}
                >
                  👁
                </button>
                <button
                  type="button"
                  className="icon-action destructive"
                  aria-label={`Remove ${asset.symbol}`}
                  title={`Remove ${asset.symbol}`}
                  onClick={() => removeSymbol(symbol)}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
