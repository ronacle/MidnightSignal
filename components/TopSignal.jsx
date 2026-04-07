'use client';

import { formatTime, getConvictionTier } from '@/lib/utils';

export default function TopSignal({ asset, mode, strategy, source, updatedAt, liveReady }) {
  if (!asset) return null;

  const sourceLabel = source === 'coingecko' ? 'Live data' : source === 'fallback' ? 'Fallback model' : 'Signal model';

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
          <span className="badge">{asset.conviction}% confidence</span>
          <span className="badge">{getConvictionTier(asset.conviction)}</span>
          <span className="badge">{mode} mode</span>
          <span className="badge">{strategy}</span>
        </div>
      </div>

      <div className="notice small">
        This signal is chosen automatically from incoming market data and stays separate from the asset you click into for details.
      </div>

      <div className="row">
        <div className="muted small">{liveReady ? `${sourceLabel} · updated ${formatTime(updatedAt)}` : 'Loading market signal…'}</div>
      </div>
    </div>
  );
}
