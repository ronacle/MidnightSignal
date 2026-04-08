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

function sentimentLabel(value = 'mixed') {
  const labels = {
    constructive: 'constructive',
    cautious: 'cautious',
    mixed: 'mixed',
    'risk-off': 'risk-off',
    hype: 'hype / crowded',
  };
  return labels[value] || 'mixed';
}

function buildNarrativeSetup(asset = {}, regimeSummary = {}) {
  const label = asset.signalLabel || 'Balanced signal posture';
  const regime = regimeSummary?.regime || asset.marketRegime || 'Mixed';
  const tone = toneFromAsset(asset);

  if (label === 'Momentum building') {
    return `${asset.symbol} is leading with a ${tone} tone. In a ${regime.toLowerCase()} market, the best context confirms participation, follow-through, and whether leadership is broadening instead of getting overcrowded.`;
  }

  if (label === 'Calm accumulation posture') {
    return `${asset.symbol} is showing a steadier build than a hype spike. In a ${regime.toLowerCase()} tape, the better cues are resilience on dips, measured commentary, and whether volume stays quietly supportive.`;
  }

  if (label === 'High-risk reversal watch') {
    return `${asset.symbol} is entering a more unstable zone. Context matters most if fear, liquidation chatter, or sudden narrative flips begin dominating the story.`;
  }

  if (label === 'Weak conviction bounce') {
    return `${asset.symbol} is trying to bounce, but the posture is still delicate. The context question is whether the move is earning real follow-through or only attracting short-lived relief talk.`;
  }

  return `${asset.symbol} is in a mixed posture tonight. The useful context is whatever helps separate real leadership or weakness from general market noise.`;
}

function buildFallbackNewsCues(asset = {}, rankedAssets = [], watchlist = []) {
  const symbol = asset.symbol || 'This asset';
  const label = asset.signalLabel || 'Balanced signal posture';
  const change = Number(asset.change24h || 0);
  const watch = new Set((watchlist || []).map((item) => String(item).toUpperCase()));
  const peers = (rankedAssets || []).filter((item) => item.symbol !== symbol).slice(0, 3).map((item) => item.symbol);
  const cues = [];

  if (label === 'Momentum building') {
    cues.push({
      title: 'Most relevant now',
      body: `${symbol} is up ${pct(change)} over the last 24h, so the highest-value context is whether new commentary still reinforces leadership or starts calling the move stretched.`,
    });
    cues.push({
      title: 'Narrative pressure',
      body: `Compare ${symbol} against ${peers.join(', ') || 'other majors'} to see whether the story stays about leadership or slips back into the pack.`,
    });
  } else if (label === 'Calm accumulation posture') {
    cues.push({
      title: 'Most relevant now',
      body: `${symbol} benefits more from steady, patient context than loud hype. Measured strength is more valuable here than dramatic headlines.`,
    });
    cues.push({
      title: 'Narrative pressure',
      body: `If the commentary stays restrained while structure improves, ${symbol} usually keeps a healthier posture than a setup driven only by short-term excitement.`,
    });
  } else if (label === 'High-risk reversal watch') {
    cues.push({
      title: 'Most relevant now',
      body: `${symbol} is vulnerable to sharp narrative swings tonight. Fear language, liquidation chatter, or abrupt sentiment flips matter more than isolated optimism.`,
    });
    cues.push({
      title: 'Narrative pressure',
      body: `A calmer tone would help, but until that appears, context should be treated as risk-management information rather than confirmation.`,
    });
  } else {
    cues.push({
      title: 'Most relevant now',
      body: `${symbol} is not giving a loud read yet, so context is most useful when it helps separate improving structure from general market chatter.`,
    });
    cues.push({
      title: 'Narrative pressure',
      body: `Watch whether crowd attention strengthens around ${symbol} itself, or stays anchored to broader market leaders instead.`,
    });
  }

  if (watch.has(symbol)) {
    cues.push({
      title: 'Watchlist priority',
      body: `${symbol} is already on your watchlist, so the real question tonight is whether incoming context makes the setup more actionable or merely more tempting.`,
    });
  }

  return cues.slice(0, 3);
}

function buildFallbackXAngles(asset = {}, regimeSummary = {}) {
  const symbol = asset.symbol || 'Asset';
  const regime = regimeSummary?.regime || asset.marketRegime || 'Mixed';
  const sentiment = asset.sentiment || 'neutral';

  const angles = [
    `Crowd tone on X will likely revolve around ${symbol} structure and conviction, not just raw price.`,
    `In a ${regime.toLowerCase()} market, crowd confidence can change faster than the setup itself, so separate loud posts from durable follow-through.`,
  ];

  if (sentiment === 'bullish') {
    angles.push('Bullish posts matter most when they still mention participation, breadth, and strength after the first push.');
  } else if (sentiment === 'bearish') {
    angles.push('Bearish posts can become crowded quickly, so watch whether fear is still building or already starting to exhaust itself.');
  } else {
    angles.push('Mixed crowd tone usually means X is better for seeing what traders are debating than for finding instant confirmation.');
  }

  return angles.slice(0, 3);
}

function buildLiveNewsCues(items = []) {
  return items.slice(0, 3).map((item, index) => ({
    title: index === 0 ? 'Most relevant now' : index === 1 ? 'Narrative pressure' : 'Context developing',
    body: item.body || `${item.source} · ${sentimentLabel(item.sentimentHint)}`,
    source: item.source,
    sourceType: item.sourceType,
    timestamp: item.timestamp,
    headline: item.title,
    relevanceScore: item.relevanceScore,
  }));
}

function buildLiveXAngles(items = [], asset = {}, regimeSummary = {}) {
  const xItems = items.filter((item) => item.sourceType === 'x').slice(0, 3);
  if (!xItems.length) return buildFallbackXAngles(asset, regimeSummary);

  return xItems.map((item) => {
    const mentions = item.assetMentions?.length ? ` · ${item.assetMentions.join(', ')}` : '';
    return `${item.source}: ${item.title}${mentions} · ${sentimentLabel(item.sentimentHint)}`;
  });
}

function buildAssetMentions(items = [], asset = {}) {
  const counts = new Map();
  items.forEach((item) => {
    (item.assetMentions || []).forEach((mention) => {
      counts.set(mention, (counts.get(mention) || 0) + 1);
    });
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([symbol, count]) => ({
      symbol,
      count,
      isPrimary: symbol === asset.symbol,
    }));
}

function buildMeta(items = [], liveMeta = {}) {
  const crowdCounts = { constructive: 0, cautious: 0, mixed: 0, 'risk-off': 0, hype: 0 };
  items.forEach((item) => {
    const key = item.sentimentHint || 'mixed';
    crowdCounts[key] = (crowdCounts[key] || 0) + 1;
  });

  const topTone = Object.entries(crowdCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'mixed';

  return {
    live: Boolean(items.length),
    updatedAt: liveMeta?.updatedAt || null,
    sourceTypes: liveMeta?.sourceTypes || {
      article: items.filter((item) => item.sourceType === 'article').length,
      x: items.filter((item) => item.sourceType === 'x').length,
      note: items.filter((item) => item.sourceType === 'note').length,
    },
    crowdTone: sentimentLabel(topTone),
  };
}



function buildMarketContext(asset = {}, rankedAssets = [], regimeSummary = {}) {
  const leaders = (rankedAssets || []).slice(0, 3).map((item) => item.symbol).filter(Boolean);
  const bullishCount = (rankedAssets || []).filter((item) => Number(item.signalScore ?? item.conviction ?? 0) >= 60).length;
  const fragileCount = (rankedAssets || []).filter((item) => Number(item.signalScore ?? item.conviction ?? 0) <= 45).length;
  const regime = regimeSummary?.regime || asset.marketRegime || 'Mixed';

  let headline = `Market leaning ${String(regime).toLowerCase()}.`;
  if (bullishCount >= 10) headline = "Broad participation is supporting tonight's tape.";
  else if (fragileCount >= 8) headline = 'Risk is clustering across the board tonight.';
  else if (leaders.length >= 2) headline = `${leaders.join(' · ')} are setting the tone right now.`;

  const detail = leaders.length
    ? `Leadership is currently being carried by ${leaders.join(', ')}, while ${asset.symbol || 'the selected asset'} is being judged against that broader tape.`
    : `${asset.symbol || 'The selected asset'} is being evaluated against a more mixed board tonight.`;

  return { headline, detail };
}

function buildWhyNow(asset = {}, regimeSummary = {}) {
  const agreement = Number(asset.timeframeAgreementScore || 0);
  const momentum = asset.momentumState || 'Stable';
  const volatility = asset.volatilityState || 'Balanced';
  const regime = regimeSummary?.regime || asset.marketRegime || 'Mixed';

  const reasons = [
    `Timeframe agreement is ${agreement >= 70 ? 'strong' : agreement >= 50 ? 'moderate' : 'still mixed'} across the 5m, 15m, and 1h read.`,
    `Momentum is currently ${String(momentum).toLowerCase()}, while volatility is ${String(volatility).toLowerCase()}.`,
    `${asset.symbol || 'This asset'} is being scored inside a ${String(regime).toLowerCase()} market regime, which changes how much conviction the engine is willing to assign.`,
  ];

  if ((asset.signalLabel || '') === 'Momentum building') {
    reasons.unshift(`${asset.symbol} is ranking highly because participation and follow-through are improving at the same time.`);
  } else if ((asset.signalLabel || '') === 'Calm accumulation posture') {
    reasons.unshift(`${asset.symbol} is earning its place through steadier structure rather than a single noisy spike.`);
  } else if ((asset.signalLabel || '') === 'High-risk reversal watch') {
    reasons.unshift(`${asset.symbol} is standing out because instability is elevated and the next move could be decisive.`);
  }

  return reasons.slice(0, 4);
}

function buildWatchNext(asset = {}) {
  const agreement = Number(asset.timeframeAgreementScore || 0);
  const momentum = asset.momentumState || 'Stable';
  const volatility = asset.volatilityState || 'Balanced';
  const items = [];

  if (agreement < 55) items.push('Watch for 1h agreement to improve before treating the move as durable.');
  else items.push('Watch whether the 1h trend can keep confirming the shorter-timeframe strength.');

  if (momentum === 'Accelerating') items.push('Momentum is already improving, so the next check is whether buyers can hold that pace through the next few cycles.');
  else if (momentum === 'Cooling') items.push('Momentum is fading, so the next check is whether the setup can stabilize before conviction slips further.');
  else items.push('Momentum is steady, so look for a cleaner push or pullback to reveal direction.');

  if (volatility === 'Expanding') items.push('Volatility is expanding, which raises both opportunity and false-move risk.');
  else if (volatility === 'Compressed') items.push('Volatility is compressed, so a cleaner directional move may be forming soon.');
  else items.push('Volatility is balanced, so confirmation matters more than drama.');

  return items.slice(0, 3);
}

function buildCatalystLine(asset = {}, liveContext = {}) {
  const topItem = Array.isArray(liveContext?.items) ? liveContext.items[0] : null;
  if (topItem?.title) return `Live catalyst watch: ${topItem.title}`;
  if ((asset.signalLabel || '') === 'Momentum building') return "Context suggests momentum is strengthening into tonight's lead signal.";
  if ((asset.signalLabel || '') === 'Calm accumulation posture') return 'Context suggests patient accumulation matters more than loud narrative spikes right now.';
  if ((asset.signalLabel || '') === 'High-risk reversal watch') return 'Context suggests traders should respect instability before assuming a durable reversal.';
  return 'Context suggests the tape still needs cleaner confirmation before narrative confidence should rise.';
}

function buildPressure(items = [], asset = {}) {
  if (!items.length) {
    return `${asset.symbol} still relies on fallback narrative cues, so narrative pressure is being inferred from the signal posture rather than live coverage.`;
  }

  const top = items[0];
  const score = Number(top.relevanceScore || 0);
  if (score >= 5) return `Narrative pressure is elevated around ${asset.symbol}. The highest-ranked item is fresh, relevant, and worth treating as part of tonight’s setup.`;
  if (score >= 3) return `Narrative pressure is active but not overwhelming. ${asset.symbol} has relevant discussion, though the signal should still do more work than the chatter.`;
  return `Narrative pressure is present but light. The live context supports awareness more than conviction.`;
}

export function buildSignalContext(asset, rankedAssets = [], watchlist = [], regimeSummary = {}, liveContext = {}) {
  if (!asset) return null;

  const items = Array.isArray(liveContext?.items)
    ? liveContext.items
        .filter((item) => (item.assetMentions || []).includes(asset.symbol))
        .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
        .slice(0, 6)
    : [];

  const hasLive = items.length > 0;

  const marketContext = buildMarketContext(asset, rankedAssets, regimeSummary);
  const whyNow = buildWhyNow(asset, regimeSummary);
  const watchNext = buildWatchNext(asset);
  const catalystLine = buildCatalystLine(asset, liveContext);

  return {
    headline: `${asset.symbol} context layer`,
    subhead: hasLive
      ? 'The context layer is now ranking incoming items by relevance, crowd tone, and asset focus.'
      : 'Narrative cues for the signal, the tape, and the kind of X chatter worth paying attention to.',
    setup: buildNarrativeSetup(asset, regimeSummary),
    newsCues: hasLive ? buildLiveNewsCues(items) : buildFallbackNewsCues(asset, rankedAssets, watchlist),
    xAngles: hasLive ? buildLiveXAngles(items, asset, regimeSummary) : buildFallbackXAngles(asset, regimeSummary),
    recentItems: items.slice(0, 5),
    assetMentions: buildAssetMentions(items, asset),
    narrativePressure: buildPressure(items, asset),
    marketContext,
    whyNow,
    watchNext,
    catalystLine,
    crowdTone: hasLive ? sentimentLabel(items[0]?.sentimentHint || liveContext?.meta?.crowdTone || 'mixed') : 'mixed',
    meta: buildMeta(items, liveContext?.meta),
  };
}
