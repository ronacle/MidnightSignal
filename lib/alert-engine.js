function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const ALERT_MEMORY_KEY = 'ms_alert_memory_v1';
const DIGEST_MEMORY_KEY = 'ms_alert_digest_v1';
const EMAIL_DELIVERY_MEMORY_KEY = 'ms_alert_email_delivery_v1';


function sanitizeAlertMemory(memory) {
  return {
    assetMap: memory?.assetMap && typeof memory.assetMap === 'object' ? memory.assetMap : {},
    triggerLog: memory?.triggerLog && typeof memory.triggerLog === 'object' ? memory.triggerLog : {},
  };
}

function sanitizeDigestMemory(memory) {
  return {
    queued: Array.isArray(memory?.queued) ? memory.queued.filter(Boolean).slice(0, 20) : [],
    lastSentAt: memory?.lastSentAt || null,
  };
}

function sanitizeEmailDeliveryMemory(memory) {
  const sentLog = memory?.sentLog && typeof memory.sentLog === 'object' ? memory.sentLog : {};
  const recent = Array.isArray(memory?.recent)
    ? memory.recent.filter(Boolean).map((event) => ({
        id: String(event?.id || ''),
        symbol: String(event?.symbol || ''),
        title: String(event?.title || event?.summary || 'Alert update'),
        summary: String(event?.summary || event?.title || ''),
        channel: String(event?.channel || 'email'),
        sentAt: event?.sentAt || event?.emailedAt || new Date().toISOString(),
        emailedAt: event?.emailedAt || event?.sentAt || null,
      })).filter((event) => event.id || event.symbol || event.summary).slice(0, 25)
    : [];

  return {
    sentLog,
    recent,
  };
}


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
  if (typeof window === 'undefined') return sanitizeAlertMemory();
  try {
    return sanitizeAlertMemory(JSON.parse(window.localStorage.getItem(ALERT_MEMORY_KEY) || '{\"assetMap\":{},\"triggerLog\":{}}'));
  } catch {
    return sanitizeAlertMemory();
  }
}

export function writeAlertMemory(memory) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ALERT_MEMORY_KEY, JSON.stringify(sanitizeAlertMemory(memory)));
  } catch {}
}

export function readDigestMemory() {
  if (typeof window === 'undefined') return sanitizeDigestMemory();
  try {
    return sanitizeDigestMemory(JSON.parse(window.localStorage.getItem(DIGEST_MEMORY_KEY) || '{\"queued\":[],\"lastSentAt\":null}'));
  } catch {
    return sanitizeDigestMemory();
  }
}

export function writeDigestMemory(memory) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DIGEST_MEMORY_KEY, JSON.stringify(sanitizeDigestMemory(memory)));
  } catch {}
}

export function readEmailDeliveryMemory() {
  if (typeof window === 'undefined') return sanitizeEmailDeliveryMemory();
  try {
    return sanitizeEmailDeliveryMemory(JSON.parse(window.localStorage.getItem(EMAIL_DELIVERY_MEMORY_KEY) || '{"sentLog":{},"recent":[]}'));
  } catch {
    return sanitizeEmailDeliveryMemory();
  }
}

export function writeEmailDeliveryMemory(memory) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(EMAIL_DELIVERY_MEMORY_KEY, JSON.stringify(sanitizeEmailDeliveryMemory(memory)));
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



function normalizeLevelFromDelta(delta = 0) {
  return delta >= 0 ? 'positive' : 'warning';
}

export function buildMeaningfulChangeAlerts(previousMap = {}, currentMap = {}, watchlist = []) {
  const watchSet = new Set((Array.isArray(watchlist) ? watchlist : []).map((item) => String(item || '').toUpperCase()));
  const events = [];

  Object.values(currentMap || {}).forEach((asset) => {
    if (!asset?.symbol) return;
    const previous = previousMap?.[asset.symbol];
    if (!previous) return;

    const convictionDelta = Math.round(Number(asset.conviction || 0) - Number(previous.conviction || 0));
    const isWatch = watchSet.has(asset.symbol);
    const confidenceThreshold = isWatch ? 5 : 8;

    if (Math.abs(convictionDelta) >= confidenceThreshold) {
      events.push({
        id: `meaningful:${asset.symbol}:conviction:${asset.conviction}:${previous.conviction}`,
        source: 'system',
        level: normalizeLevelFromDelta(convictionDelta),
        priority: isWatch ? 5 : 2,
        symbol: asset.symbol,
        title: `${asset.symbol} confidence ${convictionDelta > 0 ? 'changed higher' : 'moved lower'}`,
        body: `${asset.symbol} confidence ${convictionDelta > 0 ? 'rose' : 'fell'} from ${Math.round(previous.conviction || 0)} to ${Math.round(asset.conviction || 0)}`,
        text: `${asset.symbol} confidence ${convictionDelta > 0 ? 'rose' : 'fell'} by ${Math.abs(convictionDelta)} points`,
        posture: asset.signalLabel || asset.sentiment || 'Signal',
        confidence: Math.round(asset.conviction || 0),
        previousConfidence: Math.round(previous.conviction || 0),
        delta: convictionDelta,
        isWatchlist: isWatch,
        triggeredAt: new Date().toISOString(),
      });
    }

    if (previous.signalLabel && asset.signalLabel && previous.signalLabel !== asset.signalLabel) {
      events.push({
        id: `meaningful:${asset.symbol}:label:${previous.signalLabel}:${asset.signalLabel}`,
        source: 'system',
        level: asset.sentiment === 'bearish' ? 'warning' : 'watch',
        priority: isWatch ? 5 : 3,
        symbol: asset.symbol,
        title: `${asset.symbol} posture changed`,
        body: `${previous.signalLabel} → ${asset.signalLabel}`,
        text: `${asset.symbol} changed from ${previous.signalLabel} to ${asset.signalLabel}`,
        posture: asset.signalLabel,
        confidence: Math.round(asset.conviction || 0),
        previousPosture: previous.signalLabel,
        isWatchlist: isWatch,
        triggeredAt: new Date().toISOString(),
      });
    }

    if (previous.sentiment && asset.sentiment && previous.sentiment !== asset.sentiment) {
      events.push({
        id: `meaningful:${asset.symbol}:sentiment:${previous.sentiment}:${asset.sentiment}`,
        source: 'system',
        level: asset.sentiment === 'bearish' ? 'warning' : 'positive',
        priority: isWatch ? 5 : 3,
        symbol: asset.symbol,
        title: `${asset.symbol} sentiment flipped`,
        body: `${previous.sentiment} → ${asset.sentiment}`,
        text: `${asset.symbol} moved from ${previous.sentiment} to ${asset.sentiment}`,
        posture: asset.signalLabel || asset.sentiment,
        confidence: Math.round(asset.conviction || 0),
        isWatchlist: isWatch,
        triggeredAt: new Date().toISOString(),
      });
    }
  });

  const seen = new Set();
  return events.filter((event) => {
    if (!event?.id || seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
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

function buildDeliveryFingerprint(alert) {
  const confidence = alert?.confidence != null ? Math.round(Number(alert.confidence || 0)) : 'na';
  return [
    alert?.symbol || 'MARKET',
    alert?.source || 'system',
    alert?.title || '',
    alert?.body || alert?.text || '',
    alert?.posture || '',
    confidence,
  ].join('|');
}

export function selectDeliverableAlerts(events = [], options = {}) {
  const scope = options.scope === 'all' ? 'all' : 'watchlist';
  const memory = sanitizeEmailDeliveryMemory(options.memory || {});
  const sentLog = { ...memory.sentLog };
  const now = Date.now();
  const cooldownMs = clamp(Number(options.cooldownMinutes || 180), 15, 1440) * 60 * 1000;
  const deliverable = [];

  (Array.isArray(events) ? events : []).forEach((event) => {
    if (!event) return;
    if (scope === 'watchlist' && !event.isWatchlist) return;
    if (event.source === 'system' && Number(event.priority || 0) < 3) return;

    const fingerprint = buildDeliveryFingerprint(event);
    const previousAt = sentLog[fingerprint];
    if (previousAt && now - new Date(previousAt).getTime() < cooldownMs) return;

    sentLog[fingerprint] = new Date(now).toISOString();
    deliverable.push({
      ...event,
      emailFingerprint: fingerprint,
      emailEligible: true,
    });
  });

  return {
    alerts: deliverable.slice(0, 6),
    memory: sanitizeEmailDeliveryMemory({ ...memory, sentLog }),
  };
}

export function recordEmailDelivery(memory = {}, alerts = [], meta = {}) {
  const safeMemory = sanitizeEmailDeliveryMemory(memory);
  const sentAt = meta.sentAt || new Date().toISOString();
  const channel = meta.mode === 'mock' ? 'mock' : 'email';
  const entries = (Array.isArray(alerts) ? alerts : []).filter(Boolean).map((alert) => ({
    id: `${alert.id || alert.emailFingerprint || alert.symbol || 'alert'}:${sentAt}`,
    symbol: alert.symbol || 'Market',
    title: alert.title || 'Signal alert sent',
    body: alert.body || alert.text || 'A Midnight Signal alert was delivered.',
    posture: alert.posture || alert.signalLabel || 'Signal',
    confidence: alert.confidence != null ? Math.round(Number(alert.confidence || 0)) : null,
    sentAt,
    channel,
  }));
  return sanitizeEmailDeliveryMemory({
    sentLog: safeMemory.sentLog,
    recent: [...entries, ...safeMemory.recent].slice(0, 12),
  });
}
