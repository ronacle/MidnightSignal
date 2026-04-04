export type MarketCoin = {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap_rank: number;
  price_change_percentage_24h: number | null;
  high_24h: number | null;
  low_24h: number | null;
  total_volume: number | null;
};

const FALLBACK_COINS: MarketCoin[] = [
  {
    id: "bitcoin",
    symbol: "btc",
    name: "Bitcoin",
    current_price: 68000,
    market_cap_rank: 1,
    price_change_percentage_24h: 1.8,
    high_24h: 69000,
    low_24h: 66500,
    total_volume: 32000000000
  },
  {
    id: "ethereum",
    symbol: "eth",
    name: "Ethereum",
    current_price: 3400,
    market_cap_rank: 2,
    price_change_percentage_24h: 0.9,
    high_24h: 3460,
    low_24h: 3320,
    total_volume: 14000000000
  },
  {
    id: "cardano",
    symbol: "ada",
    name: "Cardano",
    current_price: 0.72,
    market_cap_rank: 10,
    price_change_percentage_24h: 2.4,
    high_24h: 0.74,
    low_24h: 0.69,
    total_volume: 680000000
  },
  {
    id: "solana",
    symbol: "sol",
    name: "Solana",
    current_price: 185,
    market_cap_rank: 5,
    price_change_percentage_24h: -1.2,
    high_24h: 189,
    low_24h: 181,
    total_volume: 3900000000
  },
  {
    id: "ripple",
    symbol: "xrp",
    name: "XRP",
    current_price: 0.61,
    market_cap_rank: 6,
    price_change_percentage_24h: -0.7,
    high_24h: 0.63,
    low_24h: 0.60,
    total_volume: 2100000000
  },
  {
    id: "avalanche-2",
    symbol: "avax",
    name: "Avalanche",
    current_price: 37.5,
    market_cap_rank: 12,
    price_change_percentage_24h: 1.1,
    high_24h: 38.4,
    low_24h: 36.8,
    total_volume: 490000000
  }
];

export async function fetchMarketData(): Promise<{ coins: MarketCoin[]; usingFallback: boolean }> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false",
      {
        next: { revalidate: 60 },
        headers: { accept: "application/json" }
      }
    );

    if (!res.ok) {
      console.error("CoinGecko fetch failed with status:", res.status);
      return { coins: FALLBACK_COINS, usingFallback: true };
    }

    const data = (await res.json()) as MarketCoin[];

    if (!Array.isArray(data) || data.length === 0) {
      console.error("CoinGecko returned empty or invalid data");
      return { coins: FALLBACK_COINS, usingFallback: true };
    }

    return { coins: data, usingFallback: false };
  } catch (error) {
    console.error("CoinGecko fetch error:", error);
    return { coins: FALLBACK_COINS, usingFallback: true };
  }
}
