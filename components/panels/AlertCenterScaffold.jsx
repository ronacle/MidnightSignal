'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAlertRuleLimit, hasUnlimitedAlerts } from '@/lib/entitlements';
import {
  SIGNAL_STREAM_TYPE_LABELS,
  SIGNAL_STREAM_DEFAULT_TYPES,
  normalizeSignalStreamPreferences,
} from '@/lib/alert-engine';

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
  if (alert.label) return alert.label;
  if (alert.type === 'conviction_above') return `${alert.symbol} above ${alert.threshold}% conviction`;
  if (alert.type === 'conviction_below') return `${alert.symbol} below ${alert.threshold}% conviction`;
  if (alert.type === 'conviction_building') return `${alert.symbol} conviction building`;
  if (alert.type === 'conviction_weakening') return `${alert.symbol} conviction easing`;
  if (alert.type === 'sentiment_bullish') return `${alert.symbol} turns bullish`;
  if (alert.type === 'sentiment_bearish') return `${alert.symbol} turns bearish`;
  if (alert.type === 'lead_signal') return `${alert.symbol} becomes lead signal`;
  if (alert.type === 'decision_wait') return `${alert.symbol} decision becomes WAIT`;
  if (alert.type === 'decision_lean_in') return `${alert.symbol} decision becomes LEAN IN`;
  if (alert.type === 'decision_reduce') return `${alert.symbol} decision becomes REDUCE`;
  if (alert.type === 'decision_avoid') return `${alert.symbol} decision becomes AVOID`;
  if (alert.type === 'trigger_confirmed') return `${alert.symbol} confirmation trigger clears`;
  return `${alert.symbol} alert`;
}

function makeQuickAlert(symbol, type = 'conviction_above', threshold = 70, direction = 'both', timeframe = '15M', importance = 'normal') {
  return {
    id: `quick-${symbol}-${type}-${direction}-${timeframe}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    symbol,
    type,
    threshold: ['sentiment_bullish', 'sentiment_bearish', 'conviction_building', 'conviction_weakening', 'lead_signal', 'decision_wait', 'decision_lean_in', 'decision_reduce', 'decision_avoid'].includes(type) ? null : threshold,
    direction,
    timeframe,
    importance,
    decisionTarget: type === 'decision_wait' ? 'WAIT' : type === 'decision_lean_in' ? 'LEAN IN' : type === 'decision_reduce' ? 'REDUCE' : type === 'decision_avoid' ? 'AVOID' : null,
    label: buildRuleLabel(symbol, type, threshold),
    paused: false,
    updatedAt: new Date().toISOString(),
  };
}

function buildRuleLabel(symbol, type, threshold) {
  if (type === 'lead_signal') return `Alert me when ${symbol} becomes the lead signal`;
  if (type === 'conviction_building') return `Alert me when ${symbol} conviction starts building`;
  if (type === 'conviction_weakening') return `Alert me when ${symbol} conviction starts easing`;
  if (type === 'decision_lean_in') return `Alert me when ${symbol} shifts to LEAN IN`;
  if (type === 'decision_wait') return `Alert me when ${symbol} shifts to WAIT`;
  if (type === 'decision_reduce') return `Alert me when ${symbol} shifts to REDUCE`;
  if (type === 'decision_avoid') return `Alert me when ${symbol} shifts to AVOID`;
  if (type === 'trigger_confirmed') return `Alert me when ${symbol} clears confirmation near ${threshold}%`;
  if (type === 'sentiment_bullish') return `Alert me when ${symbol} turns bullish`;
  if (type === 'sentiment_bearish') return `Alert me when ${symbol} turns bearish`;
  if (type === 'conviction_below') return `Alert me when ${symbol} drops below ${threshold}% conviction`;
  return `Alert me when ${symbol} crosses ${threshold}% conviction`;
}

const DIRECTION_TYPES = {
  bullish: 'sentiment_bullish',
  bearish: 'sentiment_bearish',
};

function getAlertStateMeta(alert) {
  if (alert?.lastTriggeredAt) return { label: 'Triggered', className: 'is-triggered' };
  if (alert?.paused) return { label: 'Paused', className: 'is-paused' };
  return { label: 'Live', className: 'is-live' };
}

function explainEvent(event) {
  if (!event) return 'Triggered by a saved rule or a meaningful system posture shift.';
  const confidence = Number(event.confidence ?? 0);
  const posture = String(event.posture || '').toLowerCase();
  if (confidence >= 75) return 'Conviction cleared your higher-confidence threshold, so Midnight Signal elevated it instead of treating it as ordinary noise.';
  if (posture.includes('bear')) return 'A bearish posture shift aligned with your monitored direction, so the event was logged for caution rather than ignored.';
  if (posture.includes('bull')) return 'A bullish posture shift aligned with your monitored direction, so the event was surfaced as a momentum-positive trigger.';
  return 'The rule crossed its required threshold or posture condition, so it was added to your recent alert history.';
}


export default function AlertCenterScaffold({
  state,
  setState,
  experience,
  topSignal,
  watchlistHighlights = [],
  onOpenControls,
  onOpenAsset,
  user,
  syncing = false,
  status = 'Saved locally',
  lastSyncedAt = null,
}) {
  const alerts = Array.isArray(state?.alerts) ? state.alerts : [];
  const planTier = state?.planTier === 'pro' ? 'pro' : 'basic';
  const alertRuleLimit = getAlertRuleLimit(planTier);
  const unlimitedAlerts = hasUnlimitedAlerts(planTier);
  const watchlist = Array.isArray(state?.watchlist) ? state.watchlist : [];
  const recentEvents = Array.isArray(state?.recentAlertEvents) ? state.recentAlertEvents : [];
  const streamPreferences = normalizeSignalStreamPreferences(state?.signalStreamPreferences);
  const activeAlerts = alerts.filter((item) => !item.paused);
  const starterSymbols = Array.from(new Set([
    topSignal?.symbol,
    ...watchlist.slice(0, 5),
    ...watchlistHighlights.map((item) => item?.symbol).filter(Boolean),
  ].filter(Boolean))).slice(0, 6);

  const [selectedSymbol, setSelectedSymbol] = useState(starterSymbols[0] || watchlist[0] || topSignal?.symbol || 'BTC');
  const [threshold, setThreshold] = useState(String(state?.alertCenterThreshold || 70));
  const [direction, setDirection] = useState(state?.alertCenterDirection || 'both');
  const [ruleType, setRuleType] = useState(state?.alertCenterRuleType || 'conviction_above');
  const [importance, setImportance] = useState(state?.alertCenterImportance || 'important');
  const [timeframe, setTimeframe] = useState(state?.alertCenterTimeframe || state?.timeframe || '15M');
  const [testStatus, setTestStatus] = useState('');
  const [deliveryEmail, setDeliveryEmail] = useState(state?.alertDeliveryEmail || user?.email || '');
  const [sendingTest, setSendingTest] = useState(false);
  const [deliveryFeedback, setDeliveryFeedback] = useState('');
  const [openWhyEventId, setOpenWhyEventId] = useState(null);
  const [upgradeMessage, setUpgradeMessage] = useState('');

  useEffect(() => {
    setDeliveryEmail(state?.alertDeliveryEmail || user?.email || '');
  }, [state?.alertDeliveryEmail, user?.email]);

  const alertSummary = useMemo(() => {
    const focused = activeAlerts.filter((item) => item.symbol === selectedSymbol);
    return {
      focusedCount: focused.length,
      totalCount: activeAlerts.length,
      recentCount: recentEvents.length,
      remainingCount: Math.max(0, alertRuleLimit - alerts.length),
      usageLabel: unlimitedAlerts ? 'Unlimited alerts' : `${alerts.length} of ${alertRuleLimit} alerts used`,
    };
  }, [activeAlerts, recentEvents, selectedSymbol, alertRuleLimit, alerts.length, unlimitedAlerts]);

  function openUpgrade() {
    window.location.href = '/api/stripe/checkout';
  }

  function canAddRules(count = 1) {
    if (unlimitedAlerts) return true;
    const available = alertRuleLimit - alerts.length;
    if (available >= count) return true;
    setUpgradeMessage(`Free plan includes ${alertRuleLimit} alert rules. Upgrade to Pro for unlimited alerts.`);
    return false;
  }

  function saveStarterPack() {
    const existingKeys = new Set(alerts.map((item) => `${item.symbol}:${item.type}:${item.threshold ?? 'na'}:${item.timeframe || 'na'}`));
    const availableSlots = unlimitedAlerts ? Number.POSITIVE_INFINITY : Math.max(0, alertRuleLimit - alerts.length);
    if (availableSlots <= 0) {
      setUpgradeMessage(`Free plan includes ${alertRuleLimit} alert rules. Upgrade to Pro for unlimited alerts.`);
      return;
    }
    const starterAlerts = starterSymbols.flatMap((symbol, index) => {
      const quickRules = [
        makeQuickAlert(symbol, 'conviction_above', index === 0 ? 72 : 68, 'both', state?.timeframe || '15M'),
        makeQuickAlert(symbol, 'sentiment_bullish', null, 'bullish', state?.timeframe || '15M'),
      ];
      return quickRules.filter((item) => !existingKeys.has(`${item.symbol}:${item.type}:${item.threshold ?? 'na'}:${item.timeframe || 'na'}`));
    });

    const limitedStarterAlerts = starterAlerts.slice(0, availableSlots);
    setState((previous) => ({
      ...previous,
      alerts: [...limitedStarterAlerts, ...(previous.alerts || [])],
      alertDeliveryEnabled: previous.alertDeliveryEnabled || false,
      dashboardFocus: 'watchlist',
      intent: 'alerts',
      onboardingGoal: 'alerts',
    }));
    if (!unlimitedAlerts && starterAlerts.length > availableSlots) {
      setUpgradeMessage(`Starter pack added ${limitedStarterAlerts.length} free rules. Upgrade to Pro for unlimited alerts.`);
    } else {
      setUpgradeMessage('');
    }
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
    if (!canAddRules(1)) return;
    const safeThreshold = Math.max(35, Math.min(95, Number(threshold || 70)));
    const nextAlert = makeQuickAlert(selectedSymbol, ruleType, safeThreshold, direction, timeframe, importance);

    setState((previous) => ({
      ...previous,
      alerts: [nextAlert, ...(previous.alerts || [])],
      alertCenterThreshold: String(safeThreshold),
      alertCenterDirection: direction,
      alertCenterRuleType: ruleType,
      alertCenterImportance: importance,
      alertCenterTimeframe: timeframe,
      dashboardFocus: 'watchlist',
      intent: 'alerts',
      onboardingGoal: 'alerts',
    }));
  }

  function applyRuleExample(nextType, nextSymbol = selectedSymbol, nextThreshold = threshold) {
    setSelectedSymbol(nextSymbol);
    setRuleType(nextType);
    setThreshold(String(nextThreshold));
    if (nextType === 'decision_lean_in') setImportance('critical');
    else if (nextType === 'lead_signal' || nextType === 'conviction_building') setImportance('important');
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


  function updateStreamPreferences(patch) {
    setState((previous) => ({
      ...previous,
      signalStreamPreferences: normalizeSignalStreamPreferences({
        ...(previous.signalStreamPreferences || {}),
        ...patch,
      }),
      intent: 'alerts',
      onboardingGoal: 'alerts',
    }));
  }

  function toggleStreamType(type) {
    const enabled = new Set(streamPreferences.enabledTypes);
    if (enabled.has(type)) enabled.delete(type);
    else enabled.add(type);
    const nextEnabled = Array.from(enabled);
    updateStreamPreferences({ enabledTypes: nextEnabled.length ? nextEnabled : [type] });
  }

  async function sendTestAlert() {
    const cleanEmail = String(deliveryEmail || '').trim();
    if (!cleanEmail) {
      setDeliveryFeedback('Add a delivery email first.');
      return;
    }

    const now = new Date().toISOString();
    const mockEvent = {
      id: `test-${selectedSymbol}-${Date.now()}`,
      symbol: selectedSymbol,
      body: `Test alert fired for ${selectedSymbol}`,
      text: `Test alert fired for ${selectedSymbol}`,
      posture: direction === 'bearish' ? 'Bearish posture' : direction === 'bullish' ? 'Bullish posture' : 'Signal shift',
      confidence: Number(threshold || 70),
      level: direction === 'bearish' ? 'warning' : 'watch',
      triggeredAt: now,
      reason: `Manual test alert for ${selectedSymbol} at ${threshold}% on ${timeframe}.`,
      isTest: true,
    };

    setSendingTest(true);
    try {
      const response = await fetch('/api/alerts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          test: true,
          digestMode: state?.alertDigestMode || 'instant',
          alerts: [mockEvent],
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.ok === false) {
        throw new Error(data?.message || 'Unable to send test alert.');
      }

      setState((previous) => ({
        ...previous,
        alertDeliveryEnabled: true,
        alertDeliveryEmail: cleanEmail,
        recentAlertEvents: [mockEvent, ...((previous?.recentAlertEvents) || [])].slice(0, 18),
        alertLastDeliveryAt: data?.sentAt || now,
        alertLastTriggeredAt: now,
        alertLastDeliveryStatus: data?.mode === 'live'
          ? `Test email sent to ${cleanEmail}`
          : 'Test route ready. Add RESEND_API_KEY and ALERTS_FROM_EMAIL in Vercel for live email sends.',
      }));
      setTestStatus(`Test alert sent for ${selectedSymbol}.`);
      setDeliveryFeedback(
        data?.mode === 'live'
          ? `Live email sent to ${cleanEmail}.`
          : 'Mock delivery succeeded. Add RESEND_API_KEY and ALERTS_FROM_EMAIL in Vercel to enable live sends.'
      );
    } catch (error) {
      setDeliveryFeedback(error?.message || 'Unable to send test alert.');
      setState((previous) => ({
        ...previous,
        alertLastDeliveryStatus: error?.message || 'Delivery failed',
      }));
    } finally {
      setSendingTest(false);
    }
  }

  function applyDeliverySettings(enabled) {
    const cleanEmail = String(deliveryEmail || '').trim();
    setState((previous) => ({
      ...previous,
      alertDeliveryEnabled: enabled,
      alertDeliveryEmail: cleanEmail,
      intent: 'alerts',
      onboardingGoal: 'alerts',
    }));
    setDeliveryFeedback(
      enabled
        ? (cleanEmail ? `Email delivery armed for ${cleanEmail}.` : 'Email delivery toggled on. Add an email to receive sends.')
        : 'Email delivery paused.'
    );
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
            {user
              ? ` Your rules and alert history can follow ${user.email} across devices.`
              : ' Guests keep alerts on this device until they sign in.'}
          </p>
        </div>
        <div className="alert-center-summary">
          <span className="badge">{activeAlerts.length} active</span>
          <span className="badge">{alerts.filter((item) => item.paused).length} paused</span>
          <span className="badge">{planTier === 'pro' ? recentEvents.length : Math.min(recentEvents.length, 5)} recent</span>
          <span className="badge">{state?.alertDigestMode === 'digest' ? 'Digest mode' : 'Instant mode'}</span>
          <span className="badge">{user ? (syncing ? 'Cloud syncing…' : (lastSyncedAt ? 'Cloud saved' : 'Cloud ready')) : 'Local only'}</span>
        </div>
      </div>

      <div className="signal-stream-control-card">
        <div className="alert-center-card-top">
          <div>
            <div className="alert-center-card-title">Signal Stream noise control</div>
            <div className="muted small">Choose what is allowed to interrupt the dashboard. This changes the bell, the priority strip, and recent stream history.</div>
          </div>
          <span className="badge">{streamPreferences.quietMode ? 'Quiet mode' : streamPreferences.minimumImportance === 'critical' ? 'Critical only' : streamPreferences.minimumImportance === 'important' ? 'Important+' : 'All events'}</span>
        </div>

        <div className="signal-stream-pref-grid">
          <label className="alert-builder-field">
            <span className="muted small">Minimum importance</span>
            <select
              className="select compact-select"
              value={streamPreferences.minimumImportance}
              onChange={(event) => updateStreamPreferences({ minimumImportance: event.target.value })}
            >
              <option value="all">All signal events</option>
              <option value="important">Important and above</option>
              <option value="critical">Critical only</option>
            </select>
          </label>

          <button
            type="button"
            className={`alert-delivery-option signal-stream-toggle ${streamPreferences.watchlistOnly ? 'is-active' : ''}`}
            onClick={() => updateStreamPreferences({ watchlistOnly: !streamPreferences.watchlistOnly })}
          >
            <strong>Watchlist-only stream</strong>
            <span className="muted small">Only surface symbol events tied to your tracked assets.</span>
          </button>

          <button
            type="button"
            className={`alert-delivery-option signal-stream-toggle ${streamPreferences.quietMode ? 'is-active' : ''}`}
            onClick={() => updateStreamPreferences({ quietMode: !streamPreferences.quietMode })}
          >
            <strong>Quiet mode</strong>
            <span className="muted small">Suppress lower-signal movement so the stream only wakes up for meaningful shifts.</span>
          </button>
        </div>

        <div className="signal-stream-type-grid" aria-label="Signal Stream event type controls">
          {SIGNAL_STREAM_DEFAULT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={`signal-stream-type-toggle ${streamPreferences.enabledTypes.includes(type) ? 'is-active' : ''}`}
              onClick={() => toggleStreamType(type)}
            >
              {SIGNAL_STREAM_TYPE_LABELS[type] || type}
            </button>
          ))}
        </div>
      </div>

      <div className="alert-center-grid">
        <div className="alert-center-card">
          <div className="alert-center-card-top">
            <div>
              <div className="alert-center-card-title">Custom rule builder</div>
              <div className="muted small">Create personal Signal Stream rules from your watchlist, lead signal, conviction behavior, and decision layer.</div>
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
              <span className="muted small">Condition</span>
              <select className="select compact-select" value={ruleType} onChange={(e) => setRuleType(e.target.value)}>
                <option value="conviction_above">Conviction crosses above</option>
                <option value="conviction_below">Conviction falls below</option>
                <option value="conviction_building">Conviction starts building</option>
                <option value="conviction_weakening">Conviction starts easing</option>
                <option value="lead_signal">Becomes lead signal</option>
                <option value="decision_lean_in">Decision becomes LEAN IN</option>
                <option value="decision_wait">Decision becomes WAIT</option>
                <option value="decision_reduce">Decision becomes REDUCE</option>
                <option value="decision_avoid">Decision becomes AVOID</option>
                <option value="trigger_confirmed">Confirmation trigger clears</option>
                <option value="sentiment_bullish">Turns bullish</option>
                <option value="sentiment_bearish">Turns bearish</option>
              </select>
            </label>
            <label className="alert-builder-field">
              <span className="muted small">Threshold</span>
              <select className="select compact-select" value={threshold} onChange={(e) => setThreshold(e.target.value)}>
                {['55','60','65','70','75','80'].map((value) => <option key={value} value={value}>{value}% conviction</option>)}
              </select>
            </label>
            <label className="alert-builder-field">
              <span className="muted small">Importance</span>
              <select className="select compact-select" value={importance} onChange={(e) => setImportance(e.target.value)}>
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="alert-builder-field">
              <span className="muted small">Bias helper</span>
              <select className="select compact-select" value={direction} onChange={(e) => setDirection(e.target.value)}>
                <option value="both">Any direction</option>
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

          <div className="custom-rule-examples" aria-label="Custom rule examples">
            <button type="button" className="ghost-button small" onClick={() => applyRuleExample('conviction_building', topSignal?.symbol || selectedSymbol)}>Conviction building</button>
            <button type="button" className="ghost-button small" onClick={() => applyRuleExample('lead_signal', topSignal?.symbol || selectedSymbol)}>Lead signal takeover</button>
            <button type="button" className="ghost-button small" onClick={() => applyRuleExample('decision_lean_in', topSignal?.symbol || selectedSymbol)}>Watch for LEAN IN</button>
            <button type="button" className="ghost-button small" onClick={() => applyRuleExample('trigger_confirmed', selectedSymbol, 70)}>Confirmation trigger</button>
          </div>

          <div className="alert-setup-list compact">
            <div className="alert-setup-item">
              <strong>Alerts active</strong>
              <span className="muted small">{alertSummary.totalCount} live rules across your setup · {alertSummary.focusedCount} tied to {selectedSymbol}.</span>
            </div>
            <div className="alert-setup-item">
              <strong>Delivery state</strong>
              <span className="muted small">{state?.alertDeliveryEnabled ? `Email ready for ${state?.alertDeliveryEmail || 'configured inbox'}` : 'Email delivery still off. Turn it on below and add the inbox you want Midnight Signal to use.'}</span>
            </div>
            <div className="alert-setup-item">
              <strong>Persistence</strong>
              <span className="muted small">{user ? `${syncing ? 'Syncing alert rules now.' : status}. ${lastSyncedAt ? `Last synced ${formatTimestamp(lastSyncedAt)}.` : 'Waiting for the first cloud save.'}` : 'Rules persist locally on this device until you sign in.'}</span>
            </div>
          </div>

          <div className="alert-delivery-builder">
            <div className="alert-delivery-builder-top">
              <div>
                <div className="alert-center-card-title">Email delivery</div>
                <div className="muted small">Use a real inbox for instant or digest alerts. Test send checks the full route from the app to the delivery endpoint.</div>
              </div>
              <span className={`alert-state-chip ${state?.alertDeliveryEnabled ? 'is-live' : 'is-paused'}`}>{state?.alertDeliveryEnabled ? 'Armed' : 'Paused'}</span>
            </div>

            <div className="alert-email-row">
              <label className="alert-builder-field alert-email-field">
                <span className="muted small">Delivery email</span>
                <input
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={deliveryEmail}
                  onChange={(e) => setDeliveryEmail(e.target.value)}
                />
              </label>
              <div className="alert-email-actions">
                <button type="button" className={state?.alertDeliveryEnabled ? 'ghost-button' : 'button'} onClick={() => applyDeliverySettings(true)}>Enable email</button>
                <button type="button" className="ghost-button" onClick={() => applyDeliverySettings(false)}>Pause email</button>
              </div>
            </div>

            <div className="alert-delivery-note muted small">
              Live sends use <strong>RESEND_API_KEY</strong> and <strong>ALERTS_FROM_EMAIL</strong> in Vercel. Without them, the test button still verifies the route in mock mode.
            </div>
          </div>

          <div className="row wrap-gap">
            <button type="button" className="button" onClick={createRule}>Add rule</button>
            <button type="button" className="ghost-button" onClick={saveStarterPack}>Create starter alerts</button>
            <button type="button" className="ghost-button" onClick={sendTestAlert} disabled={sendingTest}>{sendingTest ? 'Sending test…' : 'Send test alert'}</button>
            <button type="button" className="ghost-button" onClick={() => onOpenControls?.()}>Open alert controls</button>
          </div>
          {testStatus ? <div className="alert-inline-status muted small">{testStatus}</div> : null}
          {deliveryFeedback ? <div className="alert-inline-status muted small">{deliveryFeedback}</div> : null}
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
            {focusedRules.length ? focusedRules.map((alert) => {
              const stateMeta = getAlertStateMeta(alert);
              return (
              <div key={alert.id} className={`alert-live-rule ${stateMeta.className}`}>
                <div className="alert-live-main">
                  <div className="alert-live-topline">
                    <div className="alert-history-title">{describeRule(alert)}</div>
                    <span className={`alert-state-chip ${stateMeta.className}`}>{stateMeta.label}</span>
                  </div>
                  <div className="muted small">{alert.timeframe || '15M'} · {alert.importance || 'normal'} importance · updated {formatTimestamp(alert.updatedAt)}</div>
                </div>
                <div className="alert-live-actions">
                  <button type="button" className="ghost-button small" onClick={() => togglePause(alert.id)}>{alert.paused ? 'Resume' : 'Pause'}</button>
                  <button type="button" className="ghost-button small" onClick={() => removeRule(alert.id)}>Remove</button>
                </div>
              </div>
            )}) : (
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
            Delivery email: <strong>{state?.alertDeliveryEmail || 'not set yet'}</strong> · Last status: <strong>{state?.alertLastDeliveryStatus || 'waiting for first send'}</strong> · Last sent: <strong>{formatTimestamp(state?.alertLastDeliveryAt)}</strong>
          </div>
        </div>
      </div>

      <div className="alert-history-shell">
        <div className="alert-center-card-top">
          <div>
            <div className="alert-center-card-title">Recent alerts</div>
            <div className="muted small">Live trigger history from system changes and configured rules, filtered by your Signal Stream preferences.</div>
          </div>
          <span className="badge">{planTier === 'pro' ? recentEvents.length : Math.min(recentEvents.length, 5)} recent</span>
        </div>

        {recentEvents.length ? (
          <div className="alert-history-list">
            {(planTier === 'pro' ? recentEvents.slice(0, 6) : recentEvents.slice(0, 5)).map((event) => (
              <div key={event.id} className={`alert-history-item alert-history-${event.level || 'watch'}`}>
                <div className="alert-history-main">
                  <div className="alert-history-topline">
                    <div className="alert-history-title">{event.symbol || 'Alert'} · {event.body || event.text || 'Alert event'}</div>
                    {event.isTest ? <span className="alert-test-badge">Test</span> : null}
                  </div>
                  <div className="muted small">{event.posture || 'Signal shift'} · confidence {event.confidence ?? '--'}% · {formatTimestamp(event.triggeredAt || event.updatedAt)}</div>
                  <button type="button" className="alert-why-link" onClick={() => setOpenWhyEventId(openWhyEventId === event.id ? null : event.id)}>
                    {openWhyEventId === event.id ? 'Hide why this fired' : 'Why this fired'}
                  </button>
                  {openWhyEventId === event.id ? (
                    <div className="alert-why-panel muted small">{event.reason || explainEvent(event)}</div>
                  ) : null}
                </div>
                <div className="alert-history-actions">
                  {event.symbol ? (
                    <button type="button" className="ghost-button small" onClick={() => onOpenAsset?.(event.symbol)}>
                      Open
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="alert-empty-state">
            <div className="muted small">No configured alert has fired yet. Starter alerts will begin logging history here once the rule engine catches a crossing or posture flip.</div>
          </div>
        )}

        {planTier !== 'pro' && recentEvents.length > 5 ? (
          <div className="billing-next-step">
            <strong>Pro history:</strong> Free shows the latest 5 events here. Upgrade to keep a fuller recent-alert timeline in view.
          </div>
        ) : null}

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
