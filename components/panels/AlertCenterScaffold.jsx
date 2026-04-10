'use client';

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

function makeQuickAlert(symbol, type = 'conviction_above', threshold = 70) {
  return {
    id: `quick-${symbol}-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    symbol,
    type,
    threshold: ['sentiment_bullish', 'sentiment_bearish'].includes(type) ? null : threshold,
    paused: false,
    updatedAt: new Date().toISOString(),
  };
}

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
    ...watchlist.slice(0, 3),
    ...watchlistHighlights.map((item) => item?.symbol).filter(Boolean),
  ].filter(Boolean))).slice(0, 4);

  function saveStarterPack() {
    const existingKeys = new Set(alerts.map((item) => `${item.symbol}:${item.type}:${item.threshold ?? 'na'}`));
    const starterAlerts = starterSymbols.flatMap((symbol, index) => {
      const quickRules = [
        makeQuickAlert(symbol, 'conviction_above', index === 0 ? 72 : 68),
        makeQuickAlert(symbol, 'sentiment_bullish'),
      ];
      return quickRules.filter((item) => !existingKeys.has(`${item.symbol}:${item.type}:${item.threshold ?? 'na'}`));
    });

    setState((previous) => ({
      ...previous,
      alerts: [...starterAlerts, ...(previous.alerts || [])],
      alertDeliveryEnabled: previous.alertDeliveryEnabled || false,
      dashboardFocus: 'watchlist',
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

  return (
    <section className={`alert-center-shell card ${experience?.modeClass || ''} ${experience?.intentClass || ''}`} aria-label="Alert center">
      <div className="alert-center-head">
        <div>
          <div className="eyebrow">Alert center</div>
          <h2 className="section-title">Stay informed without babysitting the board</h2>
          <p className="muted small alert-center-copy">
            Build alert rules from the names you care about, see what fired recently, and decide whether you want instant emails or digest-style monitoring.
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
              <div className="alert-center-card-title">Your alert setup</div>
              <div className="muted small">Start with your watchlist, then refine rules in Control Panel.</div>
            </div>
            <span className="badge">Scaffold</span>
          </div>

          <div className="alert-center-pill-row">
            {starterSymbols.length ? starterSymbols.map((symbol) => (
              <button key={symbol} type="button" className="alert-symbol-pill" onClick={() => onOpenAsset?.(symbol)}>
                {symbol}
              </button>
            )) : <div className="muted small">No watchlist assets yet. Add favorites from the board to seed your alert setup.</div>}
          </div>

          <div className="alert-setup-list">
            <div className="alert-setup-item">
              <strong>Threshold focus</strong>
              <span className="muted small">Cross above 68–72% conviction for stronger follow-through.</span>
            </div>
            <div className="alert-setup-item">
              <strong>Direction shifts</strong>
              <span className="muted small">Track bullish and bearish posture flips without staring at every tick.</span>
            </div>
            <div className="alert-setup-item">
              <strong>Delivery path</strong>
              <span className="muted small">Choose instant email when speed matters or digest mode when you want fewer interruptions.</span>
            </div>
          </div>

          <div className="row wrap-gap">
            <button type="button" className="button" onClick={saveStarterPack}>
              Create starter alerts
            </button>
            <button type="button" className="ghost-button" onClick={() => onOpenControls?.()}>
              Open alert controls
            </button>
          </div>
        </div>

        <div className="alert-center-card">
          <div className="alert-center-card-top">
            <div>
              <div className="alert-center-card-title">Delivery mode</div>
              <div className="muted small">Pick the monitoring style that matches your rhythm.</div>
            </div>
            <span className="badge">Ready</span>
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
            <div className="muted small">The first step toward a real alert history panel.</div>
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
            {alerts.slice(0, 4).map((alert) => (
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
