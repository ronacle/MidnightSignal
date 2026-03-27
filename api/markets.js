export default async function handler(req, res) {
  try {
    const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h";
    const marketRes = await fetch(url, { headers: { accept: "application/json" } });
    if (!marketRes.ok) throw new Error(`Upstream ${marketRes.status}`);
    const rows = await marketRes.json();
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
    res.status(200).json({ coins: rows });
  } catch (err) {
    res.status(500).json({ error: "markets_failed", detail: String(err?.message || err) });
  }
}
