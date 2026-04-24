function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const ALERT_MEMORY_KEY = 'ms_alert_memory_v1';
const DIGEST_MEMORY_KEY = 'ms_alert_digest_v1';


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

function describeConfiguredAlert(alert, asset, previous, context = {}) {
  const previousDecision = context?.previousTopSignal?.decisionAction || '';
  if (alert.type === 'conviction_above') return `${asset.symbol} just strengthened through ${alert.threshold}% conviction — continuation is earning more trust.`;
  if (alert.type === 'conviction_below') return `${asset.symbol} slipped below ${alert.threshold}% conviction — the read is losing support.`;
  if (alert.type === 'conviction_building') return `${asset.symbol} conviction is building compared with the last tracked read.`;
  if (alert.type === 'conviction_weakening') return `${asset.symbol} conviction is easing compared with the last tracked read.`;
  if (alert.type === 'sentiment_bullish') return `${asset.symbol} turned bullish${previous?.sentiment ? ` from ${previous.sentiment}` : '''} — momentum is starting to align.`;
  if (alert.type === 'sentiment_bearish') return `${asset.symbol} turned bearish${previous?.sentiment ? ` from ${previous.sentiment}` : '''} — defensive posture is taking over.`;
  if (alert.type === 'lead_signal') return `${asset.symbol} became the lead signal for your current session.`;
  if (alert.type === 'decision_wait') return `${asset.symbol} decision shifted to WAIT${previousDecision ? ` from ${previousDecision}` : '''}.`;
  if (alert.type === 'decision_lean_in') return `${asset.symbol} decision shifted to LEAN IN${previousDecision ? ` from ${previousDecision}` : '''}.`;
  if (alert.type === 'decision_reduce') return `${asset.symbol} decision shifted to REDUCE${previousDecision ? ` from ${previousDecision}` : '''}.`;
  if (alert.type === 'decision_avoid') return `${asset.symbol} decision shifted to AVOID${previousDecision ? ` from ${previousDecision}` : '''}.`;
  if (alert.type === 'trigger_confirmed') return `${asset.symbol} cleared the confirmation trigger you asked Midnight Signal to watch.`;
  return `${asset.symbol} triggered a meaningful signal change.`;
}


function crossedAbove(previous, current, threshold) {
  return typeof current === 'number' && current >= threshold && (typeof previous !== 'number' || previous < threshold);
}

function crossedBelow(previous, current, threshold) {
  return typeof current === 'number' && current <= threshold && (typeof previous !== 'number' || previous > threshold);
}

function buildTriggerId(alert, asset) {
  const decisionTarget = String(alert.decisionTarget || '').replace(/\s+/g, '-');
  const thresholdPart = alert.threshold == null ? 'na' : String(alert.threshold);
  return `${alert.id}:${asset.symbol}:${alert.type}:${decisionTarget}:${thresholdPart}`;
}


function isCoolingDown(triggerLog, triggerId, cooldownMinutes) {
  const previousAt = triggerLog?.[triggerId];
  if (!previousAt) return false;
  const cooldownMs = clamp(Number(cooldownMinutes || 30), 5, 1440) * 60 * 1000;
  return Date.now() - new Date(previousAt).getTime() < cooldownMs;
}

function alertImportanceMeta(alert = {}) {
  const importance = ['critical', 'important', 'normal'].includes(alert?.importance) ? alert.importance : 'normal';
  if (importance === 'critical') return { level: 'critical', priority: 5 };
  if (importance === 'important') return { level: 'positive', priority: 4 };
  return { level: alert?.type === 'conviction_below' || alert?.type === 'conviction_weakening' || alert?.type === 'sentiment_bearish' || alert?.type === 'decision_reduce' || alert?.type === 'decision_avoid' ? 'warning' : 'watch', priority: 3 };
}

function decisionTargetForType(type = '') {
  if (type === 'decision_wait') return 'WAIT';
  if (type === 'decision_lean_in') return 'LEAN IN';
  if (type === 'decision_reduce') return 'REDUCE';
  if (type === 'decision_avoid') return 'AVOID';
  return '';
}

function alertTypeTitle(type = '') {
  if (type === 'conviction_above' || type === 'conviction_below') return 'Conviction threshold';
  if (type === 'conviction_building') return 'Conviction building';
  if (type === 'conviction_weakening') return 'Conviction easing';
  if (type === 'sentiment_bullish') return 'Bullish posture';
  if (type === 'sentiment_bearish') return 'Bearish posture';
  if (type === 'lead_signal') return 'Lead signal matched';
  if (type.startsWith('decision_')) return 'Decision rule matched';
  if (type === 'trigger_confirmed') return 'Trigger confirmed';
  return 'Custom rule matched';
}

export function evaluateConfiguredAlerts(alerts = [], previousMap = {}, currentMap = {}, options = {}) {
  const activeAlerts = (Array.isArray(alerts) ? alerts : []).filter((alert) => alert && !alert.paused && alert.symbol);
  const triggerLog = options.triggerLog || {};
  const cooldownMinutes = options.cooldownMinutes || 30;
  const topSignal = options.topSignal || null;
  const previousTopSignal = options.previousTopSignal || null;
  const decisionLayer = options.decisionLayer || null;
  const nextTriggerLog = { ...triggerLog };
  const events = [];

  for (const alert of activeAlerts) {
    const normalizedSymbol = String(alert.symbol || '').toUpperCase();
    const asset = currentMap[normalizedSymbol] || (topSignal?.symbol === normalizedSymbol ? buildAssetSnapshotMap([topSignal])[normalizedSymbol] : null);
    if (!asset) continue;
    const previous = previousMap[normalizedSymbol] || null;
    const currentDecision = decisionLayer?.decisionAction || '';
    const previousDecision = previousTopSignal?.symbol === normalizedSymbol ? previousTopSignal?.decisionAction || '' : '';
    let matched = false;

    if (alert.type === 'conviction_above') matched = crossedAbove(previous?.conviction, asset.conviction, Number(alert.threshold || 0));
    else if (alert.type === 'conviction_below') matched = crossedBelow(previous?.conviction, asset.conviction, Number(alert.threshold || 0));
    else if (alert.type === 'conviction_building') matched = convictionBehavior(previous, asset)?.mode === 'building';
    else if (alert.type === 'conviction_weakening') matched = convictionBehavior(previous, asset)?.mode === 'weakening';
    else if (alert.type === 'sentiment_bullish') matched = asset.sentiment === 'bullish' && previous?.sentiment !== 'bullish';
    else if (alert.type === 'sentiment_bearish') matched = asset.sentiment === 'bearish' && previous?.sentiment !== 'bearish';
    else if (alert.type === 'lead_signal') matched = topSignal?.symbol === normalizedSymbol && previousTopSignal?.symbol !== normalizedSymbol;
    else if (alert.type?.startsWith?.('decision_')) {
      const target = alert.decisionTarget || decisionTargetForType(alert.type);
      matched = topSignal?.symbol === normalizedSymbol && currentDecision === target && previousDecision !== target;
    } else if (alert.type === 'trigger_confirmed') {
      const conviction = Number(asset.conviction || 0);
      matched = conviction >= Number(alert.threshold || 65) && asset.sentiment !== 'bearish' && (previous?.conviction == null || Number(previous.conviction) < Number(alert.threshold || 65));
    }

    if (!matched) continue;

    const triggerId = buildTriggerId(alert, asset);
    if (isCoolingDown(triggerLog, triggerId, alert.cooldownMinutes || cooldownMinutes)) continue;

    const triggeredAt = new Date().toISOString();
    const meta = alertImportanceMeta(alert);
    const body = describeConfiguredAlert(alert, asset, previous, { decisionLayer, previousTopSignal });
    nextTriggerLog[triggerId] = triggeredAt;
    events.push({
      id: `${triggerId}:${triggeredAt}`,
      triggerId,
      source: 'configured',
      streamType: 'custom_rule',
      level: meta.level,
      priority: meta.priority,
      symbol: asset.symbol,
      title: alertTypeTitle(alert.type),
      body,
      text: body,
      posture: decisionLayer?.posture || asset.signalLabel || asset.sentiment || 'Signal',
      confidence: Math.round(asset.conviction || 0),
      alertId: alert.id,
      alertName: alert.label || '',
      triggeredAt,
      reason: alert.label ? `${alert.label} matched your saved custom rule.` : `Matched your saved ${alertTypeTitle(alert.type).toLowerCase()} rule for ${asset.symbol}.`,
    });
  }

  return { events, triggerLog: nextTriggerLog };
}


function convictionBehavior(previous, current) {
  const prev = Number(previous?.conviction);
  const next = Number(current?.conviction);
  if (!Number.isFinite(prev) || !Number.isFinite(next)) return null;
  const diff = Math.round(next - prev);
  if (diff >= 6) return { mode: 'building', diff };
  if (diff <= -6) return { mode: 'weakening', diff };
  return null;
}

function alertStamp() {
  return new Date().toISOString();
}

export function buildSystemAlerts({ previousTopSignal, topSignal, previousRegime, regimeSummary, watchlistHighlights = [], decisionLayer = null }) {
  const events = [];
  const triggeredAt = alertStamp();

  if (previousTopSignal?.symbol && topSignal?.symbol && previousTopSignal.symbol !== topSignal.symbol) {
    events.push({
      id: `flip:${previousTopSignal.symbol}:${topSignal.symbol}:${String(topSignal?.signalLabel || '').replace(/\s+/g, '-')}`,
      source: 'system',
      streamType: 'lead_shift',
      level: 'critical',
      priority: 5,
      symbol: topSignal.symbol,
      title: 'Lead signal rotated',
      body: `${topSignal.symbol} replaced ${previousTopSignal.symbol} at the top for this session.`,
      text: `${topSignal.symbol} just took over from ${previousTopSignal.symbol} as the lead signal.`,
      posture: topSignal.signalLabel || 'Top signal',
      confidence: Math.round(topSignal.conviction || 0),
      triggeredAt,
    });
  }

  if (previousTopSignal?.symbol && topSignal?.symbol && previousTopSignal.symbol === topSignal.symbol) {
    const behavior = convictionBehavior(previousTopSignal, topSignal);
    if (behavior) {
      const isBuilding = behavior.mode === 'building';
      events.push({
        id: `conviction:${topSignal.symbol}:${behavior.mode}:${Math.round((topSignal.conviction || 0) / 5) * 5}`,
        source: 'system',
        streamType: 'conviction_change',
        level: isBuilding ? 'positive' : 'warning',
        priority: 4,
        symbol: topSignal.symbol,
        title: isBuilding ? 'Conviction building' : 'Conviction easing',
        body: isBuilding
          ? `${topSignal.symbol} is gaining confirmation in the current session.`
          : `${topSignal.symbol} is losing some support in the current session.`,
        text: isBuilding
          ? `${topSignal.symbol} conviction is building.`
          : `${topSignal.symbol} conviction is easing.`,
        posture: topSignal.signalLabel || 'Signal',
        confidence: Math.round(topSignal.conviction || 0),
        triggeredAt,
      });
    }
  }

  if (previousTopSignal?.decisionAction && decisionLayer?.decisionAction && previousTopSignal.decisionAction !== decisionLayer.decisionAction) {
    events.push({
      id: `decision:${topSignal?.symbol || 'market'}:${previousTopSignal.decisionAction}:${decisionLayer.decisionAction}`,
      source: 'system',
      streamType: 'decision_update',
      level: decisionLayer.decisionAction === 'LEAN IN' ? 'positive' : decisionLayer.decisionAction === 'AVOID' || decisionLayer.decisionAction === 'REDUCE' ? 'warning' : 'watch',
      priority: 4,
      symbol: topSignal?.symbol,
      title: 'Decision changed',
      body: `${previousTopSignal.decisionAction} → ${decisionLayer.decisionAction} for ${topSignal?.symbol || 'the lead signal'}.`,
      text: `Decision changed from ${previousTopSignal.decisionAction} to ${decisionLayer.decisionAction}.`,
      posture: decisionLayer.posture || topSignal?.signalLabel || 'Decision',
      confidence: Math.round(topSignal?.conviction || 0),
      triggeredAt,
    });
  }

  if (previousRegime && regimeSummary?.regime && previousRegime !== regimeSummary.regime) {
    events.push({
      id: `regime:${previousRegime}:${regimeSummary.regime}`,
      source: 'system',
      streamType: 'market_tone',
      level: 'watch',
      priority: 2,
      symbol: topSignal?.symbol,
      title: 'Market tone changed',
      body: `${String(previousRegime).replace(/-/g, ' ')} → ${String(regimeSummary.regime).replace(/-/g, ' ')}`,
      text: `Market tone shifted from ${previousRegime} to ${regimeSummary.regime}`,
      posture: regimeSummary?.regime || 'Regime',
      confidence: Math.round(topSignal?.conviction || 0),
      triggeredAt,
    });
  }

  watchlistHighlights.slice(0, 2).forEach((asset, index) => {
    const magnitude = Math.abs(Number(asset?.change24h || 0));
    if (magnitude < 3.5 && Math.abs(Number(asset?.conviction || 0) - 50) < 12) return;
    events.push({
      id: `watch:${asset.symbol}:${index}:${Math.round(magnitude)}`,
      source: 'system',
      streamType: 'watchlist_move',
      level: Number(asset.change24h || 0) >= 0 ? 'watch' : 'warning',
      priority: 1,
      symbol: asset.symbol,
      title: 'Watchlist move',
      body: `${asset.symbol} moved ${Number(asset.change24h || 0) >= 0 ? 'up' : 'down'} ${magnitude.toFixed(1)}%`,
      text: `${asset.symbol} is making a meaningful move on your watchlist`,
      posture: asset.signalLabel || asset.sentiment || 'Watchlist',
      confidence: Math.round(asset.conviction || 0),
      triggeredAt,
    });
  });

  return events;
}

export const SIGNAL_STREAM_TYPE_LABELS = {
  lead_shift: 'Lead Shift',
  conviction_change: 'Conviction Change',
  decision_update: 'Decision Update',
  trigger_hit: 'Trigger Hit',
  market_tone: 'Market Tone',
  watchlist_move: 'Watchlist Move',
  custom_rule: 'Custom Rule',
  signal_event: 'Signal Event',
};

export const SIGNAL_STREAM_DEFAULT_TYPES = Object.keys(SIGNAL_STREAM_TYPE_LABELS);

export function normalizeSignalStreamPreferences(preferences = {}) {
  const enabledTypes = Array.isArray(preferences?.enabledTypes) && preferences.enabledTypes.length
    ? preferences.enabledTypes.filter((type) => SIGNAL_STREAM_DEFAULT_TYPES.includes(type))
    : SIGNAL_STREAM_DEFAULT_TYPES;
  return {
    enabledTypes: enabledTypes.length ? enabledTypes : SIGNAL_STREAM_DEFAULT_TYPES,
    minimumImportance: ['all', 'important', 'critical'].includes(preferences?.minimumImportance) ? preferences.minimumImportance : 'all',
    watchlistOnly: Boolean(preferences?.watchlistOnly),
    quietMode: Boolean(preferences?.quietMode),
  };
}

export function inferSignalStreamType(event = {}) {
  const explicit = event?.streamType || event?.eventType || event?.kind;
  if (explicit && SIGNAL_STREAM_TYPE_LABELS[explicit]) return explicit;
  const title = String(event?.title || event?.body || event?.id || '').toLowerCase();
  if (title.includes('lead') || String(event?.id || '').startsWith('flip:')) return 'lead_shift';
  if (title.includes('conviction') || String(event?.id || '').startsWith('conviction:')) return 'conviction_change';
  if (title.includes('decision') || String(event?.id || '').startsWith('decision:')) return 'decision_update';
  if (title.includes('trigger')) return 'trigger_hit';
  if (title.includes('tone') || String(event?.id || '').startsWith('regime:')) return 'market_tone';
  if (title.includes('watchlist') || String(event?.id || '').startsWith('watch:')) return 'watchlist_move';
  if (event?.source === 'configured') return 'custom_rule';
  return 'signal_event';
}

function importanceRank(event = {}) {
  const priority = Number(event?.priority || 0);
  if (event?.level === 'critical' || priority >= 5) return 3;
  if (event?.level === 'positive' || event?.level === 'warning' || priority >= 3) return 2;
  return 1;
}

export function explainSignalStreamEvent(event = {}, preferences = {}) {
  const type = inferSignalStreamType(event);
  const prefs = normalizeSignalStreamPreferences(preferences);
  const reasons = [];
  if (SIGNAL_STREAM_TYPE_LABELS[type]) reasons.push(`${SIGNAL_STREAM_TYPE_LABELS[type]} is enabled`);
  if (prefs.minimumImportance === 'important') reasons.push('it meets your Important threshold');
  if (prefs.minimumImportance === 'critical') reasons.push('it meets your Critical threshold');
  if (prefs.watchlistOnly && event?.symbol) reasons.push(`${event.symbol} is in your watchlist`);
  if (prefs.quietMode) reasons.push('quiet mode kept only higher-signal events');
  return reasons.length ? reasons.join(' · ') : 'This event matched your current signal stream preferences.';
}

export function filterSignalStreamEvents(events = [], preferences = {}, context = {}) {
  const prefs = normalizeSignalStreamPreferences(preferences);
  const watchlist = new Set((Array.isArray(context?.watchlist) ? context.watchlist : []).map((symbol) => String(symbol).toUpperCase()));
  const minRank = prefs.minimumImportance === 'critical' ? 3 : prefs.minimumImportance === 'important' ? 2 : 1;
  const quietRank = prefs.quietMode ? 2 : 1;
  return (Array.isArray(events) ? events : [])
    .filter(Boolean)
    .map((event) => {
      const streamType = inferSignalStreamType(event);
      return {
        ...event,
        streamType,
        streamLabel: SIGNAL_STREAM_TYPE_LABELS[streamType] || 'Signal Event',
        reason: event.reason || explainSignalStreamEvent({ ...event, streamType }, prefs),
      };
    })
    .filter((event) => prefs.enabledTypes.includes(event.streamType))
    .filter((event) => importanceRank(event) >= minRank)
    .filter((event) => importanceRank(event) >= quietRank)
    .filter((event) => !prefs.watchlistOnly || !event.symbol || watchlist.has(String(event.symbol).toUpperCase()));
}
