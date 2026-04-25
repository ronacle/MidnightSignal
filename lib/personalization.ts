import type { AssetSignal, TraderMode } from '@/lib/signals';
import type { SignalResult } from '@/lib/performance';

type FeedbackLike = { signalId?: string; symbol: string; action?: string; outcome?: string | null };
type ConversionLike = { type?: string; symbol: string };
type RetentionLike = { type?: string; symbol?: string };

export type PersonalizedSignalRecommendation = AssetSignal & {
  personalScore: number;
  reason: string;
  source: 'watchlist' | 'global' | 'blend';
  action: 'review' | 'track' | 'add_to_watchlist' | 'ignore_less';
};

export type UserIntelligenceProfile = {
  profileVersion: string;
  mode: TraderMode;
  preferredAssets: string[];
  preferredSignalTypes: string[];
  actedRate: number;
  winRate: number;
  ignoredSymbols: string[];
  riskStyle: 'cautious' | 'balanced' | 'aggressive';
  learningBias: string;
  recommendations: PersonalizedSignalRecommendation[];
  explainers: string[];
};

function signalTypeFromId(id?: string) {
  if (!id) return 'Mixed';
  const parts = id.split('-');
  return parts.length >= 3 ? parts[2].replace(/^./, char => char.toUpperCase()) : 'Mixed';
}

function pct(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

function topKeys(counts: Record<string, number>, limit = 3) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([key]) => key);
}

export function buildPersonalIntelligenceProfile(input: {
  signals: AssetSignal[];
  watchlist: string[];
  feedback: FeedbackLike[];
  conversionEvents?: ConversionLike[];
  retentionEvents?: RetentionLike[];
  performanceResults?: SignalResult[];
  mode: TraderMode;
}): UserIntelligenceProfile {
  const feedback = input.feedback || [];
  const conversions = input.conversionEvents || [];
  const results = input.performanceResults || [];
  const acted = feedback.filter(item => item.action === 'acted').length;
  const ignored = feedback.filter(item => item.action === 'ignored').length;
  const wins = feedback.filter(item => item.outcome === 'win').length + results.filter(item => item.outcome === 'win').length;
  const losses = feedback.filter(item => item.outcome === 'loss').length + results.filter(item => item.outcome === 'loss').length;
  const actedRate = pct(acted, acted + ignored);
  const winRate = pct(wins, wins + losses);

  const assetCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  const ignoredCounts: Record<string, number> = {};

  for (const item of feedback) {
    const symbol = item.symbol?.toUpperCase();
    if (!symbol) continue;
    if (item.action === 'acted') assetCounts[symbol] = (assetCounts[symbol] || 0) + 2;
    if (item.outcome === 'win') assetCounts[symbol] = (assetCounts[symbol] || 0) + 3;
    if (item.outcome === 'loss') assetCounts[symbol] = (assetCounts[symbol] || 0) - 1;
    if (item.action === 'ignored') ignoredCounts[symbol] = (ignoredCounts[symbol] || 0) + 1;
    const type = signalTypeFromId(item.signalId);
    if (item.action === 'acted') typeCounts[type] = (typeCounts[type] || 0) + 1;
    if (item.outcome === 'win') typeCounts[type] = (typeCounts[type] || 0) + 2;
  }
  for (const event of conversions) {
    const symbol = event.symbol?.toUpperCase();
    if (symbol) assetCounts[symbol] = (assetCounts[symbol] || 0) + 1;
  }
  for (const symbol of input.watchlist) assetCounts[symbol] = (assetCounts[symbol] || 0) + 1;

  const preferredAssets = topKeys(assetCounts, 4);
  const preferredSignalTypes = topKeys(typeCounts, 3);
  const ignoredSymbols = topKeys(ignoredCounts, 3);
  const avgConfidence = input.signals.length ? input.signals.reduce((sum, signal) => sum + signal.confidence, 0) / input.signals.length : 0;
  const riskStyle = winRate >= 65 && actedRate >= 55 ? 'aggressive' : actedRate < 35 || avgConfidence < 62 ? 'cautious' : 'balanced';

  const watchlistSet = new Set(input.watchlist);
  const recommendations = input.signals.map(signal => {
    const symbol = signal.symbol.toUpperCase();
    const inWatchlist = watchlistSet.has(symbol);
    const preferenceBoost = (assetCounts[symbol] || 0) * 4;
    const ignoredPenalty = (ignoredCounts[symbol] || 0) * 8;
    const globalDiscoveryBoost = inWatchlist ? 0 : 8;
    const confidenceScore = Math.round(signal.confidence * 0.72);
    const score = Math.max(0, Math.min(100, confidenceScore + preferenceBoost + globalDiscoveryBoost - ignoredPenalty + (winRate ? Math.round(winRate * 0.12) : 0)));
    const reason = inWatchlist
      ? `${signal.symbol} is in your watchlist and matches your current ${input.mode} review pattern.`
      : score >= 70
        ? `${signal.symbol} is outside your watchlist but strong enough to deserve discovery attention.`
        : `${signal.symbol} is a lower-priority global candidate until your behavior points toward it.`;
    return {
      ...signal,
      personalScore: score,
      reason,
      source: inWatchlist ? 'watchlist' : score >= 70 ? 'blend' : 'global',
      action: inWatchlist ? 'review' : score >= 70 ? 'add_to_watchlist' : 'track'
    } satisfies PersonalizedSignalRecommendation;
  }).sort((a, b) => b.personalScore - a.personalScore || b.confidence - a.confidence).slice(0, 5);

  const learningBias = preferredAssets.length
    ? `Leaning toward ${preferredAssets.slice(0, 2).join(' + ')} based on watchlist, actions, and outcomes.`
    : 'Not enough behavior yet; using blended watchlist plus global signal strength.';

  return {
    profileVersion: '16.0.0',
    mode: input.mode,
    preferredAssets,
    preferredSignalTypes,
    actedRate,
    winRate,
    ignoredSymbols,
    riskStyle,
    learningBias,
    recommendations,
    explainers: [
      'Watchlist signals are boosted when they have action history.',
      'Repeated ignores lower future ranking so the feed gets quieter.',
      'Strong global signals can still break through when they materially outperform the watchlist.'
    ]
  };
}
