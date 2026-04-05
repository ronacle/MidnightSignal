const COIN_MAP = {
  BTC: { id: "bitcoin", name: "Bitcoin" },
  ETH: { id: "ethereum", name: "Ethereum" },
  SOL: { id: "solana", name: "Solana" },
  XRP: { id: "ripple", name: "XRP" },
  ADA: { id: "cardano", name: "Cardano" },
  BNB: { id: "binancecoin", name: "BNB" },
  DOGE: { id: "dogecoin", name: "Dogecoin" },
  TRX: { id: "tron", name: "TRON" },
  AVAX: { id: "avalanche-2", name: "Avalanche" },
  LINK: { id: "chainlink", name: "Chainlink" },
  DOT: { id: "polkadot", name: "Polkadot" },
  TON: { id: "the-open-network", name: "Toncoin" },
  LTC: { id: "litecoin", name: "Litecoin" },
  BCH: { id: "bitcoin-cash", name: "Bitcoin Cash" },
  NEAR: { id: "near", name: "NEAR" },
  APT: { id: "aptos", name: "Aptos" },
  ARB: { id: "arbitrum", name: "Arbitrum" },
  OP: { id: "optimism", name: "Optimism" },
  FIL: { id: "filecoin", name: "Filecoin" },
  ATOM: { id: "cosmos", name: "Cosmos" },
};

export async function GET() {
  try {
    const ids = Object.values(COIN_MAP).map((item) => item.id).join(",");
    const url =
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}` +
      `&order=market_cap_desc&sparkline=false&price_change_percentage=24h`;

    const res = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`CoinGecko markets request failed: ${res.status}`);
    }

    const data = await res.json();
    const mapped = data.map((coin, index) => ({
      symbol: coin.symbol?.toUpperCase(),
      name: coin.name,
      price: coin.current_price,
      change24h: coin.price_change_percentage_24h ?? 0,
      volumeNum: coin.total_volume ?? 0,
      rank: coin.market_cap_rank || index + 1,
      marketCap: coin.market_cap ?? 0,
      lastUpdated: coin.last_updated ?? null,
    }));

    return Response.json({
      ok: true,
      source: "coingecko",
      items: mapped,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        source: "fallback",
        message: error?.message || "Unable to load CoinGecko market data.",
        items: [],
      },
      { status: 200 }
    );
  }
}
