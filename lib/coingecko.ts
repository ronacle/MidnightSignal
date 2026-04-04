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

export async function fetchMarketData(): Promise<MarketCoin[]> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false",
    {
      next: { revalidate: 60 },
      headers: { accept: "application/json" }
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch market data");
  }

  return res.json();
}
