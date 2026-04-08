
function pct(value) {
  const num = Number(value || 0);
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(1)}%`;
}

function toneFromAsset(asset = {}) {
  const conviction = Number(asset.conviction ?? asset.signalScore ?? 0);
  if (conviction >= 70) return 'constructive';
  if (conviction <= 45) return 'fragile';
  return 'balanced';
}

function buildNarrativeSetup(asset = {}, regimeSummary = {}) {
  const label = asset.signalLabel || 'Balanced signal posture';
  const regime = regimeSummary?.regime || asset.marketRegime || 'Mixed';
  const change = Number(asset.change24h || 0);
  const tone = toneFromAsset(asset);

  if (label === 'Momentum building') {
    return `${asset.symbol} is leading with a ${tone} tone. In a ${regime.toLowerCase()} market, traders will usually look for breakout follow-through, strong closes, and expanding participation before trusting the move.`;
  }

  if (label === 'Calm accumulation posture') {
    return `${asset.symbol} is showing a steadier build than a hype spike. In a ${regime.toLowerCase()} tape, the better context cues are quiet strength, resilience on dips, and whether volume stays supportive instead of fading.`;
  }

  if (label === 'High-risk reversal watch') {
    return `${asset.symbol} is entering a more unstable zone. The context tonight is less about bullish excitement and more about whether fear, liquidations, or sharp countertrend chatter start to dominate the narrative.`;
  }

  if (label === 'Weak conviction bounce') {
    return `${asset.symbol} is trying to bounce, but the posture is still delicate. Context matters here because weak relief rallies often attract hopeful headlines before the structure actually improves.`;
  }

  return `${asset.symbol} is in a more mixed posture tonight. The useful context is whether the market starts supplying a cleaner story around strength, weakness, or indecision instead of staying noisy.`;
}

function buildNewsCues(asset = {}, rankedAssets = [], watchlist = []) {
  const symbol = asset.symbol || 'This asset';
  const label = asset.signalLabel || 'Balanced signal posture';
  const change = Number(asset.change24h || 0);
  const watch = new Set((watchlist || []).map((item) => String(item).toUpperCase()));
  const peers = (rankedAssets || []).filter((item) => item.symbol !== symbol).slice(0, 3).map((item) => item.symbol);
  const leader = rankedAssets?.[0]?.symbol || symbol;

  const cues = [];

  if (label === 'Momentum building') {
    cues.push({
      title: 'Momentum headlines matter most here',
      body: `${symbol} is up ${pct(change)} over the last 24h, so the highest-value context is whether headlines keep reinforcing strength or start calling the move crowded.`
    });
    cues.push({
      title: 'Watch relative-strength comparisons',
      body: `Compare ${symbol} against ${peers.join(', ') || 'other majors'} to see whether the story stays about leadership or slips back into the pack.`
    });
  } else if (label === 'Calm accumulation posture') {
    cues.push({
      title: 'Quiet strength beats loud hype',
      body: `The better context for ${symbol} is not dramatic news flow. It is steady commentary about positioning, persistence, and buyers showing up repeatedly instead of all at once.`
    });
    cues.push({
      title: 'Patience cues are more useful than excitement cues',
      body: `If the narrative stays measured while structure improves, ${symbol} usually keeps a healthier posture than a setup driven only by short-term excitement.`
    });
  } else if (label === 'High-risk reversal watch') {
    cues.push({
      title: 'Headline risk is elevated',
      body: `${symbol} is vulnerable to sharp narrative swings tonight. Look for panic language, liquidation chatter, or abrupt sentiment flips before assuming a clean reversal is underway.`
    });
    cues.push({
      title: 'A calmer tape would help',
      body: `If commentary starts shifting from fear toward stabilization, the setup can improve. Until then, context should be treated as risk management, not confirmation.`
    });
  } else if (label === 'Weak conviction bounce') {
    cues.push({
      title: 'Bounce headlines need verification',
      body: `${symbol} may attract optimistic takes, but the context question is whether the move is being respected broadly or only cheered in pockets.`
    });
    cues.push({
      title: 'Look for improving tone, not just price',
      body: `A better backdrop would show stronger language around structure, participation, and follow-through — not only relief that the chart stopped bleeding for a moment.`
    });
  } else {
    cues.push({
      title: 'Mixed posture needs narrative clarity',
      body: `${symbol} is not giving a loud read yet, so context is most useful when it helps separate real leadership from general market noise.`
    });
    cues.push({
      title: 'Keep leadership in view',
      body: `${leader} is still setting much of the tone. If ${symbol} starts drawing stronger commentary while the market leader cools, that shift can matter.`
    });
  }

  if (watch.has(symbol)) {
    cues.push({
      title: 'Watchlist priority stays active',
      body: `${symbol} is already on your watchlist, so tonight’s context should answer a simple question: does the story make this setup more actionable or just more tempting?`
    });
  }

  return cues.slice(0, 3);
}

function buildXAngles(asset = {}, regimeSummary = {}) {
  const symbol = asset.symbol || 'Asset';
  const label = asset.signalLabel || 'Balanced signal posture';
  const regime = regimeSummary?.regime || asset.marketRegime || 'Mixed';
  const sentiment = asset.sentiment || 'neutral';

  const angles = [
    `X watch: ${symbol} chatter will likely center on ${label.toLowerCase()} rather than raw price alone.`,
    `Narrative check: in a ${regime.toLowerCase()} market, crowd conviction can change faster than structure, so separate confident posts from durable follow-through.`,
  ];

  if (sentiment === 'bullish') {
    angles.push(`Bias check: bullish posts are useful only if they still mention participation, breadth, and holding strength after the first push.`);
  } else if (sentiment === 'bearish') {
    angles.push(`Bias check: bearish posts can become overcrowded fast, so watch for whether fear stays dominant or starts to exhaust itself.`);
  } else {
    angles.push(`Bias check: mixed sentiment usually means X is better for seeing what people are debating than for finding instant confirmation.`);
  }

  return angles.slice(0, 3);
}

export function buildSignalContext(asset, rankedAssets = [], watchlist = [], regimeSummary = {}) {
  if (!asset) return null;

  return {
    headline: `${asset.symbol} context layer`,
    subhead: 'Narrative cues for the signal, the tape, and the kind of X chatter worth paying attention to.',
    setup: buildNarrativeSetup(asset, regimeSummary),
    newsCues: buildNewsCues(asset, rankedAssets, watchlist),
    xAngles: buildXAngles(asset, regimeSummary),
  };
}
