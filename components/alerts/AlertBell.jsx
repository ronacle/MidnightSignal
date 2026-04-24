'use client';

import { useMemo, useState } from 'react';
import { filterSignalStreamEvents, normalizeSignalStreamPreferences } from '@/lib/alert-engine';

const STREAM_LABELS = {
  lead_shift: 'Lead Shift',
  conviction_change: 'Conviction Change',
  decision_update: 'Decision Update',
  trigger_hit: 'Trigger Hit',
  market_tone: 'Market Tone',
  watchlist_move: 'Watchlist Move',
  custom_rule: 'Custom Rule',
  signal_event: 'Signal Event',
};

const STREAM_ICONS = {
  lead_shift: '↔',
  conviction_change: '⌁',
  decision_update: '✓',
  trigger_hit: '⚡',
  market_tone: '◌',
  watchlist_move: '↗',
  custom_rule: '◆',
  signal_event: '•',
};

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

function inferStreamType(event) {
  const sourceType = event?.streamType || event?.eventType || event?.kind;
  if (sourceType) return sourceType;
  const title = String(event?.title || '').toLowerCase();
  const id = String(event?.id || '').toLowerCase();
  if (id.startsWith('flip:') || title.includes('lead')) return 'lead_shift';
  if (id.startsWith('conviction:') || title.includes('conviction')) return 'conviction_change';
  if (id.startsWith('decision:') || title.includes('decision')) return 'decision_update';
  if (id.startsWith('regime:') || title.includes('tone')) return 'market_tone';
  if (id.startsWith('watch:') || title.includes('watchlist')) return 'watchlist_move';
  if (event?.source === 'configured') return 'custom_rule';
  return 'signal_event';
}

function normalizeEvent(event, index) {
  const triggeredAt = event?.triggeredAt || event?.createdAt || event?.queuedAt || null;
  const streamType = inferStreamType(event);
  return {
    id: event?.id || `stream-${index}`,
    level: event?.level || 'watch',
    streamType,
    streamLabel: STREAM_LABELS[streamType] || 'Signal Event',
    streamIcon: STREAM_ICONS[streamType] || '•',
    title: event?.title || 'Signal event',
    body: event?.body || event?.text || 'A meaningful signal changed in your current session.',
    symbol: event?.symbol || '',
    source: event?.source || 'system',
    triggeredAt,
  };
}

export default function AlertBell({ events = [], priorityAlerts = [], preferences = null, watchlist = [], onOpenAlertCenter, onOpenSymbol }) {
  const [open, setOpen] = useState(false);
  const streamPreferences = useMemo(() => normalizeSignalStreamPreferences(preferences), [preferences]);
  const streamItems = useMemo(() => {
    const seen = new Set();
    return filterSignalStreamEvents([...priorityAlerts, ...events], streamPreferences, { watchlist })
      .map(normalizeEvent)
      .filter((event) => {
        if (seen.has(event.id)) return false;
        seen.add(event.id);
        return true;
      })
      .slice(0, 8);
  }, [events, priorityAlerts, streamPreferences, watchlist]);

  const count = streamItems.length;
  const strongestLevel = streamItems.some((event) => event.level === 'critical')
    ? 'critical'
    : streamItems.some((event) => event.level === 'positive')
      ? 'positive'
      : streamItems.some((event) => event.level === 'warning')
        ? 'warning'
        : count
          ? 'watch'
          : 'idle';
  const streamLabel = count === 1 ? '1 signal shift' : `${count} signal shifts`;
  const preferenceLabel = streamPreferences.quietMode
    ? 'Quiet mode'
    : streamPreferences.minimumImportance === 'critical'
      ? 'Critical only'
      : streamPreferences.minimumImportance === 'important'
        ? 'Important+'
        : streamPreferences.watchlistOnly
          ? 'Watchlist only'
          : 'All signal events';

  function openCenter() {
    setOpen(false);
    onOpenAlertCenter?.();
  }

  function openSymbol(symbol) {
    setOpen(false);
    if (symbol) onOpenSymbol?.(symbol);
  }

  return (
    <div className="signal-stream-wrap">
      <button
        type="button"
        className={`signal-stream-button signal-stream-button--${strongestLevel} ${count ? 'has-stream' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={count ? `${streamLabel} in the signal stream` : 'Open signal stream'}
        title={count ? `Signal Stream · ${streamLabel}` : 'Signal Stream'}
      >
        <span className="signal-stream-orb" aria-hidden="true" />
        <span className="signal-stream-icon" aria-hidden="true">⌁</span>
        {count ? <span className="signal-stream-count">{count > 9 ? '9+' : count}</span> : null}
      </button>

      {open ? (
        <div className="signal-stream-popover card" role="dialog" aria-label="Signal Stream">
          <div className="signal-stream-head">
            <div>
              <strong>Signal Stream</strong>
              <div className="muted small">{preferenceLabel} · current session</div>
            </div>
            <button type="button" className="ghost-button small" onClick={openCenter}>Manage</button>
          </div>

          <div className="signal-stream-list">
            {streamItems.length ? streamItems.map((event) => (
              <button
                type="button"
                className={`signal-stream-item signal-stream-item--${event.level}`}
                key={event.id}
                onClick={() => event.symbol ? openSymbol(event.symbol) : openCenter()}
              >
                <span className="signal-stream-type-icon" aria-hidden="true">{event.streamIcon}</span>
                <span className="signal-stream-copy">
                  <span className="signal-stream-kicker">{event.streamLabel}</span>
                  <span className="signal-stream-title">{event.title}</span>
                  <span className="signal-stream-body">{event.body}</span>
                  <span className="signal-stream-meta">{event.symbol || 'Market'} · {timeAgo(event.triggeredAt)}</span>
                  {event.reason ? <span className="signal-stream-why">Why: {event.reason}</span> : null}
                </span>
              </button>
            )) : (
              <div className="signal-stream-empty">
                No signal shifts yet. The stream wakes up when leadership, conviction, decisions, or triggers change.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
