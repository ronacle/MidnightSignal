export type SignalLabel = "Bullish Momentum" | "Neutral Drift" | "Bearish Pressure";

export type SignalSnapshot = {
  asset: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  label: SignalLabel;
  confidence: number;
  posture: string;
  breakdown: {
    trend: number;
    momentum: number;
    structure: number;
  };
};

export type DashboardPayload = {
  generatedAt: string;
  source: "coingecko" | "fallback";
  top: SignalSnapshot;
  grid: SignalSnapshot[];
  brief: string[];
  sinceLastVisit: string[];
  settings: {
    mode: "Beginner" | "Pro";
    strategy: "Swing";
    timeframe: "1H";
    watchlist: string[];
  };
};
