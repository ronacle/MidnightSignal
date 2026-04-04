import type { MarketCoin } from "./coingecko";

export type SignalLabel = "Bullish" | "Neutral" | "Bearish" | "Watch";

export type AssetSignal = {
  id: string;
  symbol: string;
  name: string;
  label: SignalLabel;
  confidence: number;
  score: number;
  reasons: string[];
  price: number;
  dayChange: number;
  volume: number;
  rangePosition: number;
};

export type MarketSummary = {
  posture: string;
  topSignal: AssetSignal;
  assets: AssetSignal[];
  brief: string[];
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function rankVolume(volume: number) {
  if (volume >= 5_000_000_000) return 18;
  if (volume >= 1_000_000_000) return 14;
  if (volume >= 500_000_000) return 10;
  if (volume >= 100_000_000) return 6;
  return 2;
}

function getRangePosition(price: number, low: number | null, high: number | null) {
  if (!low || !high || high <= low) return 0.5;
  return clamp((price - low) / (high - low), 0, 1);
}

export function analyzeCoin(coin: MarketCoin): AssetSignal {
  const dayChange = coin.price_change_percentage_24h ?? 0;
  const volume = coin.total_volume ?? 0;
  const rangePosition = getRangePosition(coin.current_price, coin.low_24h, coin.high_24h);

  let score = 50;
  const reasons: string[] = [];

  if (dayChange >= 4) {
    score += 18;
    reasons.push("Strong 24h momentum");
  } else if (dayChange >= 1.5) {
    score += 11;
    reasons.push("Positive short-term momentum");
  } else if (dayChange <= -4) {
    score -= 18;
    reasons.push("Heavy 24h selling pressure");
  } else if (dayChange <= -1.5) {
    score -= 11;
    reasons.push("Negative short-term momentum");
  } else {
    reasons.push("Momentum is mixed");
  }

  if (rangePosition >= 0.75) {
    score += 12;
    reasons.push("Price is pressing the daily high");
  } else if (rangePosition >= 0.58) {
    score += 6;
    reasons.push("Price is holding upper range");
  } else if (rangePosition <= 0.25) {
    score -= 12;
    reasons.push("Price is near the daily low");
  } else if (rangePosition <= 0.42) {
    score -= 6;
    reasons.push("Price is in the lower range");
  } else {
    reasons.push("Price sits near mid-range");
  }

  const volumeBoost = rankVolume(volume);
  score += volumeBoost;
  if (volumeBoost >= 14) reasons.push("High liquidity supports conviction");
  else if (volumeBoost >= 6) reasons.push("Healthy participation");
  else reasons.push("Lighter participation");

  score = clamp(score, 5, 95);

  let label: SignalLabel = "Neutral";
  if (score >= 68) label = "Bullish";
  else if (score <= 34) label = "Bearish";
  else if ((dayChange > 0 && rangePosition < 0.45) || (dayChange < 0 && rangePosition > 0.55)) label = "Watch";

  return {
    id: coin.id,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    label,
    confidence: Math.round(score),
    score,
    reasons: reasons.slice(0, 3),
    price: coin.current_price,
    dayChange,
    volume,
    rangePosition
  };
}

export function buildMarketSummary(coins: MarketCoin[]): MarketSummary {
  const assets = coins.map(analyzeCoin).sort((a, b) => b.score - a.score);
  const topSignal = assets[0];

  const avgChange =
    assets.reduce((sum, asset) => sum + asset.dayChange, 0) / Math.max(assets.length, 1);

  const bullishCount = assets.filter((a) => a.label === "Bullish").length;
  const bearishCount = assets.filter((a) => a.label === "Bearish").length;

  let posture = "Balanced but selective";
  if (bullishCount >= 7 && avgChange > 1) posture = "Risk-on momentum building";
  if (bearishCount >= 6 && avgChange < -1) posture = "Risk-off pressure rising";

  const brief = [
    bullishCount >= bearishCount ? "Upside leadership is stronger than downside pressure" : "Defensive posture is leading today's board",
    avgChange >= 0 ? "Broad market change is net positive over 24h" : "Broad market change is net negative over 24h",
    topSignal ? `${topSignal.symbol} is the highest-confidence setup right now` : "No top signal available"
  ];

  return { posture, topSignal, assets, brief };
}
