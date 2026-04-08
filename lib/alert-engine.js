function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const ALERT_MEMORY_KEY = 'ms_alert_memory_v1';
const DIGEST_MEMORY_KEY = 'ms_alert_digest_v1';

export function buildAssetSnapshotMap(assets = []) {
  return Object.fromEntries(
    (Array.isArray(assets) ? assets : []).map((asset) => [asset.symbol, {
      symbol: asset.symbol,
      conviction: Number(asset.conviction ?? asset.signalScore ?? 0),
      sentiment: String(asset.sentiment || 'neutral'),
      signalLabel: String(asset.signalLabel || ''),
      change24h: Number(asset.change24h || 0),
      rank: Number(asset.rank || 999),
      marketRegime: String(asset.marketRegime || ''),
      story: asset.story || '',
      name: asset.name || asset.symbol,
    }])
  );
}

export function readAlertMemory() {
  if (typeof window === 'undefined') return { assetMap: {}, triggerLog: {} };
  try {
    return JSON.parse(window.localStorage.getItem(ALERT_MEMORY_KEY) || '{"assetMap":{},"triggerLog":{}}');
  } catch {
    return { assetMap: {}, triggerLog: {} };
  }
}

export function writeAlertMemory(memory) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ALERT_MEMORY_KEY, JSON.stringify(memory || { assetMap: {}, triggerLog: {} }));
  } catch {}
}

export function readDigestMemory() {
  if (typeof window === 'undefined') return { queued: [], lastSentAt: null };
  try {
    return JSON.parse(window.localStorage.getItem(DIGEST_MEMORY_KEY) || '{"queued":[],"lastSentAt":null}');
  } catch {
    return { queued: [], lastSentAt: null };
  }
}

export function writeDigestMemory(memory) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DIGEST_MEMORY_KEY, JSON.stringify(memory || { queued: [], lastSentAt: null }));
  } catch {}
}

export function queueDigestEvents(events = []) {
  const current = readDigestMemory();
  const existing = Array.isArray(current.queued) ? current.queued : [];
  const incoming = (Array.isArray(events) ? events : []).filter(Boolean).map((event) => ({
    ...event,
    queuedAt: event.queuedAt || new Date().toISOString(),
  }));
  const deduped = new Map();
  [...incoming, ...existing].forEach((event) => {
    if (!event?.id) return;
    if (!deduped.has(event.id)) deduped.set(event.id, event);
  });
  const next = { ...current, queued: Array.from(deduped.values()).slice(0, 20) };
  writeDigestMemory(next);
  return next;
}

export function shouldSendDigest(lastSentAt, intervalMinutes = 240) {
  const safeInterval = clamp(Number(intervalMinutes || 240), 15, 1440) * 60 * 1000;
  if (!lastSentAt) return true;
  const diff = Date.now() - new Date(lastSentAt).getTime();
  return Number.isFinite(diff) && diff >= safeInterval;
}

export function consumeQueuedDigestEvents(intervalMinutes = 240) {
  const current = readDigestMemory();
  const queued = Array.isArray(current.queued) ? current.queued : [];
  if (!queued.length) return { shouldSend: false, alerts: [], memory: current };
  if (!shouldSendDigest(current.lastSentAt, intervalMinutes)) {
    return { shouldSend: false, alerts: [], memory: current };
  }
  const next = { queued: [], lastSentAt: new Date().toISOString() };
  writeDigestMemory(next);
  return { shouldSend: true, alerts: queued.slice(0, 6), memory: next };
}

function describeConfiguredAlert(alert, asset, previous) {
  if (alert.type === 'conviction_above') return `${asset.symbol} crossed above ${alert.threshold}% conviction`;
  if (alert.type === 'conviction_below') return `${asset.symbol} dropped below ${alert.threshold}% conviction`;
  if (alert.type === 'sentiment_bullish') return `${asset.symbol} turned bullish${previous?.sentiment ? ` from ${previous.sentiment}` : ''}`;
  if (alert.type === 'sentiment_bearish') return `${asset.symbol} turned bearish${previous?.sentiment ? ` from ${previous.sentiment}` : ''}`;
  return `${asset.symbol} triggered an alert`;
}

function crossedAbove(previous, current, threshold) {
  return typeof current === 'number' && current >= threshold && (typeof previous !== 'number' || previous < threshold);
}

function crossedBelow(previous, current, threshold) {
  return typeof current === 'number' && current <= threshold && (typeof previous !== 'number' || previous > threshold);
}

function buildTriggerId(alert, asset) {
  return `${alert.id}:${asset.symbol}:${alert.type}`;
}

function isCoolingDown(triggerLog, triggerId, cooldownMinutes) {
  const previousAt = triggerLog?.[triggerId];
  if (!previousAt) return false;
  const cooldownMs = clamp(Number(cooldownMinutes || 30), 5, 1440) * 60 * 1000;
  return Date.now() - new Date(previousAt).getTime() < cooldownMs;
}

export function evaluateConfiguredAlerts(alerts = [], previousMap = {}, currentMap = {}, options = {}) {
  const activeAlerts = (Array.isArray(alerts) ? alerts : []).filter((alert) => alert && !alert.paused && alert.symbol);
  const triggerLog = options.triggerLog || {};
  const cooldownMinutes = options.cooldownMinutes || 30;
  const nextTriggerLog = { ...triggerLog };
  const events = [];

  for (const alert of activeAlerts) {
    const asset = currentMap[alert.symbol];
    if (!asset) continue;
    const previous = previousMap[alert.symbol] || null;
    let matched = false;

    if (alert.type === 'conviction_above') matched = crossedAbove(previous?.conviction, asset.conviction, Number(alert.threshold || 0));
    else if (alert.type === 'conviction_below') matched = crossedBelow(previous?.conviction, asset.conviction, Number(alert.threshold || 0));
    else if (alert.type === 'sentiment_bullish') matched = asset.sentiment === 'bullish' && previous?.sentiment !== 'bullish';
    else if (alert.type === 'sentiment_bearish') matched = asset.sentiment === 'bearish' && previous?.sentiment !== 'bearish';

    if (!matched) continue;

    const triggerId = buildTriggerId(alert, asset);
    if (isCoolingDown(triggerLog, triggerId, alert.cooldownMinutes || cooldownMinutes)) continue;

    const triggeredAt = new Date().toISOString();
    nextTriggerLog[triggerId] = triggeredAt;
    events.push({
      id: `${triggerId}:${triggeredAt}`,
      triggerId,
      source: 'configured',
      level: alert.type === 'conviction_below' || alert.type === 'sentiment_bearish' ? 'warning' : 'positive',
      priority: 4,
      symbol: asset.symbol,
      title: 'Alert triggered',
      body: describeConfiguredAlert(alert, asset, previous),
      text: describeConfiguredAlert(alert, asset, previous),
      posture: asset.signalLabel || asset.sentiment || 'Signal',
      confidence: Math.round(asset.conviction || 0),
      alertId: alert.id,
      triggeredAt,
    });
  }

  return { events, triggerLog: nextTriggerLog };
}

export function buildSystemAlerts({ previousTopSignal, topSignal, previousRegime, regimeSummary, watchlistHighlights = [] }) {
  const events = [];

  if (previousTopSignal?.symbol && topSignal?.symbol && previousTopSignal.symbol !== topSignal.symbol) {
    events.push({
      id: `flip:${previousTopSignal.symbol}:${topSignal.symbol}`,
      source: 'system',
      level: 'critical',
      priority: 3,
      symbol: topSignal.symbol,
      title: 'New top signal detected',
      body: `${previousTopSignal.symbol} → ${topSignal.symbol}`,
      text: `${previousTopSignal.symbol} was replaced by ${topSignal.symbol} as the top signal`,
      posture: topSignal.signalLabel || 'Top signal',
      confidence: Math.round(topSignal.conviction || 0),
    });
  }

  if (previousRegime && regimeSummary?.regime && previousRegime !== regimeSummary.regime) {
    events.push({
      id: `regime:${previousRegime}:${regimeSummary.regime}`,
      source: 'system',
      level: 'watch',
      priority: 2,
      symbol: topSignal?.symbol,
      title: 'Market tone changed',
      body: `${String(previousRegime).replace(/-/g, ' ')} → ${String(regimeSummary.regime).replace(/-/g, ' ')}`,
      text: `Market regime changed from ${previousRegime} to ${regimeSummary.regime}`,
      posture: regimeSummary?.regime || 'Regime',
      confidence: Math.round(topSignal?.conviction || 0),
    });
  }

  watchlistHighlights.slice(0, 2).forEach((asset, index) => {
    const magnitude = Math.abs(Number(asset?.change24h || 0));
    if (magnitude < 3.5 && Math.abs(Number(asset?.conviction || 0) - 50) < 12) return;
    events.push({
      id: `watch:${asset.symbol}:${index}:${Math.round(magnitude)}`,
      source: 'system',
      level: Number(asset.change24h || 0) >= 0 ? 'watch' : 'warning',
      priority: 1,
      symbol: asset.symbol,
      title: 'Watchlist move',
      body: `${asset.symbol} moved ${Number(asset.change24h || 0) >= 0 ? 'up' : 'down'} ${magnitude.toFixed(1)}%`,
      text: `${asset.symbol} is making a meaningful watchlist move`,
      posture: asset.signalLabel || asset.sentiment || 'Watchlist',
      confidence: Math.round(asset.conviction || 0),
    });
  });

  return events;
}
