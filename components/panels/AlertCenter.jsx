'use client';

import { formatTime } from '@/lib/utils';

export default function AlertCenter({ open, onClose, alerts = [], onMarkRead, state }) {
  if (!open) return null;
  const beginner = (state?.mode || 'Beginner') === 'Beginner';

  return (
    <div className="drawer-root open" aria-hidden={false}>
      <button type="button" className="drawer-backdrop" aria-label="Close alert center" onClick={onClose} />
      <aside className="drawer drawer-right learning-drawer" role="dialog" aria-modal="true" aria-label="Alert Center">
        <div className="drawer-header">
          <div>
            <div className="eyebrow">Alert Center</div>
            <h2 className="section-title" style={{ marginTop: 6 }}>Meaningful changes only</h2>
          </div>
          <div className="row">
            <button type="button" className="ghost-button" onClick={onMarkRead}>Mark read</button>
            <button type="button" className="ghost-button" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="drawer-content stack">
          <div className="muted small">
            {beginner
              ? 'Alerts appear only when the top signal, posture, regime, score threshold, or validation picture changes in a meaningful way.'
              : 'Important signal, posture, regime, threshold, and validation changes only.'}
          </div>

          {alerts.length ? alerts.map((alert) => (
            <div key={alert.id} className={`list-item stack ${alert.read ? '' : 'alert-unread'}`}>
              <div className="row space-between">
                <div className="eyebrow">{alert.title}</div>
                <span className="badge">{alert.priority}</span>
              </div>
              <div className="muted">{alert.message}</div>
              <div className="muted small">{formatTime(alert.createdAt)}</div>
            </div>
          )) : (
            <div className="list-item stack">
              <div className="eyebrow">No alerts yet</div>
              <div className="muted">The alert center will populate when meaningful signal changes are detected.</div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
