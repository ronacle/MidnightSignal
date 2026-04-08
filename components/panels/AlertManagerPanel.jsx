'use client';

import { useEffect, useMemo, useState } from 'react';

const DEFAULT_DRAFT = {
  symbol: '',
  type: 'conviction_above',
  threshold: '70'
};

function makeId() {
  return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createDraftFromAsset(asset) {
  if (!asset) return DEFAULT_DRAFT;
  return {
    symbol: asset.symbol,
    type: 'conviction_above',
    threshold: String(Math.max(55, Math.min(90, Math.round((asset.conviction || 50) + 5))))
  };
}

function describeAlert(alert) {
  if (alert.type === 'conviction_above') return `Conviction crosses above ${alert.threshold}%`;
  if (alert.type === 'conviction_below') return `Conviction falls below ${alert.threshold}%`;
  if (alert.type === 'sentiment_bullish') return 'Signal turns bullish';
  if (alert.type === 'sentiment_bearish') return 'Signal turns bearish';
  return 'Custom alert';
}

function formatTimestamp(value) {
  if (!value) return 'Not sent yet';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return 'Not sent yet';
  }
}

export default function AlertManagerPanel({ state, setState, alertAsset, onConsumeAlertAsset }) {
  const [draft, setDraft] = useState(DEFAULT_DRAFT);
  const [editingId, setEditingId] = useState(null);
  const [sendStatus, setSendStatus] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const alerts = state.alerts || [];
  const recentEvents = state.recentAlertEvents || [];

  useEffect(() => {
    if (!alertAsset) return;
    setDraft(createDraftFromAsset(alertAsset));
    setEditingId(null);
  }, [alertAsset]);

  const activeCount = useMemo(() => alerts.filter((alert) => !alert.paused).length, [alerts]);

  function updateDraft(key, value) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }

  function updateStateField(key, value) {
    setState((previous) => ({ ...previous, [key]: value }));
  }

  function resetComposer() {
    setDraft(DEFAULT_DRAFT);
    setEditingId(null);
    onConsumeAlertAsset?.();
  }

  function saveAlert() {
    if (!draft.symbol) return;

    const nextAlert = {
      id: editingId || makeId(),
      symbol: draft.symbol.trim().toUpperCase(),
      type: draft.type,
      threshold: ['sentiment_bullish', 'sentiment_bearish'].includes(draft.type) ? null : Number(draft.threshold || 0),
      paused: false,
      updatedAt: new Date().toISOString()
    };

    setState((previous) => {
      const current = previous.alerts || [];
      const alerts = editingId
        ? current.map((item) => (item.id === editingId ? { ...item, ...nextAlert } : item))
        : [nextAlert, ...current];
      return {
        ...previous,
        alerts
      };
    });

    resetComposer();
  }

  function editAlert(alert) {
    setEditingId(alert.id);
    setDraft({
      symbol: alert.symbol,
      type: alert.type,
      threshold: alert.threshold == null ? '70' : String(alert.threshold)
    });
  }

  function removeAlert(id) {
    setState((previous) => ({
      ...previous,
      alerts: (previous.alerts || []).filter((item) => item.id !== id)
    }));
    if (editingId === id) resetComposer();
  }

  function togglePaused(id) {
    setState((previous) => ({
      ...previous,
      alerts: (previous.alerts || []).map((item) => item.id === id ? { ...item, paused: !item.paused, updatedAt: new Date().toISOString() } : item)
    }));
  }

  function clearRecentEvents() {
    updateStateField('recentAlertEvents', []);
  }

  async function sendTestEmail() {
    if (!state.alertDeliveryEmail) {
      setSendStatus('Enter a delivery email first.');
      return;
    }

    setSendingTest(true);
    setSendStatus('Sending test alert...');
    try {
      const response = await fetch('/api/alerts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test: true,
          email: state.alertDeliveryEmail,
          digestMode: state.alertDigestMode || 'instant',
          alerts: [{
            symbol: 'TEST',
            posture: 'Delivery path check',
            confidence: 100,
            text: 'This is a Midnight Signal test email from v11.64.'
          }]
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || 'Unable to send test alert.');
      }
      const status = data?.mode === 'mock'
        ? 'Email route responded in mock mode. Add RESEND_API_KEY and ALERTS_FROM_EMAIL for live delivery.'
        : 'Test alert sent.';
      setSendStatus(status);
      setState((previous) => ({
        ...previous,
        alertLastDeliveryAt: data?.sentAt || new Date().toISOString(),
        alertLastDeliveryStatus: status,
      }));
    } catch (error) {
      const message = error?.message || 'Unable to send test alert.';
      setSendStatus(message);
      setState((previous) => ({ ...previous, alertLastDeliveryStatus: message }));
    } finally {
      setSendingTest(false);
    }
  }

  return (
    <div className="panel stack compact-panel">
      <div className="row space-between">
        <div>
          <h3 className="section-title">Alert Engine</h3>
          <div className="muted small">Crossing-based triggers with cooldown control and optional email delivery.</div>
        </div>
        <span className="badge">{activeCount} active</span>
      </div>

      {alertAsset ? (
        <div className="notice">
          Prefilled from <strong>{alertAsset.symbol}</strong> · {alertAsset.name}
        </div>
      ) : null}

      <div className="stack">
        <div className="controls">
          <div className="field">
            <label>Asset</label>
            <input className="input" value={draft.symbol} onChange={(e) => updateDraft('symbol', e.target.value.toUpperCase())} placeholder="BTC" />
          </div>

          <div className="field">
            <label>Condition</label>
            <select className="select" value={draft.type} onChange={(e) => updateDraft('type', e.target.value)}>
              <option value="conviction_above">Crosses above conviction</option>
              <option value="conviction_below">Falls below conviction</option>
              <option value="sentiment_bullish">Turns bullish</option>
              <option value="sentiment_bearish">Turns bearish</option>
            </select>
          </div>
        </div>

        {!['sentiment_bullish', 'sentiment_bearish'].includes(draft.type) ? (
          <div className="field">
            <label>Threshold</label>
            <input className="input" type="number" min="1" max="100" value={draft.threshold} onChange={(e) => updateDraft('threshold', e.target.value)} />
          </div>
        ) : null}

        <div className="row">
          <button className="button" type="button" disabled={!draft.symbol} onClick={saveAlert}>
            {editingId ? 'Save changes' : 'Create alert'}
          </button>
          <button className="ghost-button" type="button" onClick={resetComposer}>
            {editingId || alertAsset ? 'Clear' : 'Reset'}
          </button>
        </div>
      </div>

      <div className="stack">
        <div className="row space-between">
          <strong>Delivery</strong>
          <span className="badge">Optional</span>
        </div>

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={Boolean(state.alertDeliveryEnabled)}
            onChange={(e) => updateStateField('alertDeliveryEnabled', e.target.checked)}
          />
          <div>
            <div className="toggle-title">Email alert delivery</div>
            <div className="muted small">When enabled, fired alerts will also post to the email route.</div>
          </div>
        </label>

        <div className="controls">
          <div className="field">
            <label>Delivery email</label>
            <input
              className="input"
              type="email"
              value={state.alertDeliveryEmail || ''}
              onChange={(e) => updateStateField('alertDeliveryEmail', e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="field">
            <label>Cooldown</label>
            <select
              className="select"
              value={state.alertCooldownMinutes || '30'}
              onChange={(e) => updateStateField('alertCooldownMinutes', e.target.value)}
            >
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="60">1 hour</option>
              <option value="240">4 hours</option>
            </select>
          </div>
        </div>

        <div className="controls">
          <div className="field">
            <label>Delivery mode</label>
            <select
              className="select"
              value={state.alertDigestMode || 'instant'}
              onChange={(e) => updateStateField('alertDigestMode', e.target.value)}
            >
              <option value="instant">Instant alerts</option>
              <option value="digest">Digest mode</option>
            </select>
          </div>

          <div className="field">
            <label>Delivery scope</label>
            <select
              className="select"
              value={state.alertDeliveryScope || 'watchlist'}
              onChange={(e) => updateStateField('alertDeliveryScope', e.target.value)}
            >
              <option value="watchlist">Watchlist priority only</option>
              <option value="all">All meaningful alerts</option>
            </select>
          </div>

          <div className="field">
            <label>Digest cadence</label>
            <select
              className="select"
              value={state.alertDigestIntervalMinutes || '240'}
              onChange={(e) => updateStateField('alertDigestIntervalMinutes', e.target.value)}
              disabled={(state.alertDigestMode || 'instant') !== 'digest'}
            >
              <option value="60">Hourly</option>
              <option value="240">Every 4 hours</option>
              <option value="720">Twice daily</option>
              <option value="1440">Daily</option>
            </select>
          </div>
        </div>

        <div className="row">
          <button className="ghost-button" type="button" disabled={sendingTest || !state.alertDeliveryEmail} onClick={sendTestEmail}>
            {sendingTest ? 'Sending…' : 'Send test alert'}
          </button>
        </div>

        {sendStatus ? <div className="muted small">{sendStatus}</div> : null}
        {state.alertLastDeliveryStatus ? <div className="muted small">Last delivery status: {state.alertLastDeliveryStatus}</div> : null}
        <div className="muted small">Last delivery: {formatTimestamp(state.alertLastDeliveryAt)}</div>
      </div>

      <div className="stack">
        <div className="row space-between">
          <strong>Active Alerts</strong>
          <span className="badge">Manage / remove</span>
        </div>

        {alerts.length ? alerts.map((alert) => (
          <div key={alert.id} className="list-item stack">
            <div className="row space-between">
              <div>
                <strong>{alert.symbol}</strong>
                <div className="muted small">{describeAlert(alert)}</div>
              </div>
              <span className="badge">{alert.paused ? 'Paused' : 'Active'}</span>
            </div>
            <div className="row">
              <button className="ghost-button" type="button" onClick={() => editAlert(alert)}>Edit</button>
              <button className="ghost-button" type="button" onClick={() => togglePaused(alert.id)}>{alert.paused ? 'Resume' : 'Pause'}</button>
              <button className="ghost-button destructive" type="button" onClick={() => removeAlert(alert.id)}>Delete</button>
            </div>
          </div>
        )) : (
          <div className="list-item muted small">No alerts yet. Open an asset and tap <strong>Set alert</strong> to prefill one here.</div>
        )}
      </div>

      <div className="stack">
        <div className="row space-between">
          <strong>Recent Email Deliveries</strong>
          <span className="badge">{(state.recentEmailDeliveries || []).length} sent</span>
        </div>

        {(state.recentEmailDeliveries || []).length ? (state.recentEmailDeliveries || []).slice(0, 5).map((event) => (
          <div key={event.id} className="list-item stack">
            <div className="row space-between">
              <strong>{event.symbol || 'Market'}</strong>
              <span className="badge">{event.channel === 'mock' ? 'Mock route' : 'Email sent'}</span>
            </div>
            <div className="muted small">{event.body || event.title}</div>
            <div className="muted small">{formatTimestamp(event.sentAt)}</div>
          </div>
        )) : (
          <div className="list-item muted small">No email deliveries yet. Once alerts fire, sent emails will show here so you can verify what went out.</div>
        )}
      </div>


      <div className="stack">
        <div className="row space-between">
          <strong>Recent Triggers</strong>
          <button className="ghost-button small" type="button" onClick={clearRecentEvents}>Clear</button>
        </div>

        {recentEvents.length ? recentEvents.slice(0, 5).map((event) => (
          <div key={event.id} className="list-item stack">
            <div className="row space-between">
              <strong>{event.symbol || 'Market'}</strong>
              <span className="badge">{event.source === 'configured' ? 'Rule' : 'System'}</span>
            </div>
            <div className="muted small">{event.body || event.text}</div>
            <div className="muted small">{formatTimestamp(event.triggeredAt || event.queuedAt)}</div>
          </div>
        )) : (
          <div className="list-item muted small">No alerts have fired on this device yet.</div>
        )}
      </div>
    </div>
  );
}
