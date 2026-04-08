export function mergeState(base, incoming) {
  return {
    ...base,
    ...(incoming || {}),
    watchlist: Array.isArray(incoming?.watchlist) && incoming.watchlist.length
      ? [...new Set(incoming.watchlist)]
      : base.watchlist
  };
}

export function formatTime(value) {
  if (!value) return 'Not yet synced';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  } catch {
    return 'Not yet synced';
  }
}

export function formatPrice(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  if (value >= 1000) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(value);
  }
  if (value >= 1) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(value);
  }
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 6
  }).format(value);
}

export function formatPct(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function getConvictionTier(value) {
  if (value >= 75) return 'High conviction';
  if (value >= 55) return 'Moderate conviction';
  return 'Cautious conviction';
}
