'use client';

import { formatTime } from '@/lib/utils';

export default function SinceLastVisit({ state, lastSyncedAt, onJump, onDismiss }) {
  if (!state) return null;

  return (
    <div className="since-strip">
      <div className="since-label">Since your last visit</div>

      <div className="since-content">
        <span className="since-main">
          {state.selectedAsset} • {state.strategy} • {state.timeframe}
        </span>
        <span className="since-chip">Watchlist: {state.watchlist.length}</span>
        <span className="since-chip">Viewed: {formatTime(state.lastViewedAt)}</span>
        <span className="since-chip">Sync: {formatTime(lastSyncedAt)}</span>
      </div>

      <div className="since-actions">
        <button type="button" className="since-action" onClick={onJump}>Top Signal</button>
        <button type="button" className="since-action" onClick={onDismiss}>Hide</button>
      </div>
    </div>
  );
}
