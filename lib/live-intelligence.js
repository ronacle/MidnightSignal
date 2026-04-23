function title(value = '') {
  const text = String(value || '').replace(/[_-]+/g, ' ').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function buildLeadLiveIntelligence({ asset, snapshot = null, validationSummary = null, regimeSummary = null, decisionLayer = null }) {
  const currentScore = Number(asset?.signalScore ?? asset?.conviction ?? 0);
  const previousScore = Number(snapshot?.signalScore ?? snapshot?.conviction ?? currentScore);
  const scoreDelta = Number.isFinite(currentScore) && Number.isFinite(previousScore) ? currentScore - previousScore : 0;
  const currentRegime = String(regimeSummary?.regime || asset?.marketRegime || '').toLowerCase();
  const previousRegime = String(snapshot?.regime || '').toLowerCase();
  const validation = String(validationSummary?.scoreTrend || '').toLowerCase();
  const actionBias = String(decisionLayer?.actionBias || '').toLowerCase();
  const changedLeader = Boolean(snapshot?.symbol && asset?.symbol && snapshot.symbol !== asset.symbol);
  const regimeChanged = Boolean(previousRegime && currentRegime && previousRegime !== currentRegime);

  let status = 'Monitoring';
  let tone = 'steady';
  let cue = 'Watching for cleaner confirmation.';
  let explanation = 'The lead signal is stable, but the next move still matters more than the current print.';

  if (changedLeader) {
    status = 'Leader rotated';
    tone = 'shift';
    cue = `${asset.symbol} just replaced ${snapshot.symbol} at the top.`;
    explanation = 'Leadership changed, so the board should be read from the new leader outward.';
  } else if (scoreDelta >= 5 || validation.includes('improv') || validation.includes('strong')) {
    status = 'Conviction rising';
    tone = 'rising';
    cue = currentRegime.includes('chop') ? 'Momentum is building, but the tape can still fake out.' : 'Momentum is building and follow-through is improving.';
    explanation = currentRegime.includes('trend') || currentRegime.includes('risk on')
      ? 'The market is giving the lead setup more permission to continue.'
      : 'The setup is strengthening faster than the broader tape is confirming.';
  } else if (scoreDelta <= -5 || validation.includes('weak')) {
    status = 'Trend fading';
    tone = 'softening';
    cue = 'The setup is losing some authority and needs fresh proof.';
    explanation = 'Conviction softened enough that failed continuation matters more tonight.';
  } else if (regimeChanged) {
    status = currentRegime.includes('chop') || currentRegime.includes('range') ? 'Chop increasing' : 'Tone shifted';
    tone = currentRegime.includes('chop') || currentRegime.includes('range') ? 'softening' : 'shift';
    cue = `Market tone moved into ${title(currentRegime) || 'a different regime'}.`;
    explanation = currentRegime.includes('chop') || currentRegime.includes('range')
      ? 'The lead setup may still hold, but the environment is getting noisier.'
      : 'The lead setup is now operating in a different backdrop than the last read.';
  } else if (actionBias.includes('continuation')) {
    status = 'Momentum building';
    tone = 'rising';
    cue = 'The next clean push could extend, not just bounce.';
    explanation = 'Continuation conditions are present, even if they are not fully expanded yet.';
  } else if (currentRegime.includes('chop') || currentRegime.includes('range')) {
    status = 'Chop increasing';
    tone = 'softening';
    cue = 'Expect more fake starts until the range resolves.';
    explanation = 'The leader is still useful, but the market environment is getting less clean.';
  }

  return {
    status,
    tone,
    cue,
    explanation,
    justChanged: changedLeader || Math.abs(scoreDelta) >= 5 || regimeChanged,
  };
}

export function buildBoardLiveTag(asset, selectedAsset = '') {
  const score = Number(asset?.signalScore ?? asset?.conviction ?? 0);
  const sentiment = String(asset?.sentiment || '').toLowerCase();
  const mtf = Number(asset?.timeframe?.mtfMomentum ?? 0);
  const change = Number(asset?.change24h ?? 0);
  const isSelected = String(selectedAsset || '').toUpperCase() === String(asset?.symbol || '').toUpperCase();

  if (isSelected && score >= 65) return { label: 'Focused now', tone: 'focus' };
  if (score >= 72 && (sentiment === 'bullish' || mtf >= 60)) return { label: 'Conviction rising', tone: 'rising' };
  if (score >= 62 && change > 0) return { label: 'Momentum building', tone: 'rising' };
  if ((sentiment === 'bearish' && score <= 48) || change < -3) return { label: 'Trend fading', tone: 'softening' };
  if (mtf < 45 || (score >= 45 && score <= 58)) return { label: 'Chop increasing', tone: 'neutral' };
  return { label: 'Monitoring', tone: 'neutral' };
}
