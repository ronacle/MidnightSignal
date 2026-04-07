'use client';

import { MARKET_FIXTURES } from '@/lib/default-state';
import { formatTime, getConvictionTier } from '@/lib/utils';

export default function TopSignal({ state }) {
  const asset = MARKET_FIXTURES.find((item) => item.symbol === state.selectedAsset) || MARKET_FIXTURES[0];

  return (
    <div className="panel stack">
      <div className="row space-between">
        <h2 className="section-title">Tonight&apos;s Top Signal</h2>
        <span className={`sentiment ${asset.sentiment}`}>{asset.sentiment}</span>
      </div>

      <div className="list-item stack">
        <div>
          <div className="eyebrow">Selected asset</div>
          <div className="value">{asset.symbol} · {asset.name}</div>
        </div>
        <div className="muted">{asset.story}</div>
        <div className="row">
          <span className="badge">{asset.conviction}% confidence</span>
          <span className="badge">{getConvictionTier(asset.conviction)}</span>
          <span className="badge">{state.mode} mode</span>
          <span className="badge">{state.strategy}</span>
        </div>
      </div>

      <div className="notice small">
        Cross-device note: your selected asset, mode, strategy, timeframe, watchlist, and disclaimer acceptance stay in sync when you sign in on another device.
      </div>

      <div className="muted small">Last viewed: {formatTime(state.lastViewedAt)}</div>
    </div>
  );
}
