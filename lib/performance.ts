import type { AssetSignal, SignalLabel, TraderMode } from './signals';

export type SignalDirection = 'long' | 'short' | 'watch';
export type PerformanceOutcome = 'win' | 'loss' | 'neutral';
export type ConfidenceTier = 'High' | 'Medium' | 'Low';

export type SignalResult = {
  id: string;
  symbol: string;
  name: string;
  label: SignalLabel;
  direction: SignalDirection;
  mode: TraderMode;
  confidence: number;
  entryPrice: number;
  exitPrice: number;
  returnPct: number;
  outcome: PerformanceOutcome;
  openedAt: string;
  closedAt: string;
  note: string;
};

export type PerformanceSummary = {
  totalSignals: number;
  wins: number;
  losses: number;
  neutrals: number;
  winRate: number;
  avgReturn: number;
  totalReturn: number;
  best: SignalResult;
  worst: SignalResult;
  currentStreak: number;
  currentStreakType: PerformanceOutcome;
  confidenceAccuracy: number;
  proEdge: string;
};

export type AnalyticsBreakdown = {
  key: string;
  label: string;
  total: number;
  wins: number;
  losses: number;
  neutrals: number;
  winRate: number;
  avgReturn: number;
  bestReturn: number;
  worstReturn: number;
};

export type ProPerformanceAnalytics = {
  bySymbol: AnalyticsBreakdown[];
  byConfidenceTier: AnalyticsBreakdown[];
  byMode: AnalyticsBreakdown[];
  windows: { label: string; summary: PerformanceSummary }[];
  averageHoldHours: number;
  bestReceipt: SignalResult;
  worstReceipt: SignalResult;
};

const DAY = 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hash(input: string) {
  return Array.from(input).reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 17), 0);
}

function directionFor(label: SignalLabel): SignalDirection {
  if (label === 'Bullish') return 'long';
  if (label === 'Bearish') return 'short';
  return 'watch';
}

function outcomeFromReturn(returnPct: number): PerformanceOutcome {
  if (returnPct >= 0.75) return 'win';
  if (returnPct <= -0.75) return 'loss';
  return 'neutral';
}

function resultNote(result: Pick<SignalResult, 'symbol' | 'outcome' | 'returnPct' | 'direction'>) {
  if (result.outcome === 'win') return `${result.symbol} validated the ${result.direction} posture with a ${result.returnPct.toFixed(2)}% simulated move.`;
  if (result.outcome === 'loss') return `${result.symbol} broke against the read by ${Math.abs(result.returnPct).toFixed(2)}%, flagging this setup for review.`;
  return `${result.symbol} stayed near entry, so the signal is scored neutral instead of forced into a win/loss.`;
}

export function confidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= 72) return 'High';
  if (confidence >= 58) return 'Medium';
  return 'Low';
}

export function formatHoldTime(openedAt: string, closedAt: string) {
  const opened = new Date(openedAt).getTime();
  const closed = new Date(closedAt).getTime();
  const hours = Math.max(0, (closed - opened) / (1000 * 60 * 60));
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${Number(hours.toFixed(hours < 10 ? 1 : 0))}h`;
  return `${Number((hours / 24).toFixed(1))}d`;
}

export function buildSignalReceiptText(result: SignalResult) {
  const verb = result.outcome === 'win' ? 'validated' : result.outcome === 'loss' ? 'failed' : 'paused';
  return `${result.symbol} ${result.direction.toUpperCase()} ${verb}: ${result.entryPrice} → ${result.exitPrice} (${result.returnPct >= 0 ? '+' : ''}${result.returnPct}%) after ${formatHoldTime(result.openedAt, result.closedAt)}.`;
}

export function buildSignalResults(signals: AssetSignal[], mode: TraderMode): SignalResult[] {
  const now = Date.now();
  const ordered = signals.slice(0, 12);

  return Array.from({ length: 36 }).map((_, index) => {
    const signal = ordered[index % ordered.length];
    const direction = directionFor(signal.label);
    const seed = hash(`${signal.symbol}-${mode}-${index}`);
    const confidenceBias = (signal.confidence - 55) / 18;
    const marketMove = direction === 'watch'
      ? ((seed % 180) - 90) / 100
      : ((seed % 560) - 220) / 100 + confidenceBias;
    const signedMove = direction === 'short' ? -marketMove : marketMove;
    const returnPct = Number(clamp(signedMove, -8.5, 9.5).toFixed(2));
    const entryPrice = signal.price / (1 + signal.change24h / 100 || 1);
    const exitPrice = direction === 'short'
      ? entryPrice * (1 - returnPct / 100)
      : entryPrice * (1 + returnPct / 100);
    const outcome = outcomeFromReturn(returnPct);
    const openedAt = new Date(now - (index + 1) * DAY).toISOString();
    const closedAt = new Date(now - index * DAY).toISOString();

    const result = {
      id: `${signal.symbol}-${mode}-${index}`,
      symbol: signal.symbol,
      name: signal.name,
      label: signal.label,
      direction,
      mode,
      confidence: signal.confidence,
      entryPrice: Number(entryPrice.toFixed(signal.price < 1 ? 4 : 2)),
      exitPrice: Number(exitPrice.toFixed(signal.price < 1 ? 4 : 2)),
      returnPct,
      outcome,
      openedAt,
      closedAt,
      note: ''
    } satisfies SignalResult;

    return { ...result, note: resultNote(result) };
  });
}

const emptyResult: SignalResult = {
  id: 'empty',
  symbol: 'N/A',
  name: 'No settled signal yet',
  label: 'Neutral',
  direction: 'watch',
  mode: 'swing',
  confidence: 0,
  entryPrice: 0,
  exitPrice: 0,
  returnPct: 0,
  outcome: 'neutral',
  openedAt: new Date(0).toISOString(),
  closedAt: new Date(0).toISOString(),
  note: 'No settled performance receipt is available yet.'
};

export function summarizePerformance(results: SignalResult[]): PerformanceSummary {
  const safeResults = results.length ? results : [emptyResult];
  const totalSignals = results.length;
  const wins = results.filter(result => result.outcome === 'win').length;
  const losses = results.filter(result => result.outcome === 'loss').length;
  const neutrals = results.filter(result => result.outcome === 'neutral').length;
  const decisive = Math.max(wins + losses, 1);
  const winRate = Math.round((wins / decisive) * 100);
  const avgReturn = Number((results.reduce((sum, result) => sum + result.returnPct, 0) / Math.max(totalSignals, 1)).toFixed(2));
  const totalReturn = Number(results.reduce((sum, result) => sum + result.returnPct, 0).toFixed(2));
  const best = safeResults.reduce((current, result) => result.returnPct > current.returnPct ? result : current, safeResults[0]);
  const worst = safeResults.reduce((current, result) => result.returnPct < current.returnPct ? result : current, safeResults[0]);
  const currentStreakType = results[0]?.outcome || 'neutral';
  const currentStreak = results.findIndex(result => result.outcome !== currentStreakType);
  const highConfidence = results.filter(result => result.confidence >= 67);
  const confidenceAccuracy = Math.round((highConfidence.filter(result => result.outcome === 'win').length / Math.max(highConfidence.length, 1)) * 100);
  const proEdge = confidenceAccuracy >= winRate
    ? 'High-confidence signals are outperforming the broader signal set.'
    : 'High-confidence signals need review against recent market chop.';

  return {
    totalSignals,
    wins,
    losses,
    neutrals,
    winRate,
    avgReturn,
    totalReturn,
    best,
    worst,
    currentStreak: currentStreak === -1 ? totalSignals : currentStreak,
    currentStreakType,
    confidenceAccuracy,
    proEdge
  };
}

function buildBreakdown(label: string, key: string, rows: SignalResult[]): AnalyticsBreakdown {
  const summary = summarizePerformance(rows);
  return {
    key,
    label,
    total: rows.length,
    wins: summary.wins,
    losses: summary.losses,
    neutrals: summary.neutrals,
    winRate: summary.winRate,
    avgReturn: summary.avgReturn,
    bestReturn: summary.best.returnPct,
    worstReturn: summary.worst.returnPct
  };
}

function groupBy(results: SignalResult[], keyFn: (result: SignalResult) => string, labelFn: (key: string) => string) {
  const groups = new Map<string, SignalResult[]>();
  for (const result of results) {
    const key = keyFn(result);
    groups.set(key, [...(groups.get(key) || []), result]);
  }
  return Array.from(groups.entries())
    .map(([key, rows]) => buildBreakdown(labelFn(key), key, rows))
    .sort((a, b) => b.total - a.total || b.winRate - a.winRate);
}

export function buildProPerformanceAnalytics(results: SignalResult[]): ProPerformanceAnalytics {
  const safeResults = results.length ? results : [emptyResult];
  const now = Date.now();
  const windows = [
    { label: '7D', ms: 7 * DAY },
    { label: '30D', ms: 30 * DAY },
    { label: '90D', ms: 90 * DAY }
  ].map(window => ({
    label: window.label,
    summary: summarizePerformance(results.filter(result => now - new Date(result.closedAt).getTime() <= window.ms))
  }));

  const averageHoldHours = Number((safeResults.reduce((sum, result) => {
    const opened = new Date(result.openedAt).getTime();
    const closed = new Date(result.closedAt).getTime();
    return sum + Math.max(0, (closed - opened) / (1000 * 60 * 60));
  }, 0) / Math.max(safeResults.length, 1)).toFixed(1));

  const bestReceipt = safeResults.reduce((current, result) => result.returnPct > current.returnPct ? result : current, safeResults[0]);
  const worstReceipt = safeResults.reduce((current, result) => result.returnPct < current.returnPct ? result : current, safeResults[0]);

  return {
    bySymbol: groupBy(results, result => result.symbol, key => key).slice(0, 8),
    byConfidenceTier: groupBy(results, result => confidenceTier(result.confidence), key => `${key} confidence`),
    byMode: groupBy(results, result => result.mode, key => `${key[0].toUpperCase()}${key.slice(1)} mode`),
    windows,
    averageHoldHours,
    bestReceipt,
    worstReceipt
  };
}

export function outcomeLabel(outcome: PerformanceOutcome) {
  if (outcome === 'win') return 'Win';
  if (outcome === 'loss') return 'Loss';
  return 'Neutral';
}
