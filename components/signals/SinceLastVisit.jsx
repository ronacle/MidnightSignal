'use client';

import { formatTime } from '@/lib/utils';

export default function SinceLastVisit({ state, lastSyncedAt }) {
  return (
    <div className="panel stack">
      <div className="row space-between">
        <h2 className="section-title">Since your last visit</h2>
        <span className="badge">{state.mode}</span>
      </div>
      <div className="stack">
        <div className="list-item small muted">• Selected asset: {state.selectedAsset}</div>
        <div className="list-item small muted">• Strategy: {state.strategy}</div>
        <div className="list-item small muted">• Timeframe: {state.timeframe}</div>
        <div className="list-item small muted">• Watchlist count: {state.watchlist.length}</div>
        <div className="list-item small muted">• Last viewed: {formatTime(state.lastViewedAt)}</div>
        <div className="list-item small muted">• Last sync: {formatTime(lastSyncedAt)}</div>
      </div>
    </div>
  );
}
