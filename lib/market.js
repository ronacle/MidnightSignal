const DEFAULT_ASSETS = [
  {
    id: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    current_price: 84250,
    price_change_percentage_24h: 2.14,
    market_cap_rank: 1,
    signalScore: 78,
    posture: 'Bullish',
    brief: 'Momentum remains constructive while broader participation improves.'
  },
  {
    id: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    current_price: 4098,
    price_change_percentage_24h: 1.42,
    market_cap_rank: 2,
    signalScore: 67,
    posture: 'Constructive',
    brief: 'Holding structure well with steady trend support.'
  },
  {
    id: 'cardano',
    symbol: 'ADA',
    name: 'Cardano',
    current_price: 0.88,
    price_change_percentage_24h: 3.36,
    market_cap_rank: 9,
    signalScore: 74,
    posture: 'Bullish',
    brief: 'Relative strength is improving and sentiment is firming up.'
  },
  {
    id: 'solana',
    symbol: 'SOL',
    name: 'Solana',
    current_price: 198.3,
    price_change_percentage_24h: -0.55,
    market_cap_rank: 5,
    signalScore: 58,
    posture: 'Neutral',
    brief: 'Momentum cooled, but trend structure is still intact.'
  },
  {
    id: 'chainlink',
    symbol: 'LINK',
    name: 'Chainlink',
    current_price: 19.42,
    price_change_percentage_24h: 1.08,
    market_cap_rank: 15,
    signalScore: 62,
    posture: 'Constructive',
    brief: 'Quiet accumulation behavior with improving risk/reward.'
  },
  {
    id: 'avalanche-2',
    symbol: 'AVAX',
    name: 'Avalanche',
    current_price: 42.9,
    price_change_percentage_24h: -1.81,
    market_cap_rank: 12,
    signalScore: 44,
    posture: 'Bearish',
    brief: 'Weak follow-through keeps it below a strong conviction threshold.'
  }
];

function withTimeout(promise, ms = 5000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms))
  ]);
}

function scoreFromChange(change) {
  const safe = Number.isFinite(change) ? change : 0;
  const raw = 58 + safe * 4;
  return Math.max(25, Math.min(92, Math.round(raw)));
}

function postureFromScore(score) {
  if (score >= 70) return 'Bullish';
  if (score >= 55) return 'Constructive';
  if (score >= 45) return 'Neutral';
  return 'Bearish';
}

function briefFromScore(score, change) {
  if (score >= 70) return `Momentum is leading tonight with ${change >= 0 ? 'buyers still in control' : 'resilient strength despite pullback'}.`;
  if (score >= 55) return 'Trend quality is decent, but follow-through still needs confirmation.';
  if (score >= 45) return 'Mixed conditions suggest patience and selective positioning.';
  return 'Weak structure and fading momentum are keeping conviction low.';
}

function normalizeCoin(coin) {
  const change = Number(coin.price_change_percentage_24h ?? 0);
  const signalScore = scoreFromChange(change);
  return {
    id: coin.id,
    symbol: String(coin.symbol || '').toUpperCase(),
    name: coin.name,
    current_price: Number(coin.current_price ?? 0),
    price_change_percentage_24h: change,
    market_cap_rank: Number(coin.market_cap_rank ?? 999),
    signalScore,
    posture: postureFromScore(signalScore),
    brief: briefFromScore(signalScore, change)
  };
}

export function getFallbackMarketData() {
  return {
    ok: true,
    source: 'fallback',
    updatedAt: new Date().toISOString(),
    assets: DEFAULT_ASSETS
  };
}

export async function fetchMarketData() {
  const fallback = getFallbackMarketData();

  try {
    const ids = 'bitcoin,ethereum,cardano,solana,chainlink,avalanche-2';
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=6&page=1&sparkline=false&price_change_percentage=24h`;

    const response = await withTimeout(
      fetch(url, {
        headers: { accept: 'application/json' },
        next: { revalidate: 300 }
      }),
      6000
    );

    if (!response.ok) {
      throw new Error(`CoinGecko returned ${response.status}`);
    }

    const json = await response.json();
    const assets = Array.isArray(json) ? json.map(normalizeCoin) : fallback.assets;

    if (!assets.length) {
      throw new Error('No market data received');
    }

    return {
      ok: true,
      source: 'coingecko',
      updatedAt: new Date().toISOString(),
      assets
    };
  } catch (error) {
    return {
      ...fallback,
      error: error instanceof Error ? error.message : 'Unknown data error'
    };
  }
}
