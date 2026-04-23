function round(value) {
  return Number(Number(value || 0).toFixed(2));
}

function pickLatestCheckpoint(checkpoints = {}) {
  if (typeof checkpoints?.['24h']?.returnPct === 'number') return { horizon: '24h', returnPct: checkpoints['24h'].returnPct };
  if (typeof checkpoints?.['4h']?.returnPct === 'number') return { horizon: '4h', returnPct: checkpoints['4h'].returnPct };
  if (typeof checkpoints?.['1h']?.returnPct === 'number') return { horizon: '1h', returnPct: checkpoints['1h'].returnPct };
  return { horizon: 'developing', returnPct: null };
}

export function classifyOutcomeFromReturn(returnPct) {
  if (typeof returnPct !== 'number') {
    return { label: 'Early', tone: 'developing', summary: 'Not enough follow-through data yet.' };
  }
  if (returnPct >= 1.5) {
    return { label: 'Confirmed', tone: 'worked', summary: 'Positive follow-through after the signal.' };
  }
  if (returnPct <= -1.25) {
    return { label: 'Faded', tone: 'failed', summary: 'The move faded after the signal.' };
  }
  return { label: 'Inconsistent', tone: 'mixed', summary: 'The signal moved, but follow-through was limited.' };
}

export function buildForwardOutcomeEntries(entries = []) {
  return (entries || []).map((entry) => {
    const latest = pickLatestCheckpoint(entry.checkpoints || {});
    const outcome = classifyOutcomeFromReturn(latest.returnPct);
    return {
      ...entry,
      latestHorizon: latest.horizon,
      latestReturnPct: typeof latest.returnPct === 'number' ? round(latest.returnPct) : null,
      outcomeLabel: outcome.label,
      outcomeTone: outcome.tone,
      outcomeSummary: outcome.summary,
    };
  });
}

function average(values = []) {
  if (!values.length) return null;
  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function buildImpactFromOutcome(entry = {}) {
  const latestReturn = typeof entry.latestReturnPct === 'number' ? entry.latestReturnPct : null;
  const magnitude = Math.abs(latestReturn || 0);
  const horizonBoost = entry.latestHorizon === '24h' ? 10 : entry.latestHorizon === '4h' ? 6 : entry.latestHorizon === '1h' ? 2 : 0;
  const toneBoost = entry.outcomeTone === 'worked' ? 14 : entry.outcomeTone === 'mixed' ? 6 : entry.outcomeTone === 'failed' ? 4 : 0;
  const regimeBoost = /trend|risk on/i.test(String(entry.regime || '')) ? 4 : /chop|range/i.test(String(entry.regime || '')) ? -2 : 0;
  const baseScore = latestReturn === null ? 0 : Math.round((magnitude * 12) + horizonBoost + toneBoost + regimeBoost);
  const score = Math.max(0, Math.min(100, baseScore));

  if (latestReturn === null) {
    return {
      score: null,
      label: 'Developing impact',
      tone: 'developing',
      summary: 'Still gathering follow-through before the signal impact is clear.'
    };
  }

  if (score >= 52) {
    return {
      score,
      label: 'High impact',
      tone: entry.outcomeTone === 'failed' ? 'failed' : 'worked',
      summary: latestReturn > 0 ? 'This signal materially moved and followed through.' : 'This signal materially moved, but in the wrong direction.'
    };
  }

  if (score >= 26) {
    return {
      score,
      label: 'Moderate impact',
      tone: entry.outcomeTone === 'failed' ? 'failed' : entry.outcomeTone === 'mixed' ? 'mixed' : 'worked',
      summary: latestReturn > 0 ? 'The move mattered, but the edge was not dominant.' : 'The move was noticeable, but the edge broke down.'
    };
  }

  return {
    score,
    label: 'Low impact',
    tone: entry.outcomeTone === 'failed' ? 'failed' : 'mixed',
    summary: 'Mostly noise relative to stronger recent signals.'
  };
}

function modeCopy(mode = 'Beginner') {
  if (mode === 'Active trader') {
    return {
      title: 'Signal Reliability',
      subtitle: 'How recent signals have been behaving.',
      takeawayPrefix: 'Signal read',
    };
  }
  if (mode === 'Long-term') {
    return {
      title: 'Signal Reliability',
      subtitle: 'How recent signals have been behaving.',
      takeawayPrefix: 'Signal read',
    };
  }
  return {
    title: 'Signal Reliability',
    subtitle: 'How recent signals have been behaving.',
    takeawayPrefix: 'Signal read',
  };
}

export function buildTrustDashboard({ forwardValidation = [], recentAlertEvents = [], mode = 'Beginner' } = {}) {
  const outcomes = buildForwardOutcomeEntries(forwardValidation).map((entry) => ({
    ...entry,
    impact: buildImpactFromOutcome(entry)
  }));
  const resolved = outcomes.filter((entry) => typeof entry.latestReturnPct === 'number');
  const worked = resolved.filter((entry) => entry.outcomeTone === 'worked');
  const mixed = resolved.filter((entry) => entry.outcomeTone === 'mixed');
  const failed = resolved.filter((entry) => entry.outcomeTone === 'failed');
  const hitRate = resolved.length ? Math.round((worked.length / resolved.length) * 100) : null;
  const avgFollowThrough = average(resolved.map((entry) => entry.latestReturnPct));

  const bySymbol = {};
  resolved.forEach((entry) => {
    bySymbol[entry.symbol] = bySymbol[entry.symbol] || [];
    bySymbol[entry.symbol].push(entry.latestReturnPct);
  });
  const assetLeaders = Object.entries(bySymbol)
    .map(([symbol, values]) => {
      const symbolOutcomes = resolved.filter((entry) => entry.symbol === symbol);
      const impactScores = symbolOutcomes.map((entry) => entry.impact?.score).filter((value) => typeof value === 'number');
      return {
        symbol,
        avgReturn: average(values),
        samples: values.length,
        avgImpact: average(impactScores),
        strongestImpact: symbolOutcomes.slice().sort((a, b) => (b.impact?.score ?? -1) - (a.impact?.score ?? -1))[0]?.impact?.label || null,
      };
    })
    .sort((a, b) => ((b.avgImpact ?? b.avgReturn ?? -999) - (a.avgImpact ?? a.avgReturn ?? -999)));

  const alertSymbols = Array.from(new Set((recentAlertEvents || []).map((item) => item.symbol).filter(Boolean)));
  const matchedAlertOutcomes = resolved.filter((entry) => alertSymbols.includes(entry.symbol));
  const alertFollowThrough = matchedAlertOutcomes.length
    ? Math.round((matchedAlertOutcomes.filter((entry) => entry.latestReturnPct > 0).length / matchedAlertOutcomes.length) * 100)
    : null;

  const impactLeaders = resolved
    .slice()
    .sort((a, b) => (b.impact?.score ?? -1) - (a.impact?.score ?? -1))
    .slice(0, 3);

  let takeaway = 'Collect a few more completed checkpoints to build a stronger trust read.';
  if (hitRate !== null) {
    if (hitRate >= 65) takeaway = 'Recent signals have been following through more often than not.';
    else if (hitRate <= 40) takeaway = 'Recent signals have been choppier, so caution matters more right now.';
    else takeaway = 'Recent signals are mixed, so treat conviction as useful guidance rather than certainty.';
  }

  const mostMeaningful = impactLeaders[0] || null;
  const impactSummary = mostMeaningful
    ? `${mostMeaningful.symbol} delivered the strongest recent signal impact.`
    : 'Impact will appear once a few checkpoints close and separate signal from noise.';

  return {
    ...modeCopy(mode),
    trackedSignals: outcomes.length,
    resolvedSignals: resolved.length,
    hitRate,
    avgFollowThrough,
    workedCount: worked.length,
    mixedCount: mixed.length,
    failedCount: failed.length,
    leaders: assetLeaders.slice(0, 3),
    recentOutcomes: outcomes.slice(0, 5),
    impactLeaders,
    mostMeaningful,
    impactSummary,
    alertSymbolsTracked: alertSymbols.length,
    alertFollowThrough,
    takeaway,
  };
}
