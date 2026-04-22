function postureFromScore(score = 50, regime = 'Mixed') {
  if (score >= 74) return 'Favorable';
  if (score >= 60) return regime === 'Chop' ? 'Watch' : 'Favorable';
  if (score >= 46) return 'Watch';
  if (score >= 34) return 'Cautious';
  return 'Avoid';
}

function riskContextFromRegime(regime = 'Mixed') {
  if (regime === 'Trending') return 'Cleaner trend conditions with momentum carrying more weight.';
  if (regime === 'Chop') return 'Higher noise conditions. Confirmation matters more than raw speed.';
  if (regime === 'Directional') return 'Leadership is strong, but follow-through still needs monitoring.';
  return 'Mixed conditions with balanced opportunity and noise.';
}

function bestForFromPosture(posture = 'Watch', regime = 'Mixed') {
  if (posture === 'Favorable') {
    return regime === 'Trending'
      ? 'Best for continuation setups and pullback confirmation.'
      : 'Best for selective continuation setups with measured entries.';
  }
  if (posture === 'Watch') return 'Best for waiting on confirmation before committing.';
  if (posture === 'Cautious') return 'Best for defensive scanning and preserving selectivity.';
  return 'Best for observation only until structure improves.';
}

function describeFactorShift(current = 0, previous = 0, label = 'factor') {
  const diff = Number(current || 0) - Number(previous || 0);
  if (diff >= 4) return `${label} improved`;
  if (diff <= -4) return `${label} weakened`;
  return null;
}

export function buildDecisionLayer(asset, previousEntry = null) {
  if (!asset) return null;

  const posture = postureFromScore(asset.signalScore ?? asset.conviction ?? 50, asset.marketRegime || 'Mixed');
  const riskContext = riskContextFromRegime(asset.marketRegime || 'Mixed');
  const bestFor = bestForFromPosture(posture, asset.marketRegime || 'Mixed');

  const changes = [];
  if (previousEntry) {
    if (previousEntry.regime && previousEntry.regime !== asset.marketRegime) {
      changes.push(`Regime shifted to ${asset.marketRegime}`);
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
    riskContext,
    bestFor,
    changeSummary: changes.length ? changes.slice(0, 3) : ['No major factor shift recorded yet.']
  };
}
