function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function getSentiment(score) {
  if (score >= 68) return 'bullish';
  if (score <= 44) return 'bearish';
  return 'neutral';
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

export function buildSignalStory(asset) {
  const lead = [];
  const factors = asset?.factors || {};
  const ranked = Object.entries(factors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([key]) => key);

  if (ranked.includes('momentum')) lead.push('momentum');
  if (ranked.includes('trend')) lead.push('trend');
  if (ranked.includes('volume')) lead.push('volume confirmation');
  if (ranked.includes('relativeStrength')) lead.push('relative strength');
  if (ranked.includes('volatility')) lead.push('volatility structure');

  if ((asset?.signalScore || 0) >= 70) {
    return `${asset.symbol} is leading tonight because ${lead.join(' and ')} are aligned.`;
  }
  if ((asset?.signalScore || 0) >= 58) {
    return `${asset.symbol} is constructive with support from ${lead.join(' and ')}, but still needs follow-through.`;
  }
  if ((asset?.signalScore || 0) >= 45) {
    return `${asset.symbol} is mixed tonight, with partial support from ${lead.join(' and ')}.`;
  }
  return `${asset.symbol} is lagging tonight as ${lead.join(' and ')} are not providing enough support.`;
}

export function scoreAsset(asset, marketContext = {}) {
  const momentum = normalizeMomentum(asset.change24h || 0);
  const trend = normalizeTrend(asset.rank || 20);
  const volume = normalizeVolume(asset.volumeNum || 0);
  const relativeStrength = normalizeRelativeStrength(asset.change24h || 0, marketContext.averageChange24h || 0);
  const volatility = normalizeVolatility(asset.change24h || 0);

  const signalScore = Math.round(
    momentum * 0.30 +
    trend * 0.20 +
    volume * 0.15 +
    relativeStrength * 0.20 +
    volatility * 0.15
  );

  const enriched = {
    ...asset,
    conviction: signalScore,
    signalScore,
    sentiment: getSentiment(signalScore),
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
  const averageChange24h = assets.length
    ? assets.reduce((sum, asset) => sum + Number(asset.change24h || 0), 0) / assets.length
    : 0;

  return assets
    .map((asset) => scoreAsset(asset, { averageChange24h }))
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
    factors: asset.factors || {},
    source: marketSource,
    timestamp: new Date().toISOString(),
  };
}
