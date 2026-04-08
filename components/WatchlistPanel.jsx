'use client';

import { useMemo, useState } from 'react';
import { MARKET_FIXTURES } from '@/lib/default-state';

const AVAILABLE = ['BTC', 'ETH', 'ADA', 'SOL', 'XRP', 'DOGE', 'LINK', 'AVAX'];

function deriveWatchMomentum(asset) {
  const momentum = Number(asset?.factors?.momentum ?? asset?.timeframe?.mtfMomentum ?? 50);
  const trend = Number(asset?.factors?.trend ?? asset?.timeframe?.tf1h ?? 50);
  if (momentum - trend >= 6) return { icon: '↑', label: 'Improving' };
  if (trend - momentum >= 6) return { icon: '↓', label: 'Weakening' };
  return { icon: '•', label: 'Flat' };
}

export default function WatchlistPanel({ state, setState, onAssetOpen, assets = [] }) {
  const [newSymbol, setNewSymbol] = useState('LINK');
  const assetPool = useMemo(() => (assets?.length ? assets : MARKET_FIXTURES), [assets]);

  function addSymbol() {
    if (state.watchlist.includes(newSymbol)) return;
    setState((previous) => ({ ...previous, watchlist: [...previous.watchlist, newSymbol] }));
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

  const orderedWatchlist = useMemo(() => {
    return [...(state.watchlist || [])].sort((a, b) => {
      const assetA = assetPool.find((item) => item.symbol === a);
      const assetB = assetPool.find((item) => item.symbol === b);
      return Number(assetB?.signalScore ?? assetB?.conviction ?? 0) - Number(assetA?.signalScore ?? assetA?.conviction ?? 0);
    });
  }, [assetPool, state.watchlist]);

  return (
    <aside className="panel stack watchlist-rail compact-watchlist-panel">
      <div className="row space-between">
        <div>
          <h2 className="section-title compact-title">Watchlist</h2>
          <div className="muted small">Your prioritized assets</div>
        </div>
        <span className="badge">Pinned first</span>
      </div>

      <div className="watchlist-add-row">
        <select className="select compact-select" value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)}>
          {AVAILABLE.map((symbol) => <option key={symbol}>{symbol}</option>)}
        </select>
        <button className="button compact-action" onClick={addSymbol}>Add</button>
      </div>

      <div className="watchlist-rail-grid">
        {orderedWatchlist.map((symbol) => {
          const asset = assetPool.find((item) => item.symbol === symbol) || {
            symbol,
            name: symbol,
            conviction: 52,
            sentiment: 'neutral',
            story: 'Custom watchlist asset waiting for live feed wiring.'
          };
          const momentumRead = deriveWatchMomentum(asset);

          return (
            <div className="watchlist-rail-card" key={symbol}>
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

              <div className="watchlist-rail-name" title={asset.name}>{asset.name}</div>
              <div className="watchlist-rail-meta-row">
                <span className={`badge trend-badge trend-${momentumRead.label.toLowerCase()}`}>{momentumRead.icon} {momentumRead.label}</span>
                <span className={`badge ${(asset.change24h || 0) >= 0 ? 'is-up' : 'is-down'}`}>{asset.change24h >= 0 ? '+' : ''}{Number(asset.change24h || 0).toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
