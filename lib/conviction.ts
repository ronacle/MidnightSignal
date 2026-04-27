import type { AssetSignal } from '@/lib/signals';
import type { MidnightNetworkInsight } from '@/lib/midnight-network';
import type { StrategyFit } from '@/lib/strategy';
import type { UserIntelligenceProfile } from '@/lib/personalization';

export type ConvictionLevel = 'Low' | 'Medium' | 'High' | 'Extreme';

export type ConvictionBreakdown = {
  score: number;
  level: ConvictionLevel;
  actionTone: 'positive' | 'caution' | 'defensive';
  strategyFit: number;
  signalConfidence: number;
  networkStrength: number;
  personalizationMatch: number;
  historicalWinRate: number;
  summary: string;
  worksBestWhen: string;
  riskWarning: string;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function convictionLevel(score: number): ConvictionLevel {
  if (score >= 85) return 'Extreme';
  if (score >= 70) return 'High';
  if (score >= 50) return 'Medium';
  return 'Low';
}

export function convictionTone(score: number): 'positive' | 'caution' | 'defensive' {
  if (score >= 70) return 'positive';
  if (score >= 50) return 'caution';
  return 'defensive';
}

export function buildConvictionLayer(args: {
  signal: AssetSignal;
  strategyFit: StrategyFit;
  network?: MidnightNetworkInsight;
  profile?: UserIntelligenceProfile;
  historicalWinRate?: number;
}): ConvictionBreakdown {
  const { signal, strategyFit, network, profile } = args;
  const historicalWinRate = clamp(args.historicalWinRate || 0);
  const signalConfidence = clamp(signal.confidence || 0);
  const networkStrength = clamp(network?.score || signalConfidence);
  const preferredAssets = new Set(profile?.preferredAssets || []);
  const preferredTypes = new Set(profile?.preferredSignalTypes || []);
  const personalizationMatch = clamp(
    45 +
    (preferredAssets.has(signal.symbol) ? 25 : 0) +
    (preferredTypes.has(signal.label) ? 18 : 0) +
    (profile?.actedRate ? Math.min(12, Math.round(profile.actedRate / 10)) : 0)
  );

  const score = clamp(
    strategyFit.score * 0.32 +
    signalConfidence * 0.28 +
    networkStrength * 0.18 +
    personalizationMatch * 0.12 +
    (historicalWinRate || signalConfidence) * 0.10
  );

  const level = convictionLevel(score);
  const actionTone = convictionTone(score);
  const summary = level === 'Extreme'
    ? `${signal.symbol} has rare alignment across strategy fit, signal confidence, and current market context.`
    : level === 'High'
      ? `${signal.symbol} has strong enough alignment to deserve focused attention.`
      : level === 'Medium'
        ? `${signal.symbol} is worth monitoring, but it needs cleaner confirmation before becoming a stronger read.`
        : `${signal.symbol} is low conviction right now; the setup is either weak, mismatched, or too uncertain.`;

  const worksBestWhen = signal.label === 'Bullish'
    ? 'Works best when momentum and trend stay aligned without a sudden volatility spike.'
    : signal.label === 'Bearish'
      ? 'Works best as a defensive read when weakness continues and failed bounces confirm pressure.'
      : 'Works best when the market is calm enough to wait for confirmation instead of chasing noise.';

  const riskWarning = strategyFit.action === 'Act' && score < 65
    ? 'Risk warning: the strategy says Act, but conviction is not fully confirmed. Treat this as a cautious educational read.'
    : strategyFit.action === 'Avoid' && score >= 70
      ? 'Risk warning: conviction is strong, but it conflicts with your active strategy. Consider whether your strategy setting still matches your intent.'
      : signal.volatility >= 70
        ? 'Risk warning: volatility is elevated, so even strong reads can reverse quickly.'
        : 'Risk note: conviction is educational guidance only and should not replace your own risk plan.';

  return {
    score,
    level,
    actionTone,
    strategyFit: clamp(strategyFit.score),
    signalConfidence,
    networkStrength,
    personalizationMatch,
    historicalWinRate,
    summary,
    worksBestWhen,
    riskWarning
  };
}
