'use client';

import { getConvictionTier, formatCompactNumber, formatPct, formatPrice } from '@/lib/utils';

function breakdownRows(asset, timeframe) {
  const conviction = asset?.conviction ?? 50;
  return [
    {
      label: `${timeframe} posture`,
      value: conviction >= 68 ? 'Aligned' : conviction >= 50 ? 'Mixed' : 'Weak',
      note: conviction >= 68 ? 'Momentum and structure are working together.' : conviction >= 50 ? 'Signal quality is improving but still uneven.' : 'Price structure needs stronger confirmation.'
    },
    {
      label: 'Trend quality',
      value: conviction >= 70 ? 'Strong' : conviction >= 55 ? 'Moderate' : 'Fragile',
      note: asset?.sentiment === 'bullish'
        ? 'Leaders are showing better follow-through than laggards.'
        : asset?.sentiment === 'bearish'
          ? 'Weak relative strength is limiting conviction.'
          : 'The setup is balanced and waiting for a clearer edge.'
    },
    {
      label: 'Decision context',
      value: getConvictionTier(conviction),
      note: conviction >= 70 ? 'Favors patience and trend-following behavior.' : conviction >= 55 ? 'Worth monitoring for confirmation.' : 'Treat as watch mode until stronger evidence appears.'
    }
  ];
}

function formatRelative(value) {
  if (!value) return 'Awaiting live refresh';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m ago`;
}

export default function AssetDetailSheet({ asset, open, onClose, timeframe, onToggleWatchlist, inWatchlist, onOpenLearning, onSetAlert, onShare }) {
  if (!asset) return null;

  const breakdown = breakdownRows(asset, timeframe);

  return (
    <div className={`sheet-root ${open ? 'open' : ''}`}>
      <button className="sheet-backdrop" aria-label="Close asset details" onClick={onClose} />
      <section className="sheet" aria-hidden={!open}>
        <div className="sheet-handle-wrap">
          <button className="sheet-handle" aria-label="Close" onClick={onClose} />
        </div>

        <div className="sheet-header">
          <div>
            <div className="eyebrow">Signal details</div>
            <h3 className="sheet-title">{asset.symbol} · {asset.name}</h3>
            <p className="sheet-subtitle">{asset.story}</p>
          </div>
          <div className="sheet-badges">
            <span className={`sentiment ${asset.sentiment}`}>{asset.sentiment}</span>
            <span className="badge">Conviction {asset.conviction}%</span>
            <span className="badge">Confidence {asset.confidenceScore ?? asset.conviction}%</span>
          </div>
        </div>

        <div className="sheet-grid">
          <div className="panel stack compact-panel">
            <div className="row space-between">
              <h4 className="section-title">Why this setup matters</h4>
              <span className="badge">{getConvictionTier(asset.conviction)}</span>
            </div>
            <div className="notice">This signal is best read as a posture cue, not a trade instruction.</div>
            <div className="row wrap">
              <span className="badge">{formatPrice(asset.price)}</span>
              <span className="badge">{formatPct(asset.change24h || 0)} 24h</span>
              <span className="badge">Vol {formatCompactNumber(asset.volumeNum)}</span>
              <span className="badge">Updated {formatRelative(asset.lastUpdated)}</span>
            </div>
            <div className="stack">
              {breakdown.map((item) => (
                <div key={item.label} className="list-item stack">
                  <div className="row space-between">
                    <strong>{item.label}</strong>
                    <span className="badge">{item.value}</span>
                  </div>
                  <div className="muted small">{item.note}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel stack compact-panel">
            <h4 className="section-title">What changed now</h4>
            <div className="list-item stack">
              <div className="row space-between">
                <strong>Posture</strong>
                <span className="badge">{asset.timeframeAgreement || 'Mixed agreement'}</span>
              </div>
              <div className="muted small">{asset.postureSummary || 'Balanced posture with mixed signal quality.'}</div>
            </div>
            <div className="list-item stack">
              <div className="row space-between">
                <strong>Momentum</strong>
                <span className="badge">{asset.momentumState || 'Stable'}</span>
              </div>
              <div className="muted small">{asset.signalDrivers?.[1] || 'Momentum is neither clearly accelerating nor clearly fading yet.'}</div>
            </div>
            <div className="list-item stack">
              <div className="row space-between">
                <strong>Watch next</strong>
                <span className="badge">{asset.volatilityState || 'Balanced'}</span>
              </div>
              <div className="muted small">{asset.watchNext || 'Wait for the next refresh to confirm the posture.'}</div>
            </div>
          </div>

          <div className="panel stack compact-panel">
            <h4 className="section-title">Quick actions</h4>
            <button className="button" onClick={() => onToggleWatchlist?.(asset.symbol)}>
              {inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
            </button>
            <button className="ghost-button" onClick={() => onSetAlert?.(asset)}>Set alert</button>
            <button className="ghost-button" onClick={() => onOpenLearning?.(asset)}>Open learning context</button>
            <button className="ghost-button" onClick={() => onShare?.(asset)}>Share this signal</button>

            <div className="list-item stack">
              <div className="row space-between">
                <strong>Timeframe focus</strong>
                <span className="badge">{timeframe}</span>
              </div>
              <div className="muted small">Use this view to compare the current posture with your active session settings.</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
