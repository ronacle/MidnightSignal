'use client';

import { MARKET_FIXTURES } from '@/lib/default-state';
import { formatCompactNumber, formatPct, formatPrice, getConvictionTier } from '@/lib/utils';
import { deriveExperienceProfile } from '@/lib/mode-engine';

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

function getSummaryLine(asset, experience) {
  if (experience.userType === 'Beginner') return asset.story || asset.signalLabel || 'A calmer read of how this setup is behaving tonight.';
  if (experience.userType === 'Active trader') return asset.signalLabel || 'Fast posture read for tactical scanning.';
  return asset.signalLabel || 'Trend posture snapshot with less focus on short-term noise.';
}

export default function Top20Grid({ state, setState, onAssetOpen, assets = FALLBACK_ASSETS, collapsed = false, onToggleCollapse }) {
  const planTier = state?.planTier === 'pro' ? 'pro' : 'basic';
  const experience = deriveExperienceProfile(state);
  const pulseEnabled = Boolean(state?.livePulseEnabled);
  const visibleAssets = (assets?.length ? assets : FALLBACK_ASSETS).slice(0, experience.boardAssetCount);
  if (collapsed) {
    return (
      <div className={`panel stack premium-board-shell premium-board-shell-collapsed ${experience.boardCardStyle} is-collapsed`}>
        <div className="section-collapse-compact-shell">
          <div className="section-collapse-compact-top">
            <div className="section-collapse-compact-titleblock">
              <div className="eyebrow">{experience.marketEyebrow || 'Market scan'}</div>
              <h2 className="section-title">{experience.boardTitle}</h2>
            </div>
            <div className="section-collapse-actions">
              <span className="badge glow-badge">{experience.boardBadge}</span>
              {onToggleCollapse ? (<button type="button" className="ghost-button small section-collapse-toggle is-collapsed" onClick={onToggleCollapse} aria-expanded={false} aria-label="Expand market scan panel">Expand</button>) : null}
            </div>
          </div>
          <div className="section-collapse-summary muted small">
            {visibleAssets.length}-asset scan hidden. Expand to review the board, compare leaders, and open asset detail cards.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`panel stack premium-board-shell ${experience.boardCardStyle}`}>
      <div className="row space-between section-collapse-head"><div><h2 className="section-title">{experience.boardTitle}</h2><div className="muted small">{planTier === 'pro' ? `${experience.boardAssetCount}-asset scan with full breakdown access.` : `Free view stays useful: board scan, Tonight's Brief, watchlist, and alert setup are all included.`}</div><div className="muted small top20-mode-hint">{experience.boardHint}</div></div><div className="section-collapse-actions"><span className="badge glow-badge">{experience.boardBadge}</span>{onToggleCollapse ? (<button type="button" className="ghost-button small section-collapse-toggle is-open" onClick={onToggleCollapse} aria-expanded={true} aria-label="Collapse market scan panel">Collapse</button>) : null}</div></div>
      <div className={`top20-grid ${experience.boardColumnsClass}`}>
        {visibleAssets.map((asset, index) => (
          <button key={asset.symbol} type="button" className={`top20-card premium-top20-card ${experience.boardCardStyle} ${state.selectedAsset === asset.symbol ? 'active' : ''} ${pulseEnabled ? 'is-live-scan' : ''} ${index === 0 ? 'is-scan-lead' : ''}`} onClick={() => { setState((prev) => ({ ...prev, selectedAsset: asset.symbol, watchlist: prev.watchlist.includes(asset.symbol) ? [asset.symbol, ...prev.watchlist.filter((item) => item !== asset.symbol)] : prev.watchlist })); onAssetOpen?.(asset); }}>
            <div className="row space-between"><div><div className="asset-name">{asset.symbol}</div><div className="asset-meta">{asset.name}</div></div><div className={`sentiment ${asset.sentiment}`}>{asset.sentiment}</div></div>
            <div className="top20-price-row"><span className="top20-price">{formatPrice(asset.price)}</span><span className={`top20-change ${(asset.change24h || 0) >= 0 ? 'is-up' : 'is-down'}`}>{formatPct(asset.change24h || 0)}</span></div>
            <div className="muted small">{getSummaryLine(asset, experience)}</div>
            <div className="row wrap"><span className="badge">{asset.signalScore ?? asset.conviction}%</span><span className="badge">{getConvictionTier(asset.signalScore ?? asset.conviction)}</span><span className="badge">#{asset.rank ?? '—'}</span><span className="badge">Vol {formatCompactNumber(asset.volumeNum)}</span></div>
            <div className="top20-bottom-note muted small">{planTier === 'pro' ? 'Tap for full signal breakdown.' : experience.intent === 'alerts' ? 'Tap for watchlist context, detail, and future alert setup.' : 'Tap for brief + asset detail. Pro adds deeper validation and forward tracking.'}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
