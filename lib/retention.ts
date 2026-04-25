export type RetentionSignalInput = {
  symbol: string;
  name?: string;
  label?: string;
  confidence?: number;
  winRate?: number;
  returnPct?: number;
};

export type DailyDigestSnapshot = {
  kind: 'daily_digest';
  title: string;
  generatedAt: string;
  personalSignal: RetentionSignalInput;
  globalSignal: RetentionSignalInput;
  gap: number;
  missedOpportunity: boolean;
  headline: string;
  comparison: string;
  primaryAction: string;
  secondaryAction: string;
  notificationReady: boolean;
};

export type WeeklyReportSnapshot = {
  kind: 'weekly_report';
  title: string;
  generatedAt: string;
  winRate: number;
  acted: number;
  ignored: number;
  wins: number;
  losses: number;
  neutral: number;
  conversions: number;
  missedOpportunities: number;
  bestAsset: string;
  headline: string;
  summary: string;
  nextBestAction: string;
  notificationReady: boolean;
};

function signalName(signal: RetentionSignalInput) {
  return signal.name ? `${signal.symbol} (${signal.name})` : signal.symbol;
}

function confidence(signal: RetentionSignalInput) {
  return Math.max(0, Math.min(100, Number(signal.confidence || 0)));
}

export function buildDailyDigestSnapshot(input: {
  personalSignal: RetentionSignalInput;
  globalSignal: RetentionSignalInput;
  generatedAt?: string;
}): DailyDigestSnapshot {
  const generatedAt = input.generatedAt || new Date().toISOString();
  const personal = input.personalSignal;
  const global = input.globalSignal;
  const gap = Math.max(0, confidence(global) - confidence(personal));
  const missedOpportunity = personal.symbol !== global.symbol && gap >= 4;
  const headline = missedOpportunity
    ? `${global.symbol} is the strongest opportunity outside your watchlist.`
    : `${personal.symbol} remains your strongest signal today.`;
  const comparison = missedOpportunity
    ? `${signalName(global)} is outperforming ${personal.symbol} by ${gap} confidence points.`
    : `Your watchlist leader and global opportunity are close enough to stay focused.`;
  return {
    kind: 'daily_digest',
    title: 'Today\'s Signal Digest',
    generatedAt,
    personalSignal: personal,
    globalSignal: global,
    gap,
    missedOpportunity,
    headline,
    comparison,
    primaryAction: missedOpportunity ? `Track ${global.symbol}` : `Review ${personal.symbol}`,
    secondaryAction: missedOpportunity ? `Add ${global.symbol} to watchlist` : 'Review receipts',
    notificationReady: true,
  };
}

export function buildWeeklyReportSnapshot(input: {
  winRate?: number;
  acted?: number;
  ignored?: number;
  wins?: number;
  losses?: number;
  neutral?: number;
  conversions?: number;
  missedOpportunities?: number;
  bestAsset?: string;
  generatedAt?: string;
}): WeeklyReportSnapshot {
  const generatedAt = input.generatedAt || new Date().toISOString();
  const winRate = Number(input.winRate || 0);
  const acted = Number(input.acted || 0);
  const ignored = Number(input.ignored || 0);
  const wins = Number(input.wins || 0);
  const losses = Number(input.losses || 0);
  const neutral = Number(input.neutral || 0);
  const conversions = Number(input.conversions || 0);
  const missedOpportunities = Number(input.missedOpportunities || 0);
  const bestAsset = input.bestAsset || 'Needs data';
  const total = acted + ignored;
  const headline = total
    ? `${winRate}% win rate from ${acted} acted signals this week.`
    : 'Your weekly report is ready to learn from your next action.';
  const summary = total
    ? `${wins} wins, ${losses} losses, ${neutral} neutral outcomes, ${ignored} ignored signals, and ${conversions} discovery actions were captured.`
    : 'Act on or ignore a signal, then mark the result to make next week\'s report meaningful.';
  const nextBestAction = missedOpportunities > 0
    ? `Review ${missedOpportunities} missed global ${missedOpportunities === 1 ? 'opportunity' : 'opportunities'}.`
    : bestAsset !== 'Needs data' ? `Keep watching ${bestAsset}.` : 'Track one signal today.';
  return {
    kind: 'weekly_report',
    title: 'Weekly Performance Report',
    generatedAt,
    winRate,
    acted,
    ignored,
    wins,
    losses,
    neutral,
    conversions,
    missedOpportunities,
    bestAsset,
    headline,
    summary,
    nextBestAction,
    notificationReady: true,
  };
}
