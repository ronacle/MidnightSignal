'use client';

import { MARKET_FIXTURES } from '@/lib/default-state';
import { formatTime, getConvictionTier } from '@/lib/utils';

export default function TopSignal({ state }) {
  const asset = MARKET_FIXTURES.find((item) => item.symbol === state.selectedAsset) || MARKET_FIXTURES[0];

  return (
    <div className="panel stack">
      <div className="row space-between">
        <h2 className="section-title">Tonight&apos;s Top Signal</h2>
        <span className={`sentiment ${asset.sentiment}`}>Direction · {asset.sentiment}</span>
      </div>

      <div className="list-item stack">
        <div className="signal-header">
          <div>
            <div className="eyebrow">Selected asset</div>
            <div className="value top-value">{asset.symbol} · {asset.name}</div>
          </div>
          <div className="conviction-block">
            <div className="eyebrow">Conviction</div>
            <div className="value conviction-value">{asset.conviction}%</div>
          </div>
        </div>
        <div className="muted">{asset.story}</div>
        <div className="row">
          <span className="badge">{getConvictionTier(asset.conviction)}</span>
          <span className="badge">{state.mode} mode</span>
          <span className="badge">{state.strategy}</span>
          <span className="badge">{state.timeframe}</span>
        </div>
      </div>

      <div className="notice small">
        The signal is the lead story. Direction tells you posture. Conviction tells you how aligned the setup is. Then use the brief and watchlist for context.
      </div>

      <div className="muted small">Last viewed: {formatTime(state.lastViewedAt)}</div>
    </div>
  );
}
