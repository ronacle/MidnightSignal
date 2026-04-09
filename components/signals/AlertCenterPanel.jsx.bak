'use client';

import { formatTime } from '@/lib/utils';

function getLevelLabel(alert) {
  if (alert?.isWatchlist) return 'Watchlist priority';
  if (alert?.level === 'critical') return 'Critical';
  if (alert?.level === 'positive') return 'Positive';
  if (alert?.level === 'warning') return 'Caution';
  return 'Watch';
}

export default function AlertCenterPanel({ alerts = [], newCount = 0, lastVisitLabel = '', onOpenAsset, onDismissAll }) {
  return (
    <section className="alert-center-shell card" aria-label="Alert center">
      <div className="row space-between alert-center-head">
        <div>
          <div className="eyebrow">Alert center</div>
          <h2 className="section-title">Important signal changes</h2>
          <div className="muted small">Latest signal shifts, with watchlist names pushed to the front.</div>
        </div>
        <div className="row wrap">
          <span className="badge glow-badge">{newCount} new since {lastVisitLabel}</span>
          {alerts.length ? <span className="badge">Latest {alerts.length}</span> : null}
        </div>
      </div>

      {alerts.length ? (
        <div className="alert-center-list">
          {alerts.map((alert) => (
            <div className={`alert-center-item alert-center-item--${alert.level || 'watch'}`} key={alert.id}>
              <div className="alert-center-copy">
                <div className="row wrap alert-center-meta-row">
                  <span className="badge">{getLevelLabel(alert)}</span>
                  {alert?.symbol ? <span className="badge">{alert.symbol}</span> : null}
                  {alert?.confidence != null ? <span className="badge">{alert.confidence}%</span> : null}
                  {alert?.triggeredAt ? <span className="muted small">{formatTime(alert.triggeredAt)}</span> : null}
                </div>
                <div className="alert-center-title">{alert.title}</div>
                <div className="alert-center-body">{alert.body || alert.text}</div>
              </div>
              {alert?.symbol ? (
                <button type="button" className="ghost-button small" onClick={() => onOpenAsset?.(alert.symbol)}>
                  Open asset
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="muted small">No meaningful signal changes yet. Once assets flip, strengthen, or weaken enough, they will show up here.</div>
      )}

      {alerts.length ? (
        <div className="row">
          <button type="button" className="ghost-button small" onClick={onDismissAll}>Clear alert center</button>
        </div>
      ) : null}
    </section>
  );
}
