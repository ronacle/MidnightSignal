'use client';

import { formatTime } from '@/lib/utils';

function getReturnSignal(lastViewedAt) {
  if (!lastViewedAt) return 'First tracked return';
  const diffMs = Date.now() - new Date(lastViewedAt).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'Welcome back';
  const mins = Math.round(diffMs / 60000);
  if (mins < 20) return 'Back in-session';
  if (mins < 180) return 'Fresh check-in';
  if (mins < 1440) return 'New session';
  return 'New day, new read';
}

export default function SinceLastVisit({ state, lastSyncedAt, onJump, onDismiss }) {
  if (!state) return null;

  return (
    <div className="since-strip">
      <div className="since-label">Since your last visit</div>

      <div className="since-content">
        <span className="since-main">
          {getReturnSignal(state.lastViewedAt)} · {state.selectedAsset} · {state.strategy} · {state.timeframe}
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
