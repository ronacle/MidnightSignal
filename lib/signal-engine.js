function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalizeTrend(rank = 20) {
  if (rank <= 3) return 88;
  if (rank <= 8) return 78;
  if (rank <= 15) return 68;
  return 58;
}

function normalizeVolume(volumeNum = 0) {
  if (volumeNum >= 20_000_000_000) return 92;
  if (volumeNum >= 10_000_000_000) return 84;
  if (volumeNum >= 5_000_000_000) return 76;
  if (volumeNum >= 1_000_000_000) return 66;
  if (volumeNum >= 250_000_000) return 58;
  return 48;
}

function normalizeRelativeStrength(change24h = 0, marketAverage = 0) {
  return clamp(50 + (change24h - marketAverage) * 8, 0, 100);
}

function normalizeVolatility(change24h = 0, priceRange24h = 0) {
  const abs = Math.abs(change24h);
  const range = Number(priceRange24h || 0);
  if (abs <= 1.5 && range <= 3) return 56;
  if (abs <= 3.5 && range <= 6) return 74;
  if (abs <= 7 && range <= 10) return 68;
  if (abs <= 12 && range <= 15) return 58;
  return 46;
}

function normalizeLiquidity(volumeToMarketCap = 0) {
  if (volumeToMarketCap >= 15) return 86;
  if (volumeToMarketCap >= 10) return 76;
  if (volumeToMarketCap >= 6) return 66;
  if (volumeToMarketCap >= 3) return 58;
  return 48;
}

function normalizeStructure(distanceFromHigh24h = -10) {
  if (distanceFromHigh24h >= -1.5) return 82;
  if (distanceFromHigh24h >= -3.5) return 72;
  if (distanceFromHigh24h >= -6) return 62;
  if (distanceFromHigh24h >= -10) return 52;
  return 42;
}

function getSentiment(score) {
  if (score >= 68) return 'bullish';
  if (score <= 44) return 'bearish';
  return 'neutral';
}

function deriveTimeframeSignals(asset, marketAverage = 0) {
  const change = Number(asset.change24h || 0);
  const rel = change - marketAverage;
  const rank = Number(asset.rank || 20);
  const structure = Number(asset.distanceFromHigh24h || 0);

  const tf5m = clamp(50 + change * 3.2 + rel * 3.5 + structure * 0.8, 0, 100);
  const tf15m = clamp(50 + change * 4.2 + rel * 4.5 + structure * 1.1 + (rank <= 10 ? 2 : -1), 0, 100);
  const tf1h = clamp(50 + change * 5.2 + rel * 5.2 + structure * 1.4 + (rank <= 5 ? 4 : rank <= 12 ? 1 : -2), 0, 100);

  const mtfMomentum = Math.round(tf5m * 0.4 + tf15m * 0.35 + tf1h * 0.25);

  return {
    tf5m: Math.round(tf5m),
    tf15m: Math.round(tf15m),
    tf1h: Math.round(tf1h),
    mtfMomentum
  };
}

export function detectMarketRegime(assets = []) {
  if (!assets.length) {
    return {
      regime: 'Mixed',
      avgChange24h: 0,
      avgAbsChange24h: 0,
      bullishBreadth: 0
    };
  }

  const avgChange24h = assets.reduce((sum, asset) => sum + Number(asset.change24h || 0), 0) / assets.length;
  const avgAbsChange24h = assets.reduce((sum, asset) => sum + Math.abs(Number(asset.change24h || 0)), 0) / assets.length;
  const bullishBreadth = assets.filter((asset) => Number(asset.change24h || 0) > 0).length / assets.length;

  let regime = 'Mixed';
  if (avgAbsChange24h >= 3.5 && Math.abs(avgChange24h) >= 1.0) {
    regime = 'Trending';
  } else if (avgAbsChange24h <= 1.25) {
    regime = 'Chop';
  } else if (bullishBreadth <= 0.35 || bullishBreadth >= 0.65) {
    regime = 'Directional';
  }

  return {
    regime,
    avgChange24h,
    avgAbsChange24h,
    bullishBreadth
  };
}

function getRegimeWeights(regime) {
  if (regime === 'Trending') {
    return { momentum: 0.28, trend: 0.14, volume: 0.12, relativeStrength: 0.18, volatility: 0.10, liquidity: 0.08, structure: 0.10 };
  }
  if (regime === 'Chop') {
    return { momentum: 0.16, trend: 0.14, volume: 0.10, relativeStrength: 0.14, volatility: 0.22, liquidity: 0.10, structure: 0.14 };
  }
  if (regime === 'Directional') {
    return { momentum: 0.24, trend: 0.14, volume: 0.12, relativeStrength: 0.18, volatility: 0.10, liquidity: 0.10, structure: 0.12 };
  }
  return { momentum: 0.22, trend: 0.15, volume: 0.12, relativeStrength: 0.16, volatility: 0.12, liquidity: 0.10, structure: 0.13 };
}

function buildSignalLabel(asset) {
  const score = Number(asset?.signalScore || 0);
  const change24h = Number(asset?.change24h || 0);
  const structure = Number(asset?.distanceFromHigh24h || -10);
  const liquidity = Number(asset?.volumeToMarketCap || 0);

  if (score >= 74 && change24h >= 0 && structure >= -2.5) return 'Momentum building';
  if (score >= 64 && liquidity >= 6 && structure >= -4.5) return 'Calm accumulation posture';
  if (score <= 46 && change24h <= -2.5) return 'Weak conviction bounce';
  if (score <= 54 && Math.abs(change24h) >= 6) return 'High-risk reversal watch';
  return 'Balanced signal posture';
}

function buildReasons(asset) {
  const reasons = [];
  const factors = asset?.factors || {};
  const entries = Object.entries(factors)
    .filter(([, value]) => typeof value === 'number')
    .sort((a, b) => b[1] - a[1]);

  if (entries[0]?.[0] === 'momentum') reasons.push('Momentum is outperforming the market backdrop');
  if (entries.some(([name]) => name === 'relativeStrength')) reasons.push('Relative strength is holding up better than peers');
  if (Number(asset?.volumeToMarketCap || 0) >= 6) reasons.push('Participation is active enough to support the move');
  if (Number(asset?.distanceFromHigh24h || -10) >= -3) reasons.push('Price is staying close to its 24h high instead of fading');
  if (Number(asset?.rank || 99) <= 10) reasons.push('Large-cap depth is helping signal reliability');

  return reasons.slice(0, 3);
}

export function buildSignalStory(asset) {
  const reasons = buildReasons(asset);
  const label = buildSignalLabel(asset);
  const regimeText = asset.marketRegime ? ` in a ${asset.marketRegime.toLowerCase()} market` : '';
  const reasonText = reasons.length ? reasons.join(' · ') : 'signal alignment is doing the work';

  return `${label}. ${asset.symbol} is surfacing because ${reasonText.toLowerCase()}${regimeText}.`;
}

export function scoreAsset(asset, marketContext = {}) {
  const marketAverage = marketContext.averageChange24h || marketContext.avgChange24h || 0;
  const timeframe = deriveTimeframeSignals(asset, marketAverage);

  const momentum = timeframe.mtfMomentum;
  const trend = normalizeTrend(asset.rank || 20);
  const volume = normalizeVolume(asset.volumeNum || 0);
  const relativeStrength = normalizeRelativeStrength(asset.change24h || 0, marketAverage);
  const volatility = normalizeVolatility(asset.change24h || 0, asset.priceRange24h || 0);
  const liquidity = normalizeLiquidity(asset.volumeToMarketCap || 0);
  const structure = normalizeStructure(asset.distanceFromHigh24h || 0);

  const weights = getRegimeWeights(marketContext.regime || 'Mixed');

  const signalScore = Math.round(
    momentum * weights.momentum +
    trend * weights.trend +
    volume * weights.volume +
    relativeStrength * weights.relativeStrength +
    volatility * weights.volatility +
    liquidity * weights.liquidity +
    structure * weights.structure
  );

  const enriched = {
    ...asset,
    conviction: signalScore,
    signalScore,
    sentiment: getSentiment(signalScore),
    marketRegime: marketContext.regime || 'Mixed',
    weights,
    timeframe,
    signalLabel: buildSignalLabel({ ...asset, signalScore }),
    signalReasons: buildReasons({ ...asset, signalScore }),
    factors: {
      momentum: Math.round(momentum),
      trend: Math.round(trend),
      volume: Math.round(volume),
      relativeStrength: Math.round(relativeStrength),
      volatility: Math.round(volatility),
      liquidity: Math.round(liquidity),
      structure: Math.round(structure),
    }
  };

  return {
    ...enriched,
    story: buildSignalStory(enriched)
  };
}

export function rankAssets(assets = []) {
  const regimeContext = detectMarketRegime(assets);
  return assets
    .map((asset) => scoreAsset(asset, regimeContext))
    .sort((a, b) => {
      if (b.signalScore !== a.signalScore) return b.signalScore - a.signalScore;
      return String(a.symbol).localeCompare(String(b.symbol));
    });
}

export function buildSignalSnapshot(asset, marketSource = 'fallback') {
  if (!asset) return null;

  return {
    symbol: asset.symbol,
    name: asset.name,
    signalScore: asset.signalScore ?? asset.conviction ?? null,
    sentiment: asset.sentiment,
    regime: asset.marketRegime || 'Mixed',
    timeframe: asset.timeframe || {},
    factors: asset.factors || {},
    source: marketSource,
    timestamp: new Date().toISOString(),
  };
}
