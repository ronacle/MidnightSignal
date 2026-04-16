'use client';

import { useMemo, useState } from 'react';

function formatTimestamp(value) {
  if (!value) return 'Waiting for first trigger';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return 'Waiting for first trigger';
  }
}

function describeRule(alert) {
  if (!alert) return 'Alert rule';
  if (alert.type === 'conviction_above') return `${alert.symbol} above ${alert.threshold}% conviction`;
  if (alert.type === 'conviction_below') return `${alert.symbol} below ${alert.threshold}% conviction`;
  if (alert.type === 'sentiment_bullish') return `${alert.symbol} turns bullish`;
  if (alert.type === 'sentiment_bearish') return `${alert.symbol} turns bearish`;
  return `${alert.symbol} alert`;
}

function makeQuickAlert(symbol, type = 'conviction_above', threshold = 70, direction = 'both', timeframe = '15M') {
  return {
    id: `quick-${symbol}-${type}-${direction}-${timeframe}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    symbol,
    type,
    threshold: ['sentiment_bullish', 'sentiment_bearish'].includes(type) ? null : threshold,
    direction,
    timeframe,
    paused: false,
    updatedAt: new Date().toISOString(),
  };
}

const DIRECTION_TYPES = {
  bullish: 'sentiment_bullish',
  bearish: 'sentiment_bearish',
};

export default function AlertCenterScaffold({
  state,
  setState,
  experience,
  topSignal,
  watchlistHighlights = [],
  onOpenControls,
  onOpenAsset,
}) {
  const alerts = Array.isArray(state?.alerts) ? state.alerts : [];
  const watchlist = Array.isArray(state?.watchlist) ? state.watchlist : [];
  const recentEvents = Array.isArray(state?.recentAlertEvents) ? state.recentAlertEvents : [];
  const activeAlerts = alerts.filter((item) => !item.paused);
  const starterSymbols = Array.from(new Set([
    topSignal?.symbol,
    ...watchlist.slice(0, 5),
    ...watchlistHighlights.map((item) => item?.symbol).filter(Boolean),
  ].filter(Boolean))).slice(0, 6);

  const [selectedSymbol, setSelectedSymbol] = useState(starterSymbols[0] || watchlist[0] || topSignal?.symbol || 'BTC');
  const [threshold, setThreshold] = useState(String(state?.alertCenterThreshold || 70));
  const [direction, setDirection] = useState(state?.alertCenterDirection || 'both');
  const [timeframe, setTimeframe] = useState(state?.alertCenterTimeframe || state?.timeframe || '15M');

  const alertSummary = useMemo(() => {
    const focused = activeAlerts.filter((item) => item.symbol === selectedSymbol);
    return {
      focusedCount: focused.length,
      totalCount: activeAlerts.length,
      recentCount: recentEvents.length,
    };
  }, [activeAlerts, recentEvents, selectedSymbol]);

  function saveStarterPack() {
    const existingKeys = new Set(alerts.map((item) => `${item.symbol}:${item.type}:${item.threshold ?? 'na'}:${item.timeframe || 'na'}`));
    const starterAlerts = starterSymbols.flatMap((symbol, index) => {
      const quickRules = [
        makeQuickAlert(symbol, 'conviction_above', index === 0 ? 72 : 68, 'both', state?.timeframe || '15M'),
        makeQuickAlert(symbol, 'sentiment_bullish', null, 'bullish', state?.timeframe || '15M'),
      ];
      return quickRules.filter((item) => !existingKeys.has(`${item.symbol}:${item.type}:${item.threshold ?? 'na'}:${item.timeframe || 'na'}`));
    });

    setState((previous) => ({
      ...previous,
      alerts: [...starterAlerts, ...(previous.alerts || [])],
      alertDeliveryEnabled: previous.alertDeliveryEnabled || false,
      dashboardFocus: 'watchlist',
      intent: 'alerts',
      onboardingGoal: 'alerts',
    }));
  }

  function seedDeliveryMode(mode) {
    setState((previous) => ({
      ...previous,
      intent: 'alerts',
      onboardingGoal: 'alerts',
      alertDigestMode: mode,
      dashboardFocus: 'watchlist',
      alertCooldownMinutes: previous.alertCooldownMinutes || '30',
    }));
  }

  function createRule() {
    const safeThreshold = Math.max(35, Math.min(95, Number(threshold || 70)));
    const nextAlerts = [];
    nextAlerts.push(makeQuickAlert(selectedSymbol, 'conviction_above', safeThreshold, direction, timeframe));
    if (direction !== 'both') {
      nextAlerts.push(makeQuickAlert(selectedSymbol, DIRECTION_TYPES[direction], null, direction, timeframe));
    }

    setState((previous) => ({
      ...previous,
      alerts: [...nextAlerts, ...(previous.alerts || [])],
      alertCenterThreshold: String(safeThreshold),
      alertCenterDirection: direction,
      alertCenterTimeframe: timeframe,
      dashboardFocus: 'watchlist',
      intent: 'alerts',
      onboardingGoal: 'alerts',
    }));
  }

  function togglePause(alertId) {
    setState((previous) => ({
      ...previous,
      alerts: (previous.alerts || []).map((item) => item.id === alertId ? { ...item, paused: !item.paused, updatedAt: new Date().toISOString() } : item),
    }));
  }

  function removeRule(alertId) {
    setState((previous) => ({
      ...previous,
      alerts: (previous.alerts || []).filter((item) => item.id !== alertId),
    }));
  }

  const focusedRules = alerts.filter((item) => item.symbol === selectedSymbol).slice(0, 6);

  return (
    <section className={`alert-center-shell card ${experience?.modeClass || ''} ${experience?.intentClass || ''}`} aria-label="Alert center">
      <div className="alert-center-head">
        <div>
          <div className="eyebrow">Alert center</div>
          <h2 className="section-title">Stay informed without babysitting the board</h2>
          <p className="muted small alert-center-copy">
            Build alert rules from the names you care about, choose how Midnight Signal should notify you, and keep a running view of what fired most recently.
          </p>
        </div>
        <div className="alert-center-summary">
          <span className="badge">{activeAlerts.length} active</span>
          <span className="badge">{watchlist.length} watched</span>
          <span className="badge">{state?.alertDigestMode === 'digest' ? 'Digest mode' : 'Instant mode'}</span>
        </div>
      </div>

      <div className="alert-center-grid">
        <div className="alert-center-card">
          <div className="alert-center-card-top">
            <div>
              <div className="alert-center-card-title">Alert setup builder</div>
              <div className="muted small">Create rules directly from your watchlist instead of leaving the dashboard.</div>
            </div>
            <span className="badge">Integrated</span>
          </div>

          <div className="alert-center-pill-row">
            {starterSymbols.length ? starterSymbols.map((symbol) => (
              <button key={symbol} type="button" className={`alert-symbol-pill ${selectedSymbol === symbol ? 'is-active' : ''}`} onClick={() => setSelectedSymbol(symbol)}>
                {symbol}
              </button>
            )) : <div className="muted small">No watchlist assets yet. Add favorites from the board to seed your alert setup.</div>}
          </div>

          <div className="alert-builder-grid">
            <label className="alert-builder-field">
              <span className="muted small">Asset</span>
              <select className="select compact-select" value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)}>
                {starterSymbols.map((symbol) => <option key={symbol} value={symbol}>{symbol}</option>)}
              </select>
            </label>
            <label className="alert-builder-field">
              <span className="muted small">Threshold</span>
              <select className="select compact-select" value={threshold} onChange={(e) => setThreshold(e.target.value)}>
                {['55','60','65','70','75','80'].map((value) => <option key={value} value={value}>{value}% conviction</option>)}
              </select>
            </label>
            <label className="alert-builder-field">
              <span className="muted small">Direction</span>
              <select className="select compact-select" value={direction} onChange={(e) => setDirection(e.target.value)}>
                <option value="both">Both</option>
                <option value="bullish">Bullish</option>
                <option value="bearish">Bearish</option>
              </select>
            </label>
            <label className="alert-builder-field">
              <span className="muted small">Timeframe</span>
              <select className="select compact-select" value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
                {['5M','15M','1H','4H','1D'].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          </div>

          <div className="alert-setup-list compact">
            <div className="alert-setup-item">
              <strong>Alerts active</strong>
              <span className="muted small">{alertSummary.totalCount} live rules across your setup · {alertSummary.focusedCount} tied to {selectedSymbol}.</span>
            </div>
            <div className="alert-setup-item">
              <strong>Delivery state</strong>
              <span className="muted small">{state?.alertDeliveryEnabled ? `Email ready for ${state?.alertDeliveryEmail || 'configured inbox'}` : 'Email delivery still off. Use Control Panel when you are ready to send.'}</span>
            </div>
          </div>

          <div className="row wrap-gap">
            <button type="button" className="button" onClick={createRule}>Add rule</button>
            <button type="button" className="ghost-button" onClick={saveStarterPack}>Create starter alerts</button>
            <button type="button" className="ghost-button" onClick={() => onOpenControls?.()}>Open alert controls</button>
          </div>
        </div>

        <div className="alert-center-card">
          <div className="alert-center-card-top">
            <div>
              <div className="alert-center-card-title">Alerts active</div>
              <div className="muted small">The rules below are live inside the current app session and persisted locally.</div>
            </div>
            <span className="badge">{focusedRules.length} on {selectedSymbol}</span>
          </div>

          <div className="alert-rule-live-list">
            {focusedRules.length ? focusedRules.map((alert) => (
              <div key={alert.id} className="alert-live-rule">
                <div>
                  <div className="alert-history-title">{describeRule(alert)}</div>
                  <div className="muted small">{alert.timeframe || '15M'} · {alert.paused ? 'Paused' : 'Live'} · updated {formatTimestamp(alert.updatedAt)}</div>
                </div>
                <div className="alert-live-actions">
                  <button type="button" className="ghost-button small" onClick={() => togglePause(alert.id)}>{alert.paused ? 'Resume' : 'Pause'}</button>
                  <button type="button" className="ghost-button small" onClick={() => removeRule(alert.id)}>Remove</button>
                </div>
              </div>
            )) : (
              <div className="alert-empty-state"><div className="muted small">No rules for {selectedSymbol} yet. Add one from the builder to make Get Alerts mode feel active right away.</div></div>
            )}
          </div>

          <div className="alert-delivery-grid">
            <button type="button" className={`alert-delivery-option ${(state?.alertDigestMode || 'instant') === 'instant' ? 'is-active' : ''}`} onClick={() => seedDeliveryMode('instant')}>
              <strong>Instant alerts</strong>
              <span className="muted small">Surface important changes as soon as the rule fires.</span>
            </button>
            <button type="button" className={`alert-delivery-option ${(state?.alertDigestMode || 'instant') === 'digest' ? 'is-active' : ''}`} onClick={() => seedDeliveryMode('digest')}>
              <strong>Digest monitoring</strong>
              <span className="muted small">Bundle activity into fewer check-ins so the app feels calmer.</span>
            </button>
          </div>

          <div className="alert-delivery-status muted small">
            Delivery email: <strong>{state?.alertDeliveryEmail || 'not set yet'}</strong> · Last status: <strong>{state?.alertLastDeliveryStatus || 'waiting for first send'}</strong>
          </div>
        </div>
      </div>

      <div className="alert-history-shell">
        <div className="alert-center-card-top">
          <div>
            <div className="alert-center-card-title">Recent alerts</div>
            <div className="muted small">Live trigger history from system changes and configured rules.</div>
          </div>
          <span className="badge">{recentEvents.length} recent</span>
        </div>

        {recentEvents.length ? (
          <div className="alert-history-list">
            {recentEvents.slice(0, 6).map((event) => (
              <div key={event.id} className={`alert-history-item alert-history-${event.level || 'watch'}`}>
                <div className="alert-history-main">
                  <div className="alert-history-title">{event.symbol || 'Alert'} · {event.body || event.text || 'Alert event'}</div>
                  <div className="muted small">{event.posture || 'Signal shift'} · confidence {event.confidence ?? '--'}% · {formatTimestamp(event.triggeredAt || event.updatedAt)}</div>
                </div>
                {event.symbol ? (
                  <button type="button" className="ghost-button small" onClick={() => onOpenAsset?.(event.symbol)}>
                    Open
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="alert-empty-state">
            <div className="muted small">No configured alert has fired yet. Starter alerts will begin logging history here once the rule engine catches a crossing or posture flip.</div>
          </div>
        )}

        {alerts.length ? (
          <div className="alert-rule-preview-row">
            {alerts.slice(0, 6).map((alert) => (
              <div key={alert.id} className="alert-rule-preview">
                <strong>{describeRule(alert)}</strong>
                <span className="muted small">{alert.paused ? 'Paused' : 'Live rule'}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
