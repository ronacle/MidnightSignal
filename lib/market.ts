import { AssetSignal, TraderMode, buildSignals } from './signals';

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

function condition(signals: AssetSignal[]): MarketCondition {
  const avgVol = signals.reduce((sum, s) => sum + s.volatility, 0) / Math.max(signals.length, 1);
  if (avgVol >= 64) return 'volatile';
  if (avgVol >= 48) return 'active';
  return 'calm';
}

function reason(top: AssetSignal, previous?: AssetSignal) {
  if (!previous) return `${top.symbol} leads because trend and momentum are currently the strongest combined readings.`;
  const delta = top.confidence - previous.confidence;
  if (delta > 0) return `${top.symbol} confidence improved by ${delta} points as momentum and trend alignment strengthened.`;
  if (delta < 0) return `${top.symbol} confidence cooled by ${Math.abs(delta)} points as volatility weighed on the setup.`;
  return `${top.symbol} confidence is steady; the setup remains watchable without a major posture change.`;
}

export async function getMarketSnapshot(mode: TraderMode, currency: string, previousTop?: AssetSignal): Promise<TrustSnapshot> {
  const fallback = buildSignals(mode);
  const updatedAt = new Date().toISOString();
  const liveIds = Object.values(ids).join(',');

  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${liveIds}&vs_currencies=${currency.toLowerCase()}&include_24hr_change=true`, { cache: 'no-store' });
    if (!res.ok) throw new Error('CoinGecko request failed');
    const data = await res.json();
    const live = fallback.map(item => {
      const id = ids[item.symbol];
      if (!id || !data[id]?.[currency.toLowerCase()]) return item;
      const price = Number(data[id][currency.toLowerCase()]);
      const change24h = Number(data[id][`${currency.toLowerCase()}_24h_change`] ?? item.change24h);
      return { ...item, price, change24h: Number(change24h.toFixed(2)) };
    });
    const recalculated = buildSignals(mode).map(sig => {
      const liveMatch = live.find(x => x.symbol === sig.symbol);
      return liveMatch ? { ...sig, price: liveMatch.price, change24h: liveMatch.change24h } : sig;
    });
    const sorted = recalculated.sort((a, b) => b.confidence - a.confidence);
    return { signals: sorted, source: 'CoinGecko live', updatedAt, marketCondition: condition(sorted), confidenceReason: reason(sorted[0], previousTop) };
  } catch {
    return { signals: fallback, source: 'Fallback demo data', updatedAt, marketCondition: condition(fallback), confidenceReason: reason(fallback[0], previousTop) };
  }
}

export function supportedLiveSymbols() { return supportedSymbols; }
