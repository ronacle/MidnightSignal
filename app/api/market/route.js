const PRIORITY_SYMBOLS = [
  'BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'BNB', 'DOGE', 'TRX', 'AVAX', 'LINK',
  'DOT', 'TON', 'LTC', 'BCH', 'NEAR', 'APT', 'ARB', 'OP', 'ATOM', 'SEI'
];

const EXTRA_ID_MAP = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  XRP: 'ripple',
  ADA: 'cardano',
  BNB: 'binancecoin',
  DOGE: 'dogecoin',
  TRX: 'tron',
  AVAX: 'avalanche-2',
  LINK: 'chainlink',
  DOT: 'polkadot',
  TON: 'the-open-network',
  LTC: 'litecoin',
  BCH: 'bitcoin-cash',
  NEAR: 'near',
  APT: 'aptos',
  ARB: 'arbitrum',
  OP: 'optimism',
  ATOM: 'cosmos',
  SEI: 'sei-network',
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeCoin(coin, index) {
  const currentPrice = Number(coin.current_price ?? 0);
  const marketCap = Number(coin.market_cap ?? 0);
  const volumeNum = Number(coin.total_volume ?? 0);
  const high24h = Number(coin.high_24h ?? currentPrice);
  const low24h = Number(coin.low_24h ?? currentPrice);
  const change24h = Number(coin.price_change_percentage_24h ?? 0);
  const marketCapChange24h = Number(coin.market_cap_change_percentage_24h ?? 0);
  const priceRange24h = high24h > 0 ? ((high24h - low24h) / high24h) * 100 : 0;
  const distanceFromHigh24h = high24h > 0 ? ((currentPrice - high24h) / high24h) * 100 : 0;
  const volumeToMarketCap = marketCap > 0 ? (volumeNum / marketCap) * 100 : 0;

  return {
    id: coin.id,
    symbol: String(coin.symbol || '').toUpperCase(),
    name: coin.name,
    price: currentPrice,
    change24h,
    marketCapChange24h,
    volumeNum,
    marketCap,
    rank: Number(coin.market_cap_rank || index + 1),
    lastUpdated: coin.last_updated ?? null,
    high24h,
    low24h,
    priceRange24h: Number(priceRange24h.toFixed(2)),
    distanceFromHigh24h: Number(distanceFromHigh24h.toFixed(2)),
    volumeToMarketCap: Number(volumeToMarketCap.toFixed(2)),
    turnoverState: volumeToMarketCap >= 12 ? 'hot' : volumeToMarketCap >= 5 ? 'active' : 'steady',
    stretchState: clamp(distanceFromHigh24h, -100, 0) >= -1.5 ? 'near-high' : distanceFromHigh24h <= -6 ? 'faded' : 'mid-range',
  };
}

export async function GET() {
  try {
    const topUrl = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h';
    const extraIds = Object.values(EXTRA_ID_MAP).join(',');
    const extraUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${extraIds}&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h`;

    const [topRes, extraRes] = await Promise.all([
      fetch(topUrl, { headers: { accept: 'application/json' }, next: { revalidate: 60 } }),
      fetch(extraUrl, { headers: { accept: 'application/json' }, next: { revalidate: 60 } }),
    ]);

    if (!topRes.ok) {
      throw new Error(`CoinGecko markets request failed: ${topRes.status}`);
    }

    const topData = await topRes.json();
    const extraData = extraRes.ok ? await extraRes.json() : [];

    const merged = [...topData, ...extraData].reduce((map, coin) => {
      if (!coin?.symbol) return map;
      map.set(String(coin.symbol).toUpperCase(), coin);
      return map;
    }, new Map());

    const ordered = [
      ...PRIORITY_SYMBOLS.map((symbol) => merged.get(symbol)).filter(Boolean),
      ...Array.from(merged.values()).filter((coin) => !PRIORITY_SYMBOLS.includes(String(coin.symbol || '').toUpperCase())),
    ].slice(0, 20);

    const mapped = ordered.map((coin, index) => normalizeCoin(coin, index));

    return Response.json({
      ok: true,
      source: 'coingecko',
      updatedAt: new Date().toISOString(),
      items: mapped,
      meta: {
        count: mapped.length,
        universe: 'top20-priority-blend',
      },
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        source: 'fallback',
        updatedAt: new Date().toISOString(),
        message: error?.message || 'Unable to load CoinGecko market data.',
        items: [],
      },
      { status: 200 }
    );
  }
}
