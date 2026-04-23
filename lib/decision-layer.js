function postureFromScore(score = 50, regime = 'Mixed', sentiment = 'neutral') {
  if (score >= 78) return sentiment === 'bearish' ? 'Defensive bearish' : 'Lean bullish';
  if (score >= 64) return sentiment === 'bearish' ? 'Cautious bearish' : 'Lean bullish';
  if (score >= 52) return regime === 'Chop' ? 'Stay selective' : 'Balanced';
  if (score >= 40) return sentiment === 'bullish' ? 'Balanced' : 'Cautious';
  return sentiment === 'bearish' ? 'Defensive' : 'Cautious';
}

function confidenceLabel(score = 50) {
  if (score >= 80) return 'High conviction';
  if (score >= 60) return 'Moderate conviction';
  if (score >= 40) return 'Developing conviction';
  return 'Low conviction';
}

function riskContextFromRegime(regime = 'Mixed') {
  if (regime === 'Trending') return 'Cleaner trend conditions with momentum carrying more weight.';
  if (regime === 'Chop') return 'Higher noise conditions. Confirmation matters more than raw speed.';
  if (regime === 'Directional') return 'Leadership is strong, but follow-through still needs monitoring.';
  return 'Mixed conditions with balanced opportunity and noise.';
}

function bestForFromPosture(posture = 'Balanced', regime = 'Mixed') {
  const tone = String(posture || '').toLowerCase();
  if (tone.includes('bull')) {
    return regime === 'Trending'
      ? 'Favor continuation setups, but let pullbacks do the work.'
      : 'Favor selective continuation setups with measured entries.';
  }
  if (tone.includes('defensive') || tone.includes('bearish')) {
    return 'Treat rallies with more caution and wait for cleaner confirmation.';
  }
  if (tone.includes('selective') || tone.includes('balanced')) return 'Stay selective and let structure confirm before leaning in.';
  return 'Preserve selectivity until structure improves.';
}

function describeFactorShift(current = 0, previous = 0, label = 'factor') {
  const diff = Number(current || 0) - Number(previous || 0);
  if (diff >= 4) return `${label} improved`;
  if (diff <= -4) return `${label} weakened`;
  return null;
}

function buildActionBias(asset, posture, convictionTag) {
  const sentiment = String(asset?.sentiment || 'neutral').toLowerCase();
  const score = Number(asset?.signalScore ?? asset?.conviction ?? 50);
  const regime = asset?.marketRegime || 'Mixed';

  if (sentiment === 'bullish' && score >= 70) return 'Favor continuation setups';
  if (sentiment === 'bullish' && regime === 'Chop') return 'Stay patient with bullish setups';
  if (sentiment === 'bearish' && score >= 60) return 'Respect downside pressure first';
  if (convictionTag === 'Low conviction') return 'Wait for stronger confirmation';
  if (regime === 'Chop') return 'Trade slower than the tape feels';
  return posture === 'Balanced' ? 'Let the market prove direction first' : 'Stay selective with entries';
}

function buildSupportiveRead(asset) {
  const score = Number(asset?.signalScore ?? asset?.conviction ?? 50);
  const sentiment = String(asset?.sentiment || 'neutral').toLowerCase();
  if (sentiment === 'bullish' && score >= 70) return 'Momentum is supporting the current upside posture.';
  if (sentiment === 'bearish' && score >= 60) return 'Downside pressure is still carrying the cleaner read.';
  if (score >= 60) return 'The setup has enough support to monitor closely.';
  if (score >= 45) return 'The edge is present, but it is not fully expanded.';
  return 'The edge is still weak enough that patience matters.';
}

function buildCues(asset) {
  const score = Number(asset?.signalScore ?? asset?.conviction ?? 50);
  const change24h = Number(asset?.change24h || 0);
  const regime = asset?.marketRegime || 'Mixed';
  const tf = asset?.timeframe || {};
  const tfValues = [Number(tf.tf5m), Number(tf.tf15m), Number(tf.tf1h)].filter((value) => Number.isFinite(value));
  const strongFrames = tfValues.filter((value) => value >= 60).length;
  const weakFrames = tfValues.filter((value) => value <= 40).length;
  const cues = [];

  if (regime === 'Chop') cues.push('Chop likely — don't overtrust the first move.');
  else if (regime === 'Trending') cues.push('Trend conditions are cleaner than usual tonight.');
  else if (regime === 'Directional') cues.push('Leadership is clearer, but follow-through still matters.');

  if (strongFrames >= 2) cues.push('Multi-timeframe alignment is supporting the read.');
  else if (weakFrames >= 2) cues.push('Timeframes are soft enough to keep size in check.');

  if (Math.abs(change24h) >= 6 && score >= 60) cues.push(change24h > 0 ? 'Avoid chasing extended upside.' : 'Late downside can still snap back sharply.');
  else if (Math.abs(change24h) >= 3) cues.push('Momentum is active, but entry quality still matters.');

  if (score < 45) cues.push('Conviction is light — wait for a cleaner setup.');
  return cues.slice(0, 3);
}

export function buildDecisionLayer(asset, previousEntry = null) {
  if (!asset) return null;

  const score = Number(asset.signalScore ?? asset.conviction ?? 50);
  const regime = asset.marketRegime || 'Mixed';
  const sentiment = asset.sentiment || 'neutral';
  const posture = postureFromScore(score, regime, sentiment);
  const convictionTag = confidenceLabel(score);
  const riskContext = riskContextFromRegime(regime);
  const bestFor = bestForFromPosture(posture, regime);
  const actionBias = buildActionBias(asset, posture, convictionTag);
  const supportingRead = buildSupportiveRead(asset);
  const cues = buildCues(asset);

  const changes = [];
  if (previousEntry) {
    if (previousEntry.regime && previousEntry.regime !== asset.marketRegime) {
      changes.push(`Regime shifted to ${asset.marketRegime}`);
    }
    const previousScore = Number(previousEntry.signalScore ?? previousEntry.conviction ?? 0);
    const scoreDiff = Math.round(score - previousScore);
    if (Math.abs(scoreDiff) >= 4) {
      changes.push(`Conviction ${scoreDiff > 0 ? 'improved' : 'cooled'} by ${Math.abs(scoreDiff)} pts`);
    }
    const factorMap = [
      ['Momentum', asset?.factors?.momentum, previousEntry?.factors?.momentum],
      ['Trend', asset?.factors?.trend, previousEntry?.factors?.trend],
      ['Volume', asset?.factors?.volume, previousEntry?.factors?.volume],
      ['Relative strength', asset?.factors?.relativeStrength, previousEntry?.factors?.relativeStrength],
      ['Volatility', asset?.factors?.volatility, previousEntry?.factors?.volatility],
    ];
    factorMap.forEach(([label, current, prev]) => {
      const shift = describeFactorShift(current, prev, label);
      if (shift) changes.push(shift);
    });
  }

  return {
    posture,
    stance: posture,
    convictionTag,
    confidenceContext: `${score}% · ${convictionTag}`,
    actionBias,
    supportingRead,
    riskContext,
    bestFor,
    cues,
    changeSummary: changes.length ? changes.slice(0, 3) : ['No major factor shift recorded yet.']
  };
}
