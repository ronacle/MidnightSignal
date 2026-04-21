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

function getBias(score = 50, sentiment = 'neutral') {
  if (score >= 65 || sentiment === 'bullish') return 'Bullish bias';
  if (score <= 40 || sentiment === 'bearish') return 'Bearish bias';
  return 'Balanced bias';
}

function getRiskNote(score = 50, regime = 'Mixed') {
  if (score >= 74 && regime === 'Trending') return 'High conviction, but avoid chasing if price is already extended.';
  if (score >= 65 && regime === 'Chop') return 'Strength is present, but choppy conditions can fake out early entries.';
  if (score <= 40) return 'Weak posture. Treat rallies carefully until structure improves.';
  return 'Useful signal, but confirmation still matters before leaning too hard.';
}

function getWhatItMeans(posture = 'Watch', score = 50, regime = 'Mixed') {
  if (posture === 'Favorable') {
    return regime === 'Trending'
      ? 'Momentum and structure are aligned enough to keep continuation on the table.'
      : 'Conditions are constructive, though confirmation still matters more than speed.';
  }
  if (posture === 'Watch') return score >= 50 ? 'There is a constructive read forming, but the edge is not decisive yet.' : 'The setup is mixed enough that patience still has an edge.';
  if (posture === 'Cautious') return 'This looks more defensive than offensive right now, so risk should stay tighter.';
  return 'Right now the signal is better used as information than as a commitment cue.';
}

function getIfThenGuidance(posture = 'Watch', score = 50) {
  if (posture === 'Favorable') {
    return [
      'If conviction keeps rising, continuation becomes more likely.',
      'If momentum cools while score holds up, a cleaner pullback may set up.',
    ];
  }
  if (posture === 'Watch') {
    return [
      'If conviction moves above the mid-60s, the read improves meaningfully.',
      'If score slips back into the low-40s, the setup likely returns to noise.',
    ];
  }
  if (posture === 'Cautious') {
    return [
      'If score recovers into the upper-40s, caution can soften back to watch.',
      'If weakness deepens, treat any bounce as less trustworthy.',
    ];
  }
  return [
    'If structure improves and the score recovers, this can move back onto the watch list.',
    'If weakness persists, observation is the better posture than action.',
  ];
}

function getWhatChangedTonight(asset, previousEntry, changeSummary = []) {
  if (changeSummary.length) return changeSummary[0];

  const currentScore = Number(asset?.signalScore ?? asset?.conviction ?? 0);
  const previousScore = Number(previousEntry?.signalScore ?? previousEntry?.conviction ?? currentScore);
  const delta = Math.round(currentScore - previousScore);

  if (delta >= 3) return `Conviction improved from ${previousScore}% to ${currentScore}% tonight.`;
  if (delta <= -3) return `Conviction cooled from ${previousScore}% to ${currentScore}% tonight.`;

  if (previousEntry?.regime && asset?.marketRegime && previousEntry.regime !== asset.marketRegime) {
    return `Market regime shifted from ${previousEntry.regime} to ${asset.marketRegime}.`;
  }

  return 'No major shift recorded yet, so the posture is mainly being carried by the current factor mix.';
}

export function buildDecisionLayer(asset, previousEntry = null) {
  if (!asset) return null;

  const score = Number(asset.signalScore ?? asset.conviction ?? 50);
  const regime = asset.marketRegime || 'Mixed';
  const posture = postureFromScore(score, regime);
  const riskContext = riskContextFromRegime(regime);
  const bestFor = bestForFromPosture(posture, regime);

  const changes = [];
  if (previousEntry) {
    if (previousEntry.regime && previousEntry.regime !== regime) {
      changes.push(`Regime shifted to ${regime}`);
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
    bias: getBias(score, asset.sentiment),
    confidence: score,
    riskContext,
    riskNote: getRiskNote(score, regime),
    bestFor,
    whatItMeans: getWhatItMeans(posture, score, regime),
    ifThen: getIfThenGuidance(posture, score),
    whatChangedTonight: getWhatChangedTonight(asset, previousEntry, changes),
    changeSummary: changes.length ? changes.slice(0, 3) : ['No major factor shift recorded yet.']
  };
}
