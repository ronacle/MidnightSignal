'use client';

import { useMemo, useState } from 'react';
import { MARKET_FIXTURES } from '@/lib/default-state';

const AVAILABLE = ['BTC', 'ETH', 'ADA', 'SOL', 'XRP', 'DOGE', 'LINK', 'AVAX'];

export default function WatchlistPanel({ state, setState, onAssetOpen, assets = [] }) {
  const [newSymbol, setNewSymbol] = useState('LINK');
  const assetPool = useMemo(
    () => (assets?.length ? assets : MARKET_FIXTURES),
    [assets]
  );

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
    <aside className="panel stack watchlist-rail">
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

      <div className="stack compact-watchlist-stack">
        {state.watchlist.map((symbol) => {
          const asset = assetPool.find((item) => item.symbol === symbol) || {
            symbol,
            name: symbol,
            conviction: 52,
            sentiment: 'neutral',
            story: 'Custom watchlist asset waiting for live feed wiring.'
          };

          return (
            <div className="asset-row compact-watch-card" key={symbol}>
              <div className="compact-watch-header">
                <div>
                  <div className="asset-name">{asset.symbol}</div>
                  <div className="muted small">{asset.name}</div>
                </div>
                <div className={`sentiment compact-sentiment ${asset.sentiment}`}>{asset.sentiment}</div>
              </div>

              <div className="muted small compact-watch-conviction">
                {asset.signalScore ?? asset.conviction}% · score
              </div>

              <div className="compact-watch-actions">
                <button className="ghost-button compact-ghost" onClick={() => selectSymbol(symbol)}>
                  {state.selectedAsset === symbol ? 'Open' : 'View'}
                </button>
                <button className="ghost-button compact-ghost" onClick={() => removeSymbol(symbol)}>Remove</button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
