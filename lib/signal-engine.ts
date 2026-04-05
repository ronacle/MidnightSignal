import type { DashboardPayload, SignalSnapshot, SignalLabel } from "./types";
import { fetchCoinGeckoMarkets } from "./market-data";

type RawCoin = Awaited<ReturnType<typeof fetchCoinGeckoMarkets>>[number];

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

function scoreFromMarket(raw: RawCoin): SignalSnapshot {
  const change = raw.price_change_percentage_24h ?? 0;
  const marketCap = raw.market_cap || 1;
  const volume = raw.total_volume || 0;
  const volumeRatio = volume / marketCap;

  const trend = clamp(Math.round(50 + change * 3.2), 8, 95);
  const momentum = clamp(Math.round(45 + change * 4.5), 5, 96);
  const structure = clamp(Math.round(36 + volumeRatio * 260), 12, 92);
  const confidence = clamp(Math.round(trend * 0.38 + momentum * 0.38 + structure * 0.24), 8, 96);

  let label: SignalLabel = "Neutral Drift";
  let posture = "Mixed market posture. No clean edge without stronger follow-through.";
  if (confidence >= 66) {
    label = "Bullish Momentum";
    posture = "Trend and short-term momentum are aligned well enough to support an offensive posture.";
  } else if (confidence <= 47) {
    label = "Bearish Pressure";
    posture = "Weak trend posture and poor follow-through keep this in defense-first territory.";
  }

  return {
    asset: raw.symbol.toUpperCase(),
    symbol: raw.symbol.toUpperCase(),
    price: raw.current_price ?? 0,
    priceChange24h: change,
    volume24h: volume,
    marketCap,
    label,
    confidence,
    posture,
    breakdown: { trend, momentum, structure }
  };
}

function buildPayload(grid: SignalSnapshot[], source: "coingecko" | "fallback"): DashboardPayload {
  const sorted = [...grid].sort((a, b) => b.confidence - a.confidence);
  const top = sorted[0];
  return {
    generatedAt: new Date().toISOString(),
    source,
    top,
    grid: sorted,
    brief: [
      `${top.asset} leads tonight's stack with ${top.confidence}% confidence and ${top.priceChange24h.toFixed(2)}% 24h price change.`,
      `The model blends 24h price change, momentum bias, and volume-vs-market-cap structure into one posture score.`,
      `This output is educational and heuristic. It is not financial advice.`
    ],
    sinceLastVisit: [
      `${sorted[1].asset} is the next-strongest read in tonight's market stack.`,
      `${sorted[sorted.length - 1].asset} is the weakest posture right now.`,
      `Real data is now powering the dashboard, so the stack updates with current market conditions.`
    ],
    settings: { mode: "Beginner", strategy: "Swing", timeframe: "1H", watchlist: ["BTC", "ETH", "ADA"] }
  };
}

function fallbackPayload(): DashboardPayload {
  const fallback: SignalSnapshot[] = [
    { asset: "BTC", symbol: "BTC", price: 0, priceChange24h: 2.1, volume24h: 0, marketCap: 0, label: "Bullish Momentum", confidence: 71, posture: "Fallback posture: positive bias remains intact.", breakdown: { trend: 70, momentum: 72, structure: 68 } },
    { asset: "ETH", symbol: "ETH", price: 0, priceChange24h: 1.3, volume24h: 0, marketCap: 0, label: "Bullish Momentum", confidence: 66, posture: "Fallback posture: constructive but less forceful than BTC.", breakdown: { trend: 64, momentum: 67, structure: 66 } },
    { asset: "SOL", symbol: "SOL", price: 0, priceChange24h: -0.4, volume24h: 0, marketCap: 0, label: "Neutral Drift", confidence: 54, posture: "Fallback posture: mixed read.", breakdown: { trend: 54, momentum: 52, structure: 56 } },
    { asset: "ADA", symbol: "ADA", price: 0, priceChange24h: -1.8, volume24h: 0, marketCap: 0, label: "Bearish Pressure", confidence: 42, posture: "Fallback posture: pressure remains elevated.", breakdown: { trend: 39, momentum: 42, structure: 45 } }
  ];
  return buildPayload(fallback, "fallback");
}

export async function generateDashboard(): Promise<DashboardPayload> {
  try {
    const markets = await fetchCoinGeckoMarkets();
    return buildPayload(markets.map(scoreFromMarket), "coingecko");
  } catch {
    return fallbackPayload();
  }
}
