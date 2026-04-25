import type { AssetSignal, TraderMode } from '@/lib/signals';
import type { SignalResult } from '@/lib/performance';

type FeedbackLike = { signalId?: string; symbol: string; action?: string; outcome?: string | null };
type ConversionLike = { type?: string; symbol: string };
type RetentionLike = { type?: string; symbol?: string };
type RecommendationFeedbackLike = { symbol: string; action: 'more' | 'less' | 'hide'; metadata?: Record<string, unknown> };

export type UserSignalPattern = {
  id: string;
  title: string;
  description: string;
  confidence: number;
  direction: 'strength' | 'weakness' | 'opportunity';
  signalType?: string;
  symbol?: string;
  action: string;
};

export type PersonalizedSignalRecommendation = AssetSignal & {
  personalScore: number;
  reason: string;
  source: 'watchlist' | 'global' | 'blend';
  action: 'review' | 'track' | 'add_to_watchlist' | 'ignore_less';
  explanation: string[];
  patternReasons: string[];
  scoreBreakdown: { personalMatch: number; historicalPerformance: number; globalStrength: number; freshness: number; patternMatch: number };
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
  patterns: UserSignalPattern[];
  strongestPattern?: UserSignalPattern;
  avoidPattern?: UserSignalPattern;
  opportunityPattern?: UserSignalPattern;
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
function topEntries(counts: Record<string, number>, limit = 3) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

export function buildPersonalIntelligenceProfile(input: {
  signals: AssetSignal[];
  watchlist: string[];
  feedback: FeedbackLike[];
  conversionEvents?: ConversionLike[];
  retentionEvents?: RetentionLike[];
  recommendationFeedback?: RecommendationFeedbackLike[];
  performanceResults?: SignalResult[];
  mode: TraderMode;
}): UserIntelligenceProfile {
  const feedback = input.feedback || [];
  const conversions = input.conversionEvents || [];
  const results = input.performanceResults || [];
  const recommendationFeedback = input.recommendationFeedback || [];
  const acted = feedback.filter(item => item.action === 'acted').length;
  const ignored = feedback.filter(item => item.action === 'ignored').length;
  const wins = feedback.filter(item => item.outcome === 'win').length + results.filter(item => item.outcome === 'win').length;
  const losses = feedback.filter(item => item.outcome === 'loss').length + results.filter(item => item.outcome === 'loss').length;
  const actedRate = pct(acted, acted + ignored);
  const winRate = pct(wins, wins + losses);

  const assetCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  const ignoredCounts: Record<string, number> = {};
  const typeWins: Record<string, number> = {};
  const typeLosses: Record<string, number> = {};
  const typeIgnores: Record<string, number> = {};
  const symbolWins: Record<string, number> = {};
  const symbolLosses: Record<string, number> = {};

  for (const item of feedback) {
    const symbol = item.symbol?.toUpperCase();
    if (!symbol) continue;
    if (item.action === 'acted') assetCounts[symbol] = (assetCounts[symbol] || 0) + 2;
    if (item.outcome === 'win') assetCounts[symbol] = (assetCounts[symbol] || 0) + 3;
    if (item.outcome === 'loss') assetCounts[symbol] = (assetCounts[symbol] || 0) - 1;
    if (item.action === 'ignored') ignoredCounts[symbol] = (ignoredCounts[symbol] || 0) + 1;
    const type = signalTypeFromId(item.signalId);
    if (item.action === 'acted') typeCounts[type] = (typeCounts[type] || 0) + 1;
    if (item.outcome === 'win') { typeCounts[type] = (typeCounts[type] || 0) + 2; typeWins[type] = (typeWins[type] || 0) + 1; symbolWins[symbol] = (symbolWins[symbol] || 0) + 1; }
    if (item.outcome === 'loss') { typeLosses[type] = (typeLosses[type] || 0) + 1; symbolLosses[symbol] = (symbolLosses[symbol] || 0) + 1; }
    if (item.action === 'ignored') typeIgnores[type] = (typeIgnores[type] || 0) + 1;
  }
  for (const event of conversions) {
    const symbol = event.symbol?.toUpperCase();
    if (symbol) assetCounts[symbol] = (assetCounts[symbol] || 0) + 1;
  }
  for (const symbol of input.watchlist) assetCounts[symbol] = (assetCounts[symbol] || 0) + 1;
  for (const item of recommendationFeedback) {
    const symbol = item.symbol?.toUpperCase();
    if (!symbol) continue;
    if (item.action === 'more') assetCounts[symbol] = (assetCounts[symbol] || 0) + 4;
    if (item.action === 'less') assetCounts[symbol] = (assetCounts[symbol] || 0) - 3;
    if (item.action === 'hide') ignoredCounts[symbol] = (ignoredCounts[symbol] || 0) + 3;
  }
  for (const item of results) {
    const symbol = item.symbol?.toUpperCase();
    if (!symbol) continue;
    const type = signalTypeFromId((item as any).signalId || symbol + '-signal-' + (item.outcome || 'mixed'));
    if (item.outcome === 'win') { typeWins[type] = (typeWins[type] || 0) + 1; symbolWins[symbol] = (symbolWins[symbol] || 0) + 1; }
    if (item.outcome === 'loss') { typeLosses[type] = (typeLosses[type] || 0) + 1; symbolLosses[symbol] = (symbolLosses[symbol] || 0) + 1; }
  }

  const preferredAssets = topKeys(assetCounts, 4);
  const preferredSignalTypes = topKeys(typeCounts, 3);
  const ignoredSymbols = topKeys(ignoredCounts, 3);
  const avgConfidence = input.signals.length ? input.signals.reduce((sum, signal) => sum + signal.confidence, 0) / input.signals.length : 0;
  const riskStyle = winRate >= 65 && actedRate >= 55 ? 'aggressive' : actedRate < 35 || avgConfidence < 62 ? 'cautious' : 'balanced';

  const patterns: UserSignalPattern[] = [];
  const bestType = topEntries(typeWins, 1)[0];
  const weakType = topEntries(typeLosses, 1)[0];
  const ignoredType = topEntries(typeIgnores, 1)[0];
  const bestSymbol = topEntries(symbolWins, 1)[0];
  const weakSymbol = topEntries(symbolLosses, 1)[0];
  if (bestType) patterns.push({ id: 'best-type-' + bestType[0].toLowerCase(), title: `Strongest signal pattern: ${bestType[0]}`, description: `Your strongest repeat behavior is forming around ${bestType[0].toLowerCase()} signals with ${bestType[1]} winning confirmations.`, confidence: Math.min(95, 55 + bestType[1] * 10), direction: 'strength', signalType: bestType[0], action: `Prioritize ${bestType[0].toLowerCase()} signals when confidence is above 70%.` });
  if (bestSymbol) patterns.push({ id: 'best-asset-' + bestSymbol[0].toLowerCase(), title: `Best asset pattern: ${bestSymbol[0]}`, description: `${bestSymbol[0]} has the clearest positive history in your recent feedback and receipts.`, confidence: Math.min(95, 55 + bestSymbol[1] * 10), direction: 'strength', symbol: bestSymbol[0], action: `Keep ${bestSymbol[0]} in your primary review loop.` });
  if (weakType) patterns.push({ id: 'weak-type-' + weakType[0].toLowerCase(), title: `Avoid pattern: ${weakType[0]}`, description: `${weakType[0]} signals are showing weaker outcomes for you than your stronger categories.`, confidence: Math.min(90, 50 + weakType[1] * 12), direction: 'weakness', signalType: weakType[0], action: `Require higher confidence before acting on ${weakType[0].toLowerCase()} signals.` });
  if (weakSymbol) patterns.push({ id: 'weak-asset-' + weakSymbol[0].toLowerCase(), title: `Asset caution: ${weakSymbol[0]}`, description: `${weakSymbol[0]} has more negative outcomes than positive ones in the current sample.`, confidence: Math.min(90, 50 + weakSymbol[1] * 12), direction: 'weakness', symbol: weakSymbol[0], action: `Use ${weakSymbol[0]} as a watch-only candidate until the pattern improves.` });
  if (ignoredType) patterns.push({ id: 'ignored-type-' + ignoredType[0].toLowerCase(), title: `Suppressed pattern: ${ignoredType[0]}`, description: `You repeatedly ignore ${ignoredType[0].toLowerCase()} signals, so the engine will reduce their priority.`, confidence: Math.min(90, 50 + ignoredType[1] * 10), direction: 'weakness', signalType: ignoredType[0], action: `Show fewer ${ignoredType[0].toLowerCase()} signals unless global strength breaks through.` });
  const globalOpportunity = input.signals.filter(signal => !input.watchlist.includes(signal.symbol)).sort((a, b) => b.confidence - a.confidence)[0];
  if (globalOpportunity) patterns.push({ id: 'opportunity-' + globalOpportunity.symbol.toLowerCase(), title: `New opportunity pattern: ${globalOpportunity.symbol}`, description: `${globalOpportunity.symbol} is outside your watchlist but has enough global strength to test as a discovery pattern.`, confidence: Math.min(92, Math.round(globalOpportunity.confidence)), direction: 'opportunity', symbol: globalOpportunity.symbol, action: `Track ${globalOpportunity.symbol} before adding it to your core watchlist.` });

  const watchlistSet = new Set(input.watchlist);
  const recommendations = input.signals.map(signal => {
    const symbol = signal.symbol.toUpperCase();
    const inWatchlist = watchlistSet.has(symbol);
    const preferenceBoost = (assetCounts[symbol] || 0) * 4;
    const ignoredPenalty = (ignoredCounts[symbol] || 0) * 8;
    const recentFeedback = recommendationFeedback.find(item => item.symbol?.toUpperCase() === symbol);
    const directPreferenceBoost = recentFeedback?.action === 'more' ? 10 : recentFeedback?.action === 'less' ? -10 : recentFeedback?.action === 'hide' ? -35 : 0;
    const symbolResults = results.filter(item => item.symbol === symbol);
    const resultWins = symbolResults.filter(item => item.outcome === 'win').length;
    const resultLosses = symbolResults.filter(item => item.outcome === 'loss').length;
    const symbolWinRate = pct(resultWins, resultWins + resultLosses);
    const matchingStrength = patterns.find(pattern => pattern.direction === 'strength' && (pattern.symbol === symbol || pattern.signalType === signal.label));
    const matchingWeakness = patterns.find(pattern => pattern.direction === 'weakness' && (pattern.symbol === symbol || pattern.signalType === signal.label));
    const matchingOpportunity = patterns.find(pattern => pattern.direction === 'opportunity' && pattern.symbol === symbol);
    const patternMatch = Math.max(0, Math.min(100, 50 + (matchingStrength ? 22 : 0) + (matchingOpportunity ? 12 : 0) - (matchingWeakness ? 24 : 0)));
    const personalMatch = Math.max(0, Math.min(100, 45 + preferenceBoost + (inWatchlist ? 18 : 0) + directPreferenceBoost - ignoredPenalty + Math.round((patternMatch - 50) * 0.35)));
    const historicalPerformance = symbolWinRate || winRate || 50;
    const globalStrength = signal.confidence;
    const freshness = Math.max(35, Math.min(100, 70 + Math.round(signal.change24h * 1.5)));
    const score = Math.max(0, Math.min(100, Math.round(personalMatch * 0.3 + historicalPerformance * 0.22 + globalStrength * 0.25 + freshness * 0.08 + patternMatch * 0.15)));
    const reason = inWatchlist
      ? `${signal.symbol} is in your watchlist and matches your current ${input.mode} review pattern.`
      : score >= 70
        ? `${signal.symbol} is outside your watchlist but strong enough to deserve discovery attention.`
        : `${signal.symbol} is a lower-priority global candidate until your behavior points toward it.`;
    const patternReasons = [matchingStrength, matchingWeakness, matchingOpportunity].filter(Boolean).map(pattern => `${pattern!.title}: ${pattern!.action}`);
    const explanation = [
      inWatchlist ? 'You already follow this asset, so it gets a personal relevance boost.' : 'This is a discovery candidate outside your watchlist.',
      symbolWinRate ? `${signal.symbol} has a ${symbolWinRate}% win rate in recent receipts.` : winRate ? `Your recent decisive outcomes show a ${winRate}% win tendency.` : 'Not enough history yet, so current signal strength carries more weight.',
      recentFeedback?.action === 'more' ? 'You asked to see more recommendations like this.' : recentFeedback?.action === 'less' ? 'You asked to see fewer recommendations like this, so it is down-ranked.' : recentFeedback?.action === 'hide' ? 'You marked this as not interested, so it will be suppressed.' : 'No explicit preference override yet.',
      matchingStrength ? `Matches your proven pattern: ${matchingStrength.title}.` : matchingWeakness ? `Down-ranked because it touches a weaker pattern: ${matchingWeakness.title}.` : matchingOpportunity ? `Testing a discovery pattern: ${matchingOpportunity.title}.` : 'No strong personal pattern detected for this signal yet.'
    ];
    return {
      ...signal,
      personalScore: score,
      reason,
      source: inWatchlist ? 'watchlist' : score >= 70 ? 'blend' : 'global',
      action: inWatchlist ? 'review' : score >= 70 ? 'add_to_watchlist' : 'track',
      explanation,
      patternReasons,
      scoreBreakdown: { personalMatch, historicalPerformance, globalStrength, freshness, patternMatch }
    } satisfies PersonalizedSignalRecommendation;
  }).sort((a, b) => b.personalScore - a.personalScore || b.confidence - a.confidence).slice(0, 5);

  const learningBias = preferredAssets.length
    ? `Leaning toward ${preferredAssets.slice(0, 2).join(' + ')} based on watchlist, actions, and outcomes.`
    : 'Not enough behavior yet; using blended watchlist plus global signal strength.';

  return {
    profileVersion: '16.4.0',
    mode: input.mode,
    preferredAssets,
    preferredSignalTypes,
    actedRate,
    winRate,
    ignoredSymbols,
    riskStyle,
    learningBias,
    recommendations,
    patterns,
    strongestPattern: patterns.find(pattern => pattern.direction === 'strength'),
    avoidPattern: patterns.find(pattern => pattern.direction === 'weakness'),
    opportunityPattern: patterns.find(pattern => pattern.direction === 'opportunity'),
    explainers: [
      'Watchlist signals are boosted when they have action history.',
      'Repeated ignores lower future ranking so the feed gets quieter.',
      'Strong global signals can still break through when they materially outperform the watchlist.',
      'Repeatable winning, ignored, and weak patterns now adjust recommendation rank before the user sees the feed.'
    ]
  };
}
