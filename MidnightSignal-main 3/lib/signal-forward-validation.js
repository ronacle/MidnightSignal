const STORAGE_KEY = 'ms_forward_validation_v1';

export function readForwardValidation() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeForwardValidation(entries) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

function findOpenIndex(entries, symbol) {
  return entries.findIndex((entry) => entry.symbol === symbol && entry.status === 'open');
}

export function upsertForwardSignal(currentEntries, asset, regime, source) {
  if (!asset) return currentEntries || [];

  const entries = Array.isArray(currentEntries) ? [...currentEntries] : [];
  const idx = findOpenIndex(entries, asset.symbol);

  if (idx === -1) {
    entries.unshift({
      id: `${asset.symbol}-${Date.now()}`,
      symbol: asset.symbol,
      score: asset.signalScore ?? asset.conviction ?? null,
      regime: regime || asset.marketRegime || 'Mixed',
      source: source || 'fallback',
      entryPrice: asset.price ?? null,
      entryAt: new Date().toISOString(),
      status: 'open',
      checkpoints: {}
    });
  } else {
    const existing = entries[idx];
    entries[idx] = {
      ...existing,
      score: asset.signalScore ?? existing.score,
      regime: regime || existing.regime,
      source: source || existing.source,
      entryPrice: existing.entryPrice ?? asset.price ?? null
    };
  }

  return entries.slice(0, 40);
}

export function updateForwardCheckpoints(entries, liveItems = []) {
  const liveBySymbol = new Map((liveItems || []).map((item) => [item.symbol, item]));
  const now = Date.now();

  return (entries || []).map((entry) => {
    if (entry.status !== 'open') return entry;
    const live = liveBySymbol.get(entry.symbol);
    if (!live || typeof live.price !== 'number' || typeof entry.entryPrice !== 'number') return entry;

    const elapsedMs = now - new Date(entry.entryAt).getTime();
    const checkpoints = { ...(entry.checkpoints || {}) };

    const targets = [
      ['1h', 60 * 60 * 1000],
      ['4h', 4 * 60 * 60 * 1000],
      ['24h', 24 * 60 * 60 * 1000],
    ];

    targets.forEach(([label, threshold]) => {
      if (!checkpoints[label] && elapsedMs >= threshold) {
        const returnPct = ((live.price - entry.entryPrice) / entry.entryPrice) * 100;
        checkpoints[label] = {
          price: live.price,
          returnPct: Number(returnPct.toFixed(2)),
          checkedAt: new Date().toISOString()
        };
      }
    });

    const status = checkpoints['24h'] ? 'closed' : 'open';

    return {
      ...entry,
      latestPrice: live.price,
      checkpoints,
      status
    };
  });
}

function average(values) {
  if (!values.length) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

export function buildForwardScorecard(entries = []) {
  const closed = entries.filter((entry) => entry.status === 'closed' || entry.checkpoints?.['1h'] || entry.checkpoints?.['4h'] || entry.checkpoints?.['24h']);
  const oneHour = closed.map((entry) => entry.checkpoints?.['1h']?.returnPct).filter((value) => typeof value === 'number');
  const fourHour = closed.map((entry) => entry.checkpoints?.['4h']?.returnPct).filter((value) => typeof value === 'number');
  const day = closed.map((entry) => entry.checkpoints?.['24h']?.returnPct).filter((value) => typeof value === 'number');

  const directionalPool = oneHour.concat(fourHour, day);
  const hitRate = directionalPool.length
    ? Math.round((directionalPool.filter((value) => value > 0).length / directionalPool.length) * 100)
    : null;

  const regimeBuckets = {};
  closed.forEach((entry) => {
    if (!entry.regime) return;
    regimeBuckets[entry.regime] = regimeBuckets[entry.regime] || [];
    ['1h', '4h', '24h'].forEach((key) => {
      const value = entry.checkpoints?.[key]?.returnPct;
      if (typeof value === 'number') regimeBuckets[entry.regime].push(value);
    });
  });

  const regimePerformance = Object.entries(regimeBuckets).map(([regime, values]) => ({
    regime,
    avgReturn: average(values),
    samples: values.length
  }));

  return {
    trackedSignals: entries.length,
    scoredSignals: closed.length,
    hitRate,
    avg1h: average(oneHour),
    avg4h: average(fourHour),
    avg24h: average(day),
    regimePerformance
  };
}
