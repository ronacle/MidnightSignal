'use client';

import { useMemo, useState } from 'react';
import { MARKET_FIXTURES } from '@/lib/default-state';
import { formatPct, formatPrice } from '@/lib/utils';

const AVAILABLE = ['BTC', 'ETH', 'ADA', 'SOL', 'XRP', 'DOGE', 'LINK', 'AVAX'];

function getMomentumBadge(asset) {
  if (asset?.momentumState === 'Accelerating') return '↑ improving';
  if (asset?.momentumState === 'Cooling') return '↓ fading';
  if (asset?.momentumState === 'Mixed') return '• mixed';
  return '• steady';
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

  return (
    <aside className="panel stack watchlist-rail compact-watchlist-panel">
      <div className="row space-between">
        <div>
          <h2 className="section-title compact-title">Watchlist</h2>
          <div className="muted small">Favorites stay pinned before the broader board</div>
        </div>
        <span className="badge">Synced</span>
      </div>

      <div className="watchlist-add-row">
        <select className="select compact-select" value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)}>
          {AVAILABLE.map((symbol) => <option key={symbol}>{symbol}</option>)}
        </select>
        <button className="button compact-action" onClick={addSymbol}>Add</button>
      </div>

      <div className="watchlist-rail-grid">
        {state.watchlist.map((symbol) => {
          const asset = assetPool.find((item) => item.symbol === symbol) || {
            symbol,
            name: symbol,
            conviction: 52,
            sentiment: 'neutral',
            story: 'Custom watchlist asset waiting for live feed wiring.'
          };

          return (
            <div className="watchlist-rail-card" key={symbol}>
              <div className="watchlist-rail-top">
                <div className="watchlist-rail-identity">
                  <span className="watchlist-rail-symbol">{asset.symbol}</span>
                  <span className="watchlist-rail-confidence">{asset.confidenceScore ?? asset.signalScore ?? asset.conviction}%</span>
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
              <div className="muted small">{formatPrice(asset.price)} · <span className={(asset.change24h || 0) >= 0 ? 'is-up' : 'is-down'}>{formatPct(asset.change24h || 0)}</span></div>
              <div className="row wrap" style={{ marginTop: 8 }}>
                <span className="badge">{getMomentumBadge(asset)}</span>
                <span className="badge">{asset.timeframeAgreement || 'Mixed agreement'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
