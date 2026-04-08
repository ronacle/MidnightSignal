'use client';

import { MARKET_FIXTURES } from '@/lib/default-state';
import { formatCompactNumber, formatPct, formatPrice, getConvictionTier } from '@/lib/utils';

const FALLBACK_ASSETS = [
  ...MARKET_FIXTURES,
  { symbol: 'LINK', name: 'Chainlink', conviction: 62, sentiment: 'neutral', story: 'Quiet accumulation behavior with improving structure.' },
  { symbol: 'AVAX', name: 'Avalanche', conviction: 44, sentiment: 'bearish', story: 'Weak follow-through is keeping conviction lower.' },
  { symbol: 'DOGE', name: 'Dogecoin', conviction: 51, sentiment: 'neutral', story: 'Speculative energy is present, but posture is mixed.' },
  { symbol: 'SUI', name: 'Sui', conviction: 69, sentiment: 'bullish', story: 'Leadership tone is improving on recent momentum.' },
  { symbol: 'HBAR', name: 'Hedera', conviction: 48, sentiment: 'neutral', story: 'Setup is still looking for stronger agreement.' },
  { symbol: 'TON', name: 'Toncoin', conviction: 57, sentiment: 'bullish', story: 'Constructive structure with selective strength.' },
  { symbol: 'DOT', name: 'Polkadot', conviction: 46, sentiment: 'bearish', story: 'Needs stronger participation to improve posture.' },
  { symbol: 'NEAR', name: 'Near', conviction: 61, sentiment: 'bullish', story: 'Trend quality is improving with steadier participation.' },
  { symbol: 'APT', name: 'Aptos', conviction: 54, sentiment: 'neutral', story: 'Still in the middle zone between noise and trend.' },
  { symbol: 'XLM', name: 'Stellar', conviction: 42, sentiment: 'bearish', story: 'Relative strength remains soft.' },
  { symbol: 'INJ', name: 'Injective', conviction: 73, sentiment: 'bullish', story: 'Momentum and structure are aligning well.' },
  { symbol: 'ARB', name: 'Arbitrum', conviction: 58, sentiment: 'neutral', story: 'Constructive, but not yet decisive.' },
  { symbol: 'OP', name: 'Optimism', conviction: 55, sentiment: 'neutral', story: 'Moderate alignment with room for stronger confirmation.' },
  { symbol: 'ATOM', name: 'Cosmos', conviction: 49, sentiment: 'neutral', story: 'Balanced posture with limited edge.' },
  { symbol: 'SEI', name: 'Sei', conviction: 64, sentiment: 'bullish', story: 'Momentum is improving with better follow-through.' },
].slice(0, 20);

function deriveBoardSignal(asset) {
  const trend = Number(asset?.factors?.trend ?? asset?.timeframe?.tf1h ?? 50);
  const momentum = Number(asset?.factors?.momentum ?? asset?.timeframe?.mtfMomentum ?? 50);
  const delta = momentum - trend;
  if (delta >= 6 || ((asset?.change24h || 0) > 0 && momentum >= 60)) {
    return { icon: '↑', label: 'Improving' };
  }
  if (delta <= -6 || ((asset?.change24h || 0) < 0 && trend <= 45)) {
    return { icon: '↓', label: 'Weakening' };
  }
  return { icon: '•', label: 'Flat' };
}

export default function Top20Grid({ state, setState, onAssetOpen, assets = FALLBACK_ASSETS }) {
  const planTier = state?.planTier === 'pro' ? 'pro' : 'basic';

  return (
    <div className="panel stack premium-board-shell">
      <div className="row space-between">
        <div>
          <h2 className="section-title">Top 20</h2>
          <div className="muted small">{planTier === 'pro' ? 'Pro view active: board scan + full breakdown access.' : "Free view active: board scan, Tonight's Brief, watchlist, and alert setup remain available."}</div>
        </div>
        <span className="badge glow-badge">Ranked signal scan</span>
      </div>
      <div className="top20-grid">
        {assets.map((asset) => {
          const boardSignal = deriveBoardSignal(asset);
          const isFavorite = state?.watchlist?.includes(asset.symbol);
          return (
          <button
            key={asset.symbol}
            type="button"
            className={`top20-card premium-top20-card ${state.selectedAsset === asset.symbol ? 'active' : ''} ${isFavorite ? 'is-favorite' : ''}`}
            onClick={() => {
              setState((prev) => ({ ...prev, selectedAsset: asset.symbol }));
              onAssetOpen?.(asset);
            }}
          >
            <div className="row space-between">
              <div>
                <div className="asset-name">{asset.symbol}</div>
                <div className="asset-meta">{asset.name}</div>
              </div>
              <div className={`sentiment ${asset.sentiment}`}>{asset.sentiment}</div>
            </div>
            <div className="top20-price-row">
              <span className="top20-price">{formatPrice(asset.price)}</span>
              <span className={`top20-change ${(asset.change24h || 0) >= 0 ? 'is-up' : 'is-down'}`}>
                {formatPct(asset.change24h || 0)} 24h
              </span>
            </div>
            <div className="muted small">{asset.signalLabel || asset.story}</div>
            <div className="row wrap">
              <span className="badge">{asset.signalScore ?? asset.conviction}%</span>
              <span className="badge">{getConvictionTier(asset.signalScore ?? asset.conviction)}</span>
              <span className="badge">#{asset.rank ?? '—'}</span>
              <span className={`badge trend-badge trend-${boardSignal.label.toLowerCase()}`}>{boardSignal.icon} {boardSignal.label}</span>
              {isFavorite ? <span className="badge favorite-badge">★ Favorite</span> : null}
              <span className="badge">Vol {formatCompactNumber(asset.volumeNum)}</span>
            </div>
            <div className="top20-bottom-note muted small">{planTier === 'pro' ? 'Tap for full signal breakdown.' : 'Tap for brief + asset detail. Full validation stays in Pro.'}</div>
          </button>
        )})}
      </div>
    </div>
  );
}
