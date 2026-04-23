import { getConvictionComparison } from '@/lib/conviction-intelligence';

function title(value = '') {
  const text = String(value || '').replace(/[_-]+/g, ' ').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getMomentumStrength(scoreDelta = 0, validation = '', mtf = 0) {
  if (scoreDelta >= 10 || validation.includes('strong') || mtf >= 75) return 'accelerating';
  if (scoreDelta >= 6 || mtf >= 65) return 'strong';
  return 'early';
}

export function buildLeadLiveIntelligence({ asset, snapshot = null, validationSummary = null, regimeSummary = null, decisionLayer = null }) {
  const currentScore = Number(asset?.signalScore ?? asset?.conviction ?? 0);
  const previousScore = Number(snapshot?.signalScore ?? snapshot?.conviction ?? currentScore);
  const comparison = getConvictionComparison({
    currentSymbol: asset?.symbol,
    previousSymbol: snapshot?.symbol,
    currentScore,
    previousScore,
    currentCapturedAt: asset?.lastUpdated,
    previousCapturedAt: snapshot?.timestamp,
  });
  const scoreDelta = comparison.comparable ? comparison.delta : 0;
  const currentRegime = String(regimeSummary?.regime || asset?.marketRegime || '').toLowerCase();
  const previousRegime = String(snapshot?.regime || '').toLowerCase();
  const validation = String(validationSummary?.scoreTrend || '').toLowerCase();
  const actionBias = String(decisionLayer?.actionBias || '').toLowerCase();
  const changedLeader = Boolean(snapshot?.symbol && asset?.symbol && snapshot.symbol !== asset.symbol);
  const regimeChanged = Boolean(previousRegime && currentRegime && previousRegime !== currentRegime);
  const mtf = Number(asset?.timeframe?.mtfMomentum ?? regimeSummary?.mtfMomentum ?? 0);
  const bullBias = String(asset?.sentiment || '').toLowerCase() === 'bullish' || actionBias.includes('bull');

  let status = 'Stable read';
  let tone = 'steady';
  let cue = 'Watching for a cleaner expansion before leaning harder.';
  let explanation = 'The lead signal is stable, but the next move still matters more than the current print.';
  let freshness = 'Watching';

  if (changedLeader) {
    status = 'Rotation detected';
    tone = 'shift';
    freshness = 'Just now';
    cue = `${asset.symbol} just replaced ${snapshot.symbol} as the lead signal.`;
    explanation = 'Leadership changed, so the board should now be read outward from the new leader.';
  } else if (comparison.mode === 'improving' || validation.includes('improv') || validation.includes('strong')) {
    const strength = getMomentumStrength(scoreDelta, validation, mtf);
    status = `Conviction rising (${strength})`;
    tone = 'rising';
    freshness = Math.abs(scoreDelta) >= 8 ? 'Just now' : 'Recently';
    cue = bullBias
      ? 'Buyers are holding follow-through better on this read.'
      : 'Sellers are pressing with more authority on this read.';
    explanation = currentRegime.includes('trend') || currentRegime.includes('risk on')
      ? 'The broader tape is giving the lead setup more permission to continue.'
      : 'The lead setup is strengthening faster than the broader tape is confirming.';
  } else if (actionBias.includes('continuation') && ((comparison.comparable && scoreDelta >= 2) || mtf >= 58)) {
    const strength = getMomentumStrength(scoreDelta, validation, mtf);
    status = `Momentum building (${strength})`;
    tone = 'rising';
    freshness = scoreDelta >= 4 ? 'Recently' : 'Watching';
    cue = 'Continuation conditions are improving, but extension risk still matters.';
    explanation = 'The next clean push looks more likely to extend than simply bounce.';
  } else if (comparison.mode === 'fading' || validation.includes('weak')) {
    status = 'Trend fading';
    tone = 'softening';
    freshness = Math.abs(scoreDelta) >= 8 ? 'Just now' : 'Recently';
    cue = bullBias
      ? 'Buyers are losing follow-through and need fresh proof.'
      : 'Seller control is fading and needs fresh confirmation.';
    explanation = 'Conviction softened enough that failed continuation matters more tonight.';
  } else if (regimeChanged && (currentRegime.includes('chop') || currentRegime.includes('range'))) {
    status = 'Chop increasing';
    tone = 'softening';
    freshness = 'Recently';
    cue = `Market tone moved into ${title(currentRegime) || 'a noisier regime'}.`;
    explanation = 'The lead setup may still hold, but the environment is getting less clean.';
  } else if (regimeChanged) {
    status = 'Tone shifted';
    tone = 'shift';
    freshness = 'Recently';
    cue = `Market tone moved into ${title(currentRegime) || 'a different regime'}.`;
    explanation = 'The lead setup is now operating in a different backdrop than the last read.';
  } else if (currentRegime.includes('chop') || currentRegime.includes('range')) {
    status = 'Chop increasing';
    tone = 'softening';
    freshness = 'Watching';
    cue = 'Expect more fake starts until the range resolves.';
    explanation = 'The leader is still useful, but the market environment is getting noisier.';
  }

  return {
    status,
    tone,
    cue,
    explanation,
    freshness,
    justChanged: freshness === 'Just now',
  };
}

export function buildBoardLiveTag(asset, selectedAsset = '') {
  const score = Number(asset?.signalScore ?? asset?.conviction ?? 0);
  const sentiment = String(asset?.sentiment || '').toLowerCase();
  const mtf = Number(asset?.timeframe?.mtfMomentum ?? 0);
  const change = Number(asset?.change24h ?? 0);
  const isSelected = String(selectedAsset || '').toUpperCase() === String(asset?.symbol || '').toUpperCase();

  if (isSelected && score >= 65) return { label: 'Focused now', tone: 'focus' };
  if (score >= 78 && (sentiment === 'bullish' || mtf >= 68)) return { label: 'Conviction rising', tone: 'rising' };
  if (score >= 68 && (change > 0 || mtf >= 58)) return { label: 'Momentum building', tone: 'rising' };
  if ((sentiment === 'bearish' && score <= 45) || change < -4) return { label: 'Trend fading', tone: 'softening' };
  if (score >= 45 && score <= 58 && mtf < 48) return { label: 'Chop increasing', tone: 'neutral' };
  if (isSelected) return { label: 'Watching closely', tone: 'neutral' };
  return null;
}
