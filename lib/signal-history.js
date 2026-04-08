const STORAGE_KEY = 'ms_signal_history_v1';

export function readSignalHistory() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeSignalHistory(entries) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

export function appendSignalSnapshot(snapshot) {
  if (typeof window === 'undefined' || !snapshot) return [];
  const current = readSignalHistory();
  const previous = current[0];

  if (
    previous &&
    previous.symbol === snapshot.symbol &&
    previous.signalScore === snapshot.signalScore
  ) {
    return current;
  }

  const next = [snapshot, ...current].slice(0, 30);
  writeSignalHistory(next);
  return next;
}

export function buildValidationSummary(entries = []) {
  if (!entries.length) {
    return {
      trackedSignals: 0,
      scoreTrend: 'No history yet',
      lastChange: 'No prior snapshot',
      directionalRead: 'Validation starts after a few updates'
    };
  }

  const latest = entries[0];
  const previous = entries[1];

  let scoreTrend = 'Stable';
  if (previous && typeof previous.signalScore === 'number' && typeof latest.signalScore === 'number') {
    const diff = latest.signalScore - previous.signalScore;
    if (diff >= 3) scoreTrend = `Improving (+${diff})`;
    else if (diff <= -3) scoreTrend = `Weakening (${diff})`;
  }

  const lastChange = previous
    ? previous.symbol === latest.symbol
      ? `Top signal unchanged (${latest.symbol})`
      : `Shifted from ${previous.symbol} to ${latest.symbol}`
    : 'First tracked snapshot';

  return {
    trackedSignals: entries.length,
    scoreTrend,
    lastChange,
    directionalRead: entries.length >= 3
      ? 'Enough snapshots collected to begin directional checking scaffolding.'
      : 'Collect a few more snapshots to start judging consistency.'
  };
}
