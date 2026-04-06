'use client';

import { MARKET_FIXTURES } from '@/lib/default-state';
import { formatTime, getConvictionTier } from '@/lib/utils';

export default function TopSignal({ state }) {
  const asset = MARKET_FIXTURES.find((item) => item.symbol === state.selectedAsset) || MARKET_FIXTURES[0];

  return (
    <div className="panel stack top-signal-panel">
      <div className="row space-between">
        <h2 className="section-title">Tonight&apos;s Top Signal</h2>
        <span className={`sentiment ${asset.sentiment}`}>Direction: {asset.sentiment}</span>
      </div>

      <div className="list-item stack spotlight-item">
        <div>
          <div className="eyebrow">Selected asset</div>
          <div className="value">{asset.symbol} · {asset.name}</div>
        </div>
        <div className="muted">{asset.story}</div>
        <div className="metric-grid">
          <div className="metric-card">
            <div className="eyebrow">Direction</div>
            <div className="metric-value capitalize">{asset.sentiment}</div>
          </div>
          <div className="metric-card">
            <div className="eyebrow">Conviction</div>
            <div className="metric-value">{asset.conviction}%</div>
            <div className="muted small">{getConvictionTier(asset.conviction)}</div>
          </div>
          <div className="metric-card">
            <div className="eyebrow">Mode</div>
            <div className="metric-value">{state.mode}</div>
            <div className="muted small">{state.strategy} · {state.timeframe}</div>
          </div>
        </div>
      </div>

      <div className="notice small pulse-note">
        Midnight Signal now separates posture from confidence: direction tells you the read, conviction tells you how strong that read is.
      </div>

      <div className="muted small">Last viewed: {formatTime(state.lastViewedAt)}</div>
    </div>
  );
}
