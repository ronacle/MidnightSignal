import { AssetSignal, LiveSignalInput, TraderMode, buildSignals } from './signals';

export type MarketCondition = 'calm' | 'active' | 'volatile';

export type TrustSnapshot = {
  signals: AssetSignal[];
  source: 'CoinGecko live' | 'Fallback demo data';
  updatedAt: string;
  marketCondition: MarketCondition;
  confidenceReason: string;
};

const ids: Record<string, string> = {
  ADA: 'cardano', BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', XRP: 'ripple', LINK: 'chainlink',
  AVAX: 'avalanche-2', DOT: 'polkadot', MATIC: 'matic-network', SUI: 'sui', ARB: 'arbitrum',
  RNDR: 'render-token', NEAR: 'near', ATOM: 'cosmos', FIL: 'filecoin', AAVE: 'aave', UNI: 'uniswap',
  DOGE: 'dogecoin', LTC: 'litecoin'
};

const supportedSymbols = Object.keys(ids);

type CoinGeckoMarketRow = {
  id: string;
  current_price?: number;
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_24h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
};

function condition(signals: AssetSignal[]): MarketCondition {
  const avgVol = signals.reduce((sum, s) => sum + s.volatility, 0) / Math.max(signals.length, 1);
  if (avgVol >= 64) return 'volatile';
  if (avgVol >= 48) return 'active';
  return 'calm';
}

function reason(top: AssetSignal, previous?: AssetSignal) {
  if (!previous) return `${top.symbol} leads because live trend and momentum are currently the strongest combined readings.`;
  const delta = top.confidence - previous.confidence;
  if (top.symbol !== previous.symbol) return `${top.symbol} replaced ${previous.symbol} as live momentum and trend alignment shifted.`;
  if (delta > 0) return `${top.symbol} confidence improved by ${delta} points as live momentum and trend alignment strengthened.`;
  if (delta < 0) return `${top.symbol} confidence cooled by ${Math.abs(delta)} points as volatility weighed on the setup.`;
  return `${top.symbol} confidence is steady; the live setup remains watchable without a major posture change.`;
}

export async function getMarketSnapshot(mode: TraderMode, currency: string, previousTop?: AssetSignal): Promise<TrustSnapshot> {
  const fallback = buildSignals(mode);
  const updatedAt = new Date().toISOString();
  const liveIds = Object.values(ids).join(',');
  const vsCurrency = currency.toLowerCase();

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vsCurrency}&ids=${liveIds}&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=1h,24h,7d`,
      {
        cache: 'no-store',
        next: { revalidate: 0 },
        headers: { accept: 'application/json' }
      }
    );

    if (!res.ok) throw new Error('CoinGecko request failed');
    const rows = (await res.json()) as CoinGeckoMarketRow[];
    const liveBySymbol: Record<string, LiveSignalInput> = {};

    Object.entries(ids).forEach(([symbol, id]) => {
      const rowIndex = rows.findIndex(row => row.id === id);
      const row = rowIndex >= 0 ? rows[rowIndex] : undefined;
      if (!row) return;
      liveBySymbol[symbol] = {
        price: row.current_price,
        change1h: row.price_change_percentage_1h_in_currency,
        change24h: row.price_change_percentage_24h_in_currency,
        change7d: row.price_change_percentage_7d_in_currency,
        volumeRank: rowIndex
      };
    });

    const sorted = buildSignals(mode, liveBySymbol);
    return { signals: sorted, source: 'CoinGecko live', updatedAt, marketCondition: condition(sorted), confidenceReason: reason(sorted[0], previousTop) };
  } catch {
    return { signals: fallback, source: 'Fallback demo data', updatedAt, marketCondition: condition(fallback), confidenceReason: reason(fallback[0], previousTop) };
  }
}

export function supportedLiveSymbols() { return supportedSymbols; }

export async function getMarketPrice(symbol: string, currency = 'USD'): Promise<number> {
  const fallback = buildSignals('swing').find(item => item.symbol === symbol)?.price;
  const id = ids[symbol];
  if (!id) {
    if (fallback) return fallback;
    throw new Error(`Unsupported symbol: ${symbol}`);
  }

  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=${currency.toLowerCase()}`, {
      cache: 'no-store',
      next: { revalidate: 0 },
      headers: { accept: 'application/json' }
    });
    if (!res.ok) throw new Error('CoinGecko price request failed');
    const data = await res.json();
    const price = Number(data[id]?.[currency.toLowerCase()]);
    if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid CoinGecko price response');
    return price;
  } catch {
    if (fallback) return fallback;
    throw new Error(`No fallback price for ${symbol}`);
  }
}
