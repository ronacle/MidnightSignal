import type { AssetSignal, TraderMode } from '@/lib/signals';
import type { SignalResult } from '@/lib/performance';
import type { UserIntelligenceProfile } from '@/lib/personalization';

export type StrategyId = 'momentum' | 'breakout' | 'conservative' | 'aggressive';

export type StrategyDefinition = {
  id: StrategyId;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  bestFor: string;
  riskLabel: 'Lower' | 'Moderate' | 'Higher';
  glossaryTerms: string[];
};

export type StrategyFit = {
  strategy: StrategyId;
  score: number;
  label: 'High fit' | 'Medium fit' | 'Low fit';
  reason: string;
  action: 'Act' | 'Wait' | 'Avoid';
};

export type StrategyPerformance = {
  strategy: StrategyId;
  name: string;
  winRate: number;
  total: number;
  wins: number;
  losses: number;
  averageReturn: number;
};

export const STRATEGIES: StrategyDefinition[] = [
  {
    id: 'momentum',
    name: 'Momentum',
    shortName: 'Momentum',
    tagline: 'Follow strength while it is still accelerating.',
    description: 'Prioritizes high-confidence bullish signals, strong 24h movement, and assets already leading the tape.',
    bestFor: 'Users who want clear continuation reads and can tolerate normal pullbacks.',
    riskLabel: 'Moderate',
    glossaryTerms: ['Momentum', 'Confidence', 'Win Rate']
  },
  {
    id: 'breakout',
    name: 'Breakout',
    shortName: 'Breakout',
    tagline: 'Look for assets pushing beyond recent ranges.',
    description: 'Prioritizes fast confidence expansion, elevated volatility, and signals that are separating from the watchlist baseline.',
    bestFor: 'Users who want early opportunity signals but still need confirmation.',
    riskLabel: 'Higher',
    glossaryTerms: ['Breakout', 'Divergence', 'Volume']
  },
  {
    id: 'conservative',
    name: 'Conservative',
    shortName: 'Conservative',
    tagline: 'Favor stability, confirmation, and cleaner risk bands.',
    description: 'Prioritizes higher confidence, lower downside movement, and signals that are less exposed to volatile conditions.',
    bestFor: 'Users who want fewer but cleaner signals and stronger wait/avoid guidance.',
    riskLabel: 'Lower',
    glossaryTerms: ['Risk profile', 'Confidence', 'Signal']
  },
  {
    id: 'aggressive',
    name: 'Aggressive',
    shortName: 'Aggressive',
    tagline: 'Surface the highest-conviction opportunities first.',
    description: 'Prioritizes large moves, high confidence, global outperformers, and signals with a wider opportunity window.',
    bestFor: 'Users comfortable with faster signals and stronger action bias.',
    riskLabel: 'Higher',
    glossaryTerms: ['Aggressive', 'Momentum', 'Divergence']
  }
];

export function getStrategy(id: StrategyId): StrategyDefinition {
  return STRATEGIES.find(strategy => strategy.id === id) || STRATEGIES[0];
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreSignalForStrategy(signal: AssetSignal, strategy: StrategyId, mode?: TraderMode): StrategyFit {
  const change = Number(signal.change24h || 0);
  const confidence = Number(signal.confidence || 0);
  const isBullish = signal.label === 'Bullish';
  const isBearish = signal.label === 'Bearish';
  const absMove = Math.abs(change);
  let score = confidence;
  let reason = `${signal.symbol} has ${confidence}% confidence in the current ${mode || 'swing'} view.`;

  if (strategy === 'momentum') {
    score = confidence + (isBullish ? 12 : isBearish ? -8 : 0) + Math.max(-10, Math.min(14, change * 2));
    reason = isBullish
      ? `${signal.symbol} fits Momentum because confidence is elevated and price action is moving with the signal.`
      : `${signal.symbol} is a weaker Momentum fit because the signal is not cleanly bullish yet.`;
  }

  if (strategy === 'breakout') {
    score = confidence + Math.min(18, absMove * 3) + (confidence >= 72 ? 6 : -4);
    reason = absMove >= 2
      ? `${signal.symbol} fits Breakout because movement is expanding and confidence is strong enough to monitor.`
      : `${signal.symbol} needs more expansion before it becomes a stronger Breakout candidate.`;
  }

  if (strategy === 'conservative') {
    score = confidence + (confidence >= 75 ? 12 : -6) + (absMove <= 3 ? 8 : -12) + (isBearish ? -6 : 0);
    reason = score >= 70
      ? `${signal.symbol} fits Conservative because confidence is clean and the move is not excessively stretched.`
      : `${signal.symbol} is a lower Conservative fit because it needs stronger confirmation or calmer movement.`;
  }

  if (strategy === 'aggressive') {
    score = confidence + Math.min(20, absMove * 4) + (isBullish ? 8 : 0) + (confidence >= 70 ? 8 : -2);
    reason = `${signal.symbol} fits Aggressive when high confidence and large movement create a stronger opportunity window.`;
  }

  const finalScore = clampScore(score);
  return {
    strategy,
    score: finalScore,
    label: finalScore >= 75 ? 'High fit' : finalScore >= 55 ? 'Medium fit' : 'Low fit',
    reason,
    action: finalScore >= 76 ? 'Act' : finalScore >= 55 ? 'Wait' : 'Avoid'
  };
}

export function rankSignalsByStrategy(signals: AssetSignal[], strategy: StrategyId, profile?: UserIntelligenceProfile, mode?: TraderMode) {
  const preferredSymbols = new Set(profile?.preferredAssets || []);
  const preferredLabels = new Set(profile?.preferredSignalTypes || []);
  return [...signals].sort((a, b) => {
    const aFit = scoreSignalForStrategy(a, strategy, mode).score + (preferredSymbols.has(a.symbol) ? 5 : 0) + (preferredLabels.has(a.label) ? 4 : 0);
    const bFit = scoreSignalForStrategy(b, strategy, mode).score + (preferredSymbols.has(b.symbol) ? 5 : 0) + (preferredLabels.has(b.label) ? 4 : 0);
    return bFit - aFit || b.confidence - a.confidence;
  });
}

export function buildStrategyPerformance(results: SignalResult[], strategy: StrategyId): StrategyPerformance {
  const weighted = results.map(result => ({ result, fit: scoreSignalForStrategy({ symbol: result.symbol, name: result.symbol, price: 0, change24h: result.returnPct, label: result.direction === 'long' ? 'Bullish' : 'Bearish', confidence: result.confidence, why: '' } as AssetSignal, strategy).score }));
  const relevant = weighted.filter(item => item.fit >= 55).map(item => item.result);
  const sample = relevant.length ? relevant : results.slice(0, 8);
  const wins = sample.filter(result => result.outcome === 'win').length;
  const losses = sample.filter(result => result.outcome === 'loss').length;
  const decisive = wins + losses;
  const averageReturn = sample.length ? Math.round((sample.reduce((sum, result) => sum + result.returnPct, 0) / sample.length) * 10) / 10 : 0;
  return { strategy, name: getStrategy(strategy).name, winRate: decisive ? Math.round((wins / decisive) * 100) : 0, total: sample.length, wins, losses, averageReturn };
}
