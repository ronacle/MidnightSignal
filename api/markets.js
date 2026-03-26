const ID_MAP = {
  BTC: "bitcoin", ETH: "ethereum", ADA: "cardano", SOL: "solana", XRP: "ripple",
  DOGE: "dogecoin", AVAX: "avalanche-2", DOT: "polkadot", BNB: "binancecoin",
  TON: "the-open-network", LINK: "chainlink", LTC: "litecoin", BCH: "bitcoin-cash",
  NEAR: "near", APT: "aptos", ARB: "arbitrum", OP: "optimism", FIL: "filecoin",
  ATOM: "cosmos", TRX: "tron"
};

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Upstream ${res.status}`);
  return res.json();
}

export default async function handler(req, res) {
  try {
    const marketsUrl = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h";
    const rows = await getJson(marketsUrl);

    const enriched = await Promise.all(rows.map(async (row) => {
      const symbol = String(row.symbol || "").toUpperCase();
      const id = ID_MAP[symbol];
      let price_history = [];
      if (id) {
        try {
          const chart = await getJson(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=30`);
          if (Array.isArray(chart.prices)) price_history = chart.prices.map(p => p[1]).slice(-50);
        } catch {}
      }
      return { ...row, price_history };
    }));

    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
    res.status(200).json({ coins: enriched });
  } catch (err) {
    res.status(500).json({ error: "markets_failed", detail: String(err?.message || err) });
  }
}
