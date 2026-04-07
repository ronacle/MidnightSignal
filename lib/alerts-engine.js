const STORAGE_KEY = 'ms_alert_center_v1';

export function readAlerts() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeAlerts(alerts) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch {}
}

export function markAlertsRead(alerts = []) {
  return (alerts || []).map((alert) => ({ ...alert, read: true }));
}

function makeMessage(type, payload, mode = 'Beginner') {
  const beginner = mode === 'Beginner';
  if (type === 'top_signal_change') {
    return beginner
      ? `${payload.nextSymbol} became tonight's top signal because market leadership shifted from ${payload.prevSymbol}.`
      : `Top Signal: ${payload.nextSymbol} (prev ${payload.prevSymbol})`;
  }
  if (type === 'posture_change') {
    return beginner
      ? `${payload.symbol} moved from ${payload.prevPosture} to ${payload.nextPosture}, which changes the decision posture.`
      : `${payload.symbol} posture ${payload.prevPosture} → ${payload.nextPosture}`;
  }
  if (type === 'regime_change') {
    return beginner
      ? `The market regime shifted from ${payload.prevRegime} to ${payload.nextRegime}, so signal weighting changed.`
      : `Regime: ${payload.prevRegime} → ${payload.nextRegime}`;
  }
  if (type === 'score_threshold') {
    return beginner
      ? `${payload.symbol} crossed a key score threshold and now reads ${payload.score}.`
      : `${payload.symbol} score threshold crossed (${payload.score})`;
  }
  if (type === 'validation_drop') {
    return beginner
      ? `Recent signal quality weakened, so validation metrics need more caution.`
      : `Validation deteriorated`;
  }
  return beginner ? 'A meaningful market change was detected.' : 'Meaningful change detected';
}

export function deriveAlerts({
  previousSignal,
  currentSignal,
  previousDecision,
  currentDecision,
  previousRegime,
  currentRegime,
  previousScorecard,
  currentScorecard,
  mode = 'Beginner'
}) {
  const alerts = [];
  const now = new Date().toISOString();

  if (previousSignal && currentSignal && previousSignal.symbol !== currentSignal.symbol) {
    alerts.push({
      id: `top-${currentSignal.symbol}-${Date.now()}`,
      type: 'top_signal_change',
      title: 'Top Signal Changed',
      message: makeMessage('top_signal_change', {
        prevSymbol: previousSignal.symbol,
        nextSymbol: currentSignal.symbol
      }, mode),
      createdAt: now,
      priority: 'high',
      read: false
    });
  }

  if (previousDecision && currentDecision && previousDecision.posture !== currentDecision.posture) {
    alerts.push({
      id: `posture-${currentSignal?.symbol || 'signal'}-${Date.now()}`,
      type: 'posture_change',
      title: 'Posture Changed',
      message: makeMessage('posture_change', {
        symbol: currentSignal?.symbol || 'Signal',
        prevPosture: previousDecision.posture,
        nextPosture: currentDecision.posture
      }, mode),
      createdAt: now,
      priority: 'medium',
      read: false
    });
  }

  if (previousRegime && currentRegime && previousRegime !== currentRegime) {
    alerts.push({
      id: `regime-${currentRegime}-${Date.now()}`,
      type: 'regime_change',
      title: 'Market Regime Shift',
      message: makeMessage('regime_change', {
        prevRegime: previousRegime,
        nextRegime: currentRegime
      }, mode),
      createdAt: now,
      priority: 'high',
      read: false
    });
  }

  const prevScore = Number(previousSignal?.signalScore ?? previousSignal?.conviction ?? 0);
  const nextScore = Number(currentSignal?.signalScore ?? currentSignal?.conviction ?? 0);
  if ((prevScore < 70 && nextScore >= 70) || (prevScore > 45 && nextScore <= 45)) {
    alerts.push({
      id: `score-${currentSignal?.symbol || 'signal'}-${Date.now()}`,
      type: 'score_threshold',
      title: 'Score Threshold Crossed',
      message: makeMessage('score_threshold', {
        symbol: currentSignal?.symbol || 'Signal',
        score: nextScore
      }, mode),
      createdAt: now,
      priority: 'medium',
      read: false
    });
  }

  const prevHitRate = Number(previousScorecard?.hitRate ?? 100);
  const nextHitRate = Number(currentScorecard?.hitRate ?? 100);
  if (previousScorecard && currentScorecard && prevHitRate - nextHitRate >= 10) {
    alerts.push({
      id: `validation-${Date.now()}`,
      type: 'validation_drop',
      title: 'Validation Weakened',
      message: makeMessage('validation_drop', {}, mode),
      createdAt: now,
      priority: 'medium',
      read: false
    });
  }

  return alerts;
}

export function mergeAlerts(existing = [], incoming = []) {
  const next = [...incoming, ...existing];
  const seen = new Set();
  return next.filter((item) => {
    const key = `${item.type}:${item.title}:${item.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 30);
}
