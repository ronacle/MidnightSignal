'use client';

import { formatTime, getConvictionTier } from '@/lib/utils';

export default function TopSignal({ asset, state, marketSource, marketUpdatedAt, marketReady }) {
  if (!asset) return null;

  return (
    <div className="panel stack">
      <div className="row space-between">
        <h2 className="section-title">Tonight&apos;s Top Signal</h2>
        <span className={`sentiment ${asset.sentiment}`}>{asset.sentiment}</span>
      </div>

      <div className="list-item stack">
        <div>
          <div className="eyebrow">System-selected lead asset</div>
          <div className="value">{asset.symbol} · {asset.name}</div>
        </div>
        <div className="muted">{asset.story}</div>
        <div className="row">
          <span className="badge">{asset.signalScore ?? asset.conviction}% score</span>
          <span className="badge">{getConvictionTier(asset.signalScore ?? asset.conviction)}</span>
          <span className="badge">{state.mode} mode</span>
          <span className="badge">{state.strategy}</span>
        </div>
      </div>

      <div className="notice small">
        This signal is chosen automatically from the ranked factor model and stays separate from the asset you click for details.
      </div>

      <div className="row">
        <div className="muted small">
          {marketReady ? `Source: ${marketSource} · Updated ${formatTime(marketUpdatedAt)}` : 'Loading signal engine…'}
        </div>
      </div>
    </div>
  );
}
