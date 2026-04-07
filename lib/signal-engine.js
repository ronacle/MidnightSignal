function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalizeMomentum(change24h = 0) {
  return clamp(50 + change24h * 6, 0, 100);
}

function normalizeTrend(rank = 20) {
  if (rank <= 3) return 88;
  if (rank <= 8) return 76;
  if (rank <= 15) return 64;
  return 54;
}

function normalizeVolume(volumeNum = 0) {
  if (volumeNum >= 10_000_000_000) return 86;
  if (volumeNum >= 5_000_000_000) return 76;
  if (volumeNum >= 1_000_000_000) return 66;
  if (volumeNum >= 500_000_000) return 58;
  return 48;
}

function normalizeRelativeStrength(change24h = 0, marketAverage = 0) {
  return clamp(50 + (change24h - marketAverage) * 8, 0, 100);
}

function normalizeVolatility(change24h = 0) {
  const abs = Math.abs(change24h);
  if (abs <= 1.5) return 54;
  if (abs <= 3.5) return 72;
  if (abs <= 7) return 66;
  if (abs <= 12) return 56;
  return 44;
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

  const tf5m = clamp(50 + change * 3.2 + rel * 3.5, 0, 100);
  const tf15m = clamp(50 + change * 4.2 + rel * 4.5 + (rank <= 10 ? 2 : -1), 0, 100);
  const tf1h = clamp(50 + change * 5.2 + rel * 5.2 + (rank <= 5 ? 4 : rank <= 12 ? 1 : -2), 0, 100);

  const mtfMomentum = Math.round(tf5m * 0.5 + tf15m * 0.3 + tf1h * 0.2);

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

  const avgChange24h = assets.reduce((sum, asset) => sum + Number(asset.change24h || 0), 0) / assets.length
  const avgAbsChange24h = assets.reduce((sum, asset) => sum + Math.abs(Number(asset.change24h || 0)), 0) / assets.length
  const bullishBreadth = assets.filter((asset) => Number(asset.change24h || 0) > 0).length / assets.length

  let regime = 'Mixed'
  if (avgAbsChange24h >= 3.5 && Math.abs(avgChange24h) >= 1.0) {
    regime = 'Trending'
  } else if (avgAbsChange24h <= 1.25) {
    regime = 'Chop'
  } else if (bullishBreadth <= 0.35 || bullishBreadth >= 0.65) {
    regime = 'Directional'
  }

  return {
    regime,
    avgChange24h,
    avgAbsChange24h,
    bullishBreadth
  }
}

function getRegimeWeights(regime) {
  if (regime === 'Trending') {
    return { momentum: 0.34, trend: 0.20, volume: 0.14, relativeStrength: 0.20, volatility: 0.12 };
  }
  if (regime === 'Chop') {
    return { momentum: 0.20, trend: 0.20, volume: 0.14, relativeStrength: 0.16, volatility: 0.30 };
  }
  if (regime === 'Directional') {
    return { momentum: 0.30, trend: 0.18, volume: 0.14, relativeStrength: 0.24, volatility: 0.14 };
  }
  return { momentum: 0.30, trend: 0.20, volume: 0.15, relativeStrength: 0.20, volatility: 0.15 };
}

export function buildSignalStory(asset) {
  const factors = asset?.factors || {};
  const ranked = Object.entries(factors)
    .filter(([, value]) => typeof value === 'number')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([key]) => key);

  const phrases = [];
  if (ranked.includes('momentum')) phrases.push('multi-timeframe momentum');
  if (ranked.includes('trend')) phrases.push('trend quality');
  if (ranked.includes('volume')) phrases.push('volume confirmation');
  if (ranked.includes('relativeStrength')) phrases.push('relative strength');
  if (ranked.includes('volatility')) phrases.push('volatility structure');

  const lead = phrases.length ? phrases.join(' and ') : 'signal alignment';
  const regimeText = asset.marketRegime ? ` in a ${asset.marketRegime.toLowerCase()} market` : '';

  if ((asset?.signalScore || 0) >= 70) {
    return `${asset.symbol} is leading tonight because ${lead} are aligned${regimeText}.`;
  }
  if ((asset?.signalScore || 0) >= 58) {
    return `${asset.symbol} is constructive with support from ${lead}${regimeText}, but still needs follow-through.`;
  }
  if ((asset?.signalScore || 0) >= 45) {
    return `${asset.symbol} is mixed tonight, with partial support from ${lead}${regimeText}.`;
  }
  return `${asset.symbol} is lagging tonight as ${lead} are not providing enough support${regimeText}.`;
}

export function scoreAsset(asset, marketContext = {}) {
  const marketAverage = marketContext.averageChange24h || 0;
  const timeframe = deriveTimeframeSignals(asset, marketAverage);

  const momentum = timeframe.mtfMomentum;
  const trend = normalizeTrend(asset.rank || 20);
  const volume = normalizeVolume(asset.volumeNum || 0);
  const relativeStrength = normalizeRelativeStrength(asset.change24h || 0, marketAverage);
  const volatility = normalizeVolatility(asset.change24h || 0);

  const weights = getRegimeWeights(marketContext.regime || 'Mixed');

  const signalScore = Math.round(
    momentum * weights.momentum +
    trend * weights.trend +
    volume * weights.volume +
    relativeStrength * weights.relativeStrength +
    volatility * weights.volatility
  );

  const enriched = {
    ...asset,
    conviction: signalScore,
    signalScore,
    sentiment: getSentiment(signalScore),
    marketRegime: marketContext.regime || 'Mixed',
    weights,
    timeframe,
    factors: {
      momentum: Math.round(momentum),
      trend: Math.round(trend),
      volume: Math.round(volume),
      relativeStrength: Math.round(relativeStrength),
      volatility: Math.round(volatility),
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
