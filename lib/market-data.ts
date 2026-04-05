type CoinGeckoMarket = {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number | null;
  market_cap_rank: number | null;
};

const IDS = [
  "bitcoin",
  "ethereum",
  "solana",
  "cardano",
  "ripple",
  "avalanche-2",
  "chainlink",
  "dogecoin",
  "polkadot",
  "sui"
];

export async function fetchCoinGeckoMarkets(): Promise<CoinGeckoMarket[]> {
  const url =
    "https://api.coingecko.com/api/v3/coins/markets" +
    "?vs_currency=usd" +
    "&ids=" + IDS.join(",") +
    "&order=market_cap_desc" +
    "&per_page=10&page=1" +
    "&sparkline=false" +
    "&price_change_percentage=24h";

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "accept": "application/json"
    },
    next: { revalidate: 120 }
  });

  if (!res.ok) {
    throw new Error(`CoinGecko request failed: ${res.status}`);
  }

  const data = (await res.json()) as CoinGeckoMarket[];
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("CoinGecko returned no market data");
  }
  return data;
}
