import type { AssetSignal, SignalLabel, TraderMode } from './signals';

export type SignalDirection = 'long' | 'short' | 'watch';
export type PerformanceOutcome = 'win' | 'loss' | 'neutral';

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

export function summarizePerformance(results: SignalResult[]): PerformanceSummary {
  const totalSignals = results.length;
  const wins = results.filter(result => result.outcome === 'win').length;
  const losses = results.filter(result => result.outcome === 'loss').length;
  const neutrals = results.filter(result => result.outcome === 'neutral').length;
  const decisive = Math.max(wins + losses, 1);
  const winRate = Math.round((wins / decisive) * 100);
  const avgReturn = Number((results.reduce((sum, result) => sum + result.returnPct, 0) / Math.max(totalSignals, 1)).toFixed(2));
  const totalReturn = Number(results.reduce((sum, result) => sum + result.returnPct, 0).toFixed(2));
  const best = results.reduce((current, result) => result.returnPct > current.returnPct ? result : current, results[0]);
  const worst = results.reduce((current, result) => result.returnPct < current.returnPct ? result : current, results[0]);
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

export function outcomeLabel(outcome: PerformanceOutcome) {
  if (outcome === 'win') return 'Win';
  if (outcome === 'loss') return 'Loss';
  return 'Neutral';
}
