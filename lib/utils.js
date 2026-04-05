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

export function getConvictionTier(value) {
  if (value >= 75) return 'High conviction';
  if (value >= 55) return 'Moderate conviction';
  return 'Cautious conviction';
}
