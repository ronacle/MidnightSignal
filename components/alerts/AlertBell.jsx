'use client';

import { useMemo, useState } from 'react';

function timeAgo(value) {
  if (!value) return 'just now';
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'just now';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function normalizeEvent(event, index) {
  const triggeredAt = event?.triggeredAt || event?.createdAt || event?.queuedAt || null;
  return {
    id: event?.id || `alert-${index}`,
    level: event?.level || 'watch',
    title: event?.title || 'Signal alert',
    body: event?.body || event?.text || 'A signal changed in your current session.',
    symbol: event?.symbol || '',
    source: event?.source || 'system',
    triggeredAt,
  };
}

export default function AlertBell({ events = [], priorityAlerts = [], onOpenAlertCenter, onOpenSymbol }) {
  const [open, setOpen] = useState(false);
  const alertItems = useMemo(() => {
    const seen = new Set();
    return [...priorityAlerts, ...events]
      .map(normalizeEvent)
      .filter((event) => {
        if (seen.has(event.id)) return false;
        seen.add(event.id);
        return true;
      })
      .slice(0, 8);
  }, [events, priorityAlerts]);

  const count = alertItems.length;

  function openCenter() {
    setOpen(false);
    onOpenAlertCenter?.();
  }

  function openSymbol(symbol) {
    setOpen(false);
    if (symbol) onOpenSymbol?.(symbol);
  }

  return (
    <div className="alert-bell-wrap">
      <button
        type="button"
        className={`alert-bell-button ${count ? 'has-alerts' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={count ? `${count} signal alerts` : 'Open signal alerts'}
      >
        <span className="alert-bell-icon" aria-hidden="true">🔔</span>
        {count ? <span className="alert-bell-count">{count > 9 ? '9+' : count}</span> : null}
      </button>

      {open ? (
        <div className="alert-bell-popover card" role="dialog" aria-label="Signal alert feed">
          <div className="alert-bell-head">
            <div>
              <strong>Alerts</strong>
              <div className="muted small">Session-aware signal changes</div>
            </div>
            <button type="button" className="ghost-button small" onClick={openCenter}>Manage</button>
          </div>

          <div className="alert-bell-list">
            {alertItems.length ? alertItems.map((event) => (
              <button
                type="button"
                className={`alert-bell-item alert-bell-item--${event.level}`}
                key={event.id}
                onClick={() => event.symbol ? openSymbol(event.symbol) : openCenter()}
              >
                <span className="alert-bell-dot" aria-hidden="true" />
                <span className="alert-bell-copy">
                  <span className="alert-bell-title">{event.title}</span>
                  <span className="alert-bell-body">{event.body}</span>
                  <span className="alert-bell-meta">{event.symbol || 'Market'} · {timeAgo(event.triggeredAt)}</span>
                </span>
              </button>
            )) : (
              <div className="alert-bell-empty">
                No alert changes yet. The bell lights up when leadership, conviction, decisions, or triggers shift.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
