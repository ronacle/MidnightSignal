'use client';

import { useMemo, useState } from 'react';
import { MARKET_FIXTURES } from '@/lib/default-state';
import { getConvictionTier } from '@/lib/utils';

const AVAILABLE = ['BTC', 'ETH', 'ADA', 'SOL', 'XRP', 'DOGE', 'LINK', 'AVAX'];

export default function WatchlistPanel({ state, setState }) {
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
  }

  return (
    <div className="panel stack">
      <div className="row space-between">
        <h2 className="section-title">Watchlist</h2>
        <span className="badge">Synced with your account</span>
      </div>

      <div className="row">
        <select className="select" value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)}>
          {AVAILABLE.map((symbol) => <option key={symbol}>{symbol}</option>)}
        </select>
        <button className="button" onClick={addSymbol}>Add asset</button>
      </div>

      <div className="stack">
        {state.watchlist.map((symbol) => {
          const asset = assets.find((item) => item.symbol === symbol) || {
            symbol,
            name: symbol,
            conviction: 52,
            sentiment: 'neutral',
            story: 'Custom watchlist asset waiting for live feed wiring.'
          };

          return (
            <div className="asset-row" key={symbol}>
              <div>
                <div className="asset-name">{asset.symbol} · {asset.name}</div>
                <div className="asset-meta">{asset.story}</div>
              </div>
              <div className={`sentiment ${asset.sentiment}`}>{asset.sentiment}</div>
              <div className="row">
                <button className="ghost-button" onClick={() => selectSymbol(symbol)}>{state.selectedAsset === symbol ? 'Selected' : 'View'}</button>
                <button className="ghost-button" onClick={() => removeSymbol(symbol)}>Remove</button>
              </div>
              <div className="muted small">{asset.conviction}% · {getConvictionTier(asset.conviction)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
