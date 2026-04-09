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


function getSeverityLabel(priority = 1) {
  if (priority >= 6) return 'Priority';
  if (priority >= 5) return 'High';
  if (priority >= 3) return 'Medium';
  return 'Low';
}

function classifyAlertLevel({ delta = 0, sentiment = '', priority = 1, catalystStrength = 0, alignment = 1 }) {
  const magnitude = Math.abs(Number(delta || 0));
  if (priority >= 6 || catalystStrength >= 3 || alignment >= 3) return 'critical';
  if (priority >= 5 || magnitude >= 12) return sentiment === 'bearish' ? 'warning' : 'critical';
  if (priority >= 3 || magnitude >= 7) return sentiment === 'bearish' ? 'warning' : 'watch';
  return delta >= 0 ? 'positive' : 'warning';
}

function buildAlertNarrative(asset, previous, options = {}) {
  const alignment = Number(options.alignment || 1);
  const catalystStrength = Number(options.catalystStrength || 0);
  const watchListPriority = options.isWatch ? 'Watchlist priority.' : '';
  const postureLine = previous?.signalLabel && asset?.signalLabel && previous.signalLabel !== asset.signalLabel
    ? `Posture flipped from ${previous.signalLabel} to ${asset.signalLabel}.`
    : asset?.signalLabel
      ? `${asset.signalLabel} posture remains in focus.`
      : '';
  const confidenceLine = options.delta != null
    ? `Confidence moved from ${Math.round(previous?.conviction || 0)} to ${Math.round(asset?.conviction || 0)}.`
    : asset?.conviction != null
      ? `Confidence is now ${Math.round(asset.conviction || 0)}%.`
      : '';
  const whyNow = alignment >= 3
    ? 'Why now: 5m, 15m, and 1h are aligned.'
    : alignment >= 2
      ? 'Why now: short and medium timeframes are lining up.'
      : catalystStrength >= 2
        ? 'Why now: catalyst context is reinforcing the move.'
        : 'Why now: the move cleared the meaningful-change threshold.';
  const watchNext = asset?.sentiment === 'bearish'
    ? 'Watch next: look for downside follow-through or a failed bounce.'
    : 'Watch next: look for confirmation on the next cycle.';
  return [watchListPriority, postureLine, confidenceLine, whyNow, watchNext].filter(Boolean).join(' ');
}

function countAlignmentSignals(asset, previous) {
  let count = 0;
  const change = Number(asset?.change24h || 0);
  const conviction = Number(asset?.conviction || 0);
  const previousConviction = Number(previous?.conviction || 0);
  if ((conviction >= 65 && change >= 0) || (conviction <= 40 && change <= 0)) count += 1;
  if (Math.abs(conviction - previousConviction) >= 8) count += 1;
  if (asset?.sentiment && asset?.signalLabel && String(asset.signalLabel).toLowerCase().includes(String(asset.sentiment).toLowerCase().replace('ish',''))) count += 1;
  return Math.max(1, Math.min(count, 3));
}

function inferCatalystStrength(asset) {
  const story = String(asset?.story || '').toLowerCase();
  let score = 0;
  if (story.includes('catalyst') || story.includes('news') || story.includes('breakout')) score += 1;
  if (story.includes('regime') || story.includes('leadership') || story.includes('momentum')) score += 1;
  if (story.includes('volatility') || story.includes('recovery') || story.includes('follow-through')) score += 1;
  return Math.min(score, 3);
}

function shouldSuppressRepeat(previous, asset, isWatch) {
  const convictionDelta = Math.abs(Math.round(Number(asset?.conviction || 0) - Number(previous?.conviction || 0)));
  if (isWatch) return convictionDelta < 5 && previous?.signalLabel === asset?.signalLabel && previous?.sentiment === asset?.sentiment;
  return convictionDelta < 8 && previous?.signalLabel === asset?.signalLabel && previous?.sentiment === asset?.sentiment;
}

export function buildMeaningfulChangeAlerts(previousMap = {}, currentMap = {}, watchlist = []) {
  const watchSet = new Set((Array.isArray(watchlist) ? watchlist : []).map((item) => String(item || '').toUpperCase()));
  const events = [];

  Object.values(currentMap || {}).forEach((asset) => {
    if (!asset?.symbol) return;
    const previous = previousMap?.[asset.symbol];
    if (!previous) return;

    const isWatch = watchSet.has(asset.symbol);
    if (shouldSuppressRepeat(previous, asset, isWatch)) return;

    const convictionDelta = Math.round(Number(asset.conviction || 0) - Number(previous.conviction || 0));
    const confidenceThreshold = isWatch ? 5 : 8;
    const alignment = countAlignmentSignals(asset, previous);
    const catalystStrength = inferCatalystStrength(asset);
    const postureChanged = previous.signalLabel && asset.signalLabel && previous.signalLabel !== asset.signalLabel;
    const sentimentChanged = previous.sentiment && asset.sentiment && previous.sentiment !== asset.sentiment;
    const majorShift = Math.abs(convictionDelta) >= 12 || postureChanged || sentimentChanged;
    const catalystBackedMove = catalystStrength >= 2 && Math.abs(convictionDelta) >= Math.max(confidenceThreshold - 2, 4);
    const alignedMove = alignment >= 2 && Math.abs(convictionDelta) >= Math.max(confidenceThreshold - 1, 4);

    if (!(Math.abs(convictionDelta) >= confidenceThreshold || postureChanged || sentimentChanged || catalystBackedMove || alignedMove)) {
      return;
    }

    const basePriority = isWatch ? 5 : 2;
    const priority = basePriority + (majorShift ? 1 : 0) + (catalystBackedMove ? 1 : 0);
    const severity = getSeverityLabel(priority);
    const level = classifyAlertLevel({
      delta: convictionDelta,
      sentiment: asset.sentiment,
      priority,
      catalystStrength,
      alignment,
    });
    const rationale = buildAlertNarrative(asset, previous, {
      delta: convictionDelta,
      isWatch,
      alignment,
      catalystStrength,
    });
    const why = alignment >= 2
      ? `${alignment === 3 ? '5m / 15m / 1h' : '15m / 1h'} aligned`
      : catalystStrength >= 2
        ? 'catalyst context improved'
        : convictionDelta >= 0
          ? 'confidence accelerated'
          : 'confidence faded';
    const watchNext = asset.sentiment === 'bearish'
      ? 'Watch for support failure or a fast reversal attempt.'
      : 'Watch for follow-through and next-cycle confirmation.';

    if (Math.abs(convictionDelta) >= confidenceThreshold) {
      events.push({
        id: `meaningful:${asset.symbol}:conviction:${asset.conviction}:${previous.conviction}`,
        source: 'system',
        level,
        severity,
        priority,
        symbol: asset.symbol,
        title: `${asset.symbol} ${convictionDelta > 0 ? 'strengthened' : 'weakened'}`,
        body: `${asset.symbol} confidence ${convictionDelta > 0 ? 'rose' : 'fell'} from ${Math.round(previous.conviction || 0)} to ${Math.round(asset.conviction || 0)}. ${why}.`,
        text: `${asset.symbol} confidence ${convictionDelta > 0 ? 'rose' : 'fell'} by ${Math.abs(convictionDelta)} points`,
        rationale,
        whyNow: why,
        watchNext,
        posture: asset.signalLabel || asset.sentiment || 'Signal',
        confidence: Math.round(asset.conviction || 0),
        previousConfidence: Math.round(previous.conviction || 0),
        delta: convictionDelta,
        alignment,
        catalystStrength,
        isWatchlist: isWatch,
        emailEligible: majorShift || alignedMove || catalystBackedMove,
        triggeredAt: new Date().toISOString(),
      });
    }

    if (postureChanged) {
      events.push({
        id: `meaningful:${asset.symbol}:label:${previous.signalLabel}:${asset.signalLabel}`,
        source: 'system',
        level: classifyAlertLevel({ delta: convictionDelta, sentiment: asset.sentiment, priority: priority + 1, catalystStrength, alignment }),
        severity: getSeverityLabel(priority + 1),
        priority: priority + 1,
        symbol: asset.symbol,
        title: `${asset.symbol} posture changed`,
        body: `${previous.signalLabel} → ${asset.signalLabel}. ${why}.`,
        text: `${asset.symbol} changed from ${previous.signalLabel} to ${asset.signalLabel}`,
        rationale,
        whyNow: why,
        watchNext,
        posture: asset.signalLabel,
        confidence: Math.round(asset.conviction || 0),
        previousPosture: previous.signalLabel,
        alignment,
        catalystStrength,
        isWatchlist: isWatch,
        emailEligible: true,
        triggeredAt: new Date().toISOString(),
      });
    }

    if (sentimentChanged) {
      events.push({
        id: `meaningful:${asset.symbol}:sentiment:${previous.sentiment}:${asset.sentiment}`,
        source: 'system',
        level: classifyAlertLevel({ delta: convictionDelta, sentiment: asset.sentiment, priority: priority + 1, catalystStrength, alignment }),
        severity: getSeverityLabel(priority + 1),
        priority: priority + 1,
        symbol: asset.symbol,
        title: `${asset.symbol} sentiment flipped`,
        body: `${previous.sentiment} → ${asset.sentiment}. ${why}.`,
        text: `${asset.symbol} moved from ${previous.sentiment} to ${asset.sentiment}`,
        rationale,
        whyNow: why,
        watchNext,
        posture: asset.signalLabel || asset.sentiment,
        confidence: Math.round(asset.conviction || 0),
        alignment,
        catalystStrength,
        isWatchlist: isWatch,
        emailEligible: true,
        triggeredAt: new Date().toISOString(),
      });
    }
  });

  const uniqueBySymbol = new Map();
  events.forEach((event) => {
    if (!event?.id) return;
    const key = `${event.symbol || 'MARKET'}:${event.title}`;
    const existing = uniqueBySymbol.get(key);
    if (!existing || Number(event.priority || 0) > Number(existing.priority || 0)) {
      uniqueBySymbol.set(key, event);
    }
  });

  return Array.from(uniqueBySymbol.values())
    .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0))
    .slice(0, 12);
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
      severity: 'High',
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
      severity: 'Medium',
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
      severity: 'Medium',
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
    if (event.emailEligible === false) return;
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
