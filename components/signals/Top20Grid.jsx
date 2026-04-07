'use client';

import { MARKET_FIXTURES } from '@/lib/default-state';
import { getConvictionTier } from '@/lib/utils';

export default function Top20Grid({ state, setState, onAssetOpen }) {
  const assets = [
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
  ].slice(0,20);

  return (
    <div className="panel stack">
      <div className="row space-between">
        <h2 className="section-title">Top 20</h2>
        <span className="badge">Scan the market</span>
      </div>
      <div className="top20-grid">
        {assets.map((asset) => (
          <button
            key={asset.symbol}
            type="button"
            className={`top20-card ${state.selectedAsset === asset.symbol ? 'active' : ''}`}
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
            <div className="muted small">{asset.story}</div>
            <div className="row">
              <span className="badge">{asset.conviction}%</span>
              <span className="badge">{getConvictionTier(asset.conviction)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
