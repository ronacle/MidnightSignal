const STORAGE_KEY = 'ms_adaptive_weights_v1';

const BASE_WEIGHTS = {
  Trending: { momentum: 0.34, trend: 0.20, volume: 0.14, relativeStrength: 0.20, volatility: 0.12 },
  Chop: { momentum: 0.20, trend: 0.20, volume: 0.14, relativeStrength: 0.16, volatility: 0.30 },
  Directional: { momentum: 0.30, trend: 0.18, volume: 0.14, relativeStrength: 0.24, volatility: 0.14 },
  Mixed: { momentum: 0.30, trend: 0.20, volume: 0.15, relativeStrength: 0.20, volatility: 0.15 },
};

const FACTOR_MAP = {
  '1h': 'momentum',
  '4h': 'trend',
  '24h': 'relativeStrength',
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeWeights(weights) {
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (!total) return weights;
  return Object.fromEntries(
    Object.entries(weights).map(([key, value]) => [key, Number((value / total).toFixed(4))])
  );
}

export function readAdaptiveWeights() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeAdaptiveWeights(value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {}
}

export function deriveAdaptiveWeights(forwardEntries = []) {
  const grouped = {
    Trending: [],
    Chop: [],
    Directional: [],
    Mixed: [],
  };

  (forwardEntries || []).forEach((entry) => {
    const regime = entry?.regime || 'Mixed';
    if (!grouped[regime]) grouped[regime] = [];
    grouped[regime].push(entry);
  });

  const derived = {};

  Object.entries(BASE_WEIGHTS).forEach(([regime, base]) => {
    const entries = grouped[regime] || [];
    const next = { ...base };

    entries.forEach((entry) => {
      Object.entries(FACTOR_MAP).forEach(([checkpoint, factor]) => {
        const ret = entry?.checkpoints?.[checkpoint]?.returnPct;
        if (typeof ret !== 'number') return;

        const bump = clamp(ret / 100, -0.06, 0.06);
        next[factor] = clamp(next[factor] + bump, 0.08, 0.45);
      });

      const dayRet = entry?.checkpoints?.['24h']?.returnPct;
      if (typeof dayRet === 'number') {
        const volBump = clamp((-dayRet) / 140, -0.04, 0.04);
        next.volatility = clamp(next.volatility + volBump, 0.08, 0.34);
      }
    });

    derived[regime] = normalizeWeights(next);
  });

  return derived;
}

export function buildAdaptiveSummary(adaptiveWeights = {}) {
  const summary = [];

  Object.entries(adaptiveWeights || {}).forEach(([regime, weights]) => {
    const top = Object.entries(weights || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([key, value]) => `${key} ${(value * 100).toFixed(0)}%`);

    summary.push({
      regime,
      topDrivers: top,
      weights
    });
  });

  return summary;
}
