import { AssetSignal, SignalLabel, TraderMode, buildSignals } from './signals';
import { CANONICAL_ASSETS, coingeckoIdsBySymbol, normalizeAssetSymbol } from './assets';

export type MarketCondition = 'calm' | 'active' | 'volatile';

export type TrustSnapshot = {
  signals: AssetSignal[];
  source: 'CoinGecko live' | 'Fallback demo data';
  updatedAt: string;
  marketCondition: MarketCondition;
  confidenceReason: string;
};

type CoinGeckoMarketRow = {
  id: string;
  current_price?: number;
  price_change_percentage_1h_in_currency?: number | null;
  price_change_percentage_24h_in_currency?: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  total_volume?: number | null;
  market_cap?: number | null;
};

const ids: Record<string, string> = coingeckoIdsBySymbol();
const supportedSymbols = Object.keys(ids);
const assetBySymbol = new Map(CANONICAL_ASSETS.map(asset => [asset.symbol, asset]));
const symbolByCoinGeckoId = new Map(Object.entries(ids).map(([symbol, id]) => [id, symbol]));

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function condition(signals: AssetSignal[]): MarketCondition {
  const avgVol = signals.reduce((sum, s) => sum + s.volatility, 0) / Math.max(signals.length, 1);
  if (avgVol >= 64) return 'volatile';
  if (avgVol >= 48) return 'active';
  return 'calm';
}

function reason(top: AssetSignal, previous?: AssetSignal) {
  if (!previous) return `${top.symbol} leads because live trend, momentum, and volatility are currently the strongest combined readings.`;
  const delta = top.confidence - previous.confidence;
  if (delta > 0) return `${top.symbol} confidence improved by ${delta} points as live momentum and trend alignment strengthened.`;
  if (delta < 0) return `${top.symbol} confidence cooled by ${Math.abs(delta)} points as live volatility weighed on the setup.`;
  return `${top.symbol} confidence is steady; the live setup remains watchable without a major posture change.`;
}

function modeBias(mode: TraderMode) {
  if (mode === 'scalp') return 5;
  if (mode === 'position') return -2;
  return 1;
}

function labelFor(confidence: number): SignalLabel {
  if (confidence >= 67) return 'Bullish';
  if (confidence <= 45) return 'Bearish';
  return 'Neutral';
}

function liveWhy(symbol: string, label: SignalLabel, mode: TraderMode, change1h: number, change24h: number, change7d: number) {
  const shortTerm = `${change1h >= 0 ? '+' : ''}${change1h.toFixed(2)}% 1h`;
  const day = `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}% 24h`;
  const week = `${change7d >= 0 ? '+' : ''}${change7d.toFixed(2)}% 7d`;
  if (label === 'Bullish') return `${symbol} is leading the live ${mode} stack with positive momentum (${shortTerm}, ${day}) and supportive 7d trend (${week}).`;
  if (label === 'Bearish') return `${symbol} is under live pressure (${shortTerm}, ${day}), so Midnight Signal is treating it as defensive for the ${mode} view.`;
  return `${symbol} is mixed on live data (${shortTerm}, ${day}, ${week}), so it remains watchable but not a clean leader.`;
}

function mergeLiveSignal(
  base: AssetSignal,
  row: CoinGeckoMarketRow | undefined,
  mode: TraderMode
): AssetSignal {  if (!row?.current_price) return base;

  const change1h = Number(row.price_change_percentage_1h_in_currency ?? 0);
  const change24h = Number(row.price_change_percentage_24h_in_currency ?? base.change24h);
  const change7d = Number(row.price_change_percentage_7d_in_currency ?? change24h);
  const liquidityRatio = row.market_cap && row.total_volume ? clamp((Number(row.total_volume) / Number(row.market_cap)) * 1000, 0, 26) : 8;

  const momentum = clamp(50 + change1h * 10 + change24h * 3.2 + modeBias(mode) + liquidityRatio * 0.35);
  const trend = clamp(50 + change24h * 2.4 + change7d * 1.2 + liquidityRatio * 0.25);
  const volatility = clamp(34 + Math.abs(change1h) * 8 + Math.abs(change24h) * 3.2 + Math.abs(change7d) * 0.8);
  const mtf = clamp(momentum * 0.4 + trend * 0.42 + (100 - volatility) * 0.18);
  const confidence = Math.round(clamp(mtf + (change24h > 3 ? 5 : change24h < -3 ? -5 : 0)));
  const label = labelFor(confidence);

  return {
    ...base,
    price: Number(row.current_price),
    change24h: Number(change24h.toFixed(2)),
    confidence,
    momentum: Math.round(momentum),
    trend: Math.round(trend),
    volatility: Math.round(volatility),
    mtf: Math.round(mtf),
    label,
    why: liveWhy(base.symbol, label, mode, change1h, change24h, change7d)
  };
}

async function fetchCoinGeckoMarkets(currency: string): Promise<Map<string, CoinGeckoMarketRow>> {
  const liveIds = Object.values(ids).join(',');
  const url = new URL('https://api.coingecko.com/api/v3/coins/markets');
  url.searchParams.set('vs_currency', currency.toLowerCase());
  url.searchParams.set('ids', liveIds);
  url.searchParams.set('order', 'market_cap_desc');
  url.searchParams.set('per_page', '250');
  url.searchParams.set('page', '1');
  url.searchParams.set('sparkline', 'false');
  url.searchParams.set('price_change_percentage', '1h,24h,7d');

  const res = await fetch(url.toString(), { cache: 'no-store', next: { revalidate: 0 } });
  if (!res.ok) throw new Error('CoinGecko markets request failed');
  const rows = (await res.json()) as CoinGeckoMarketRow[];
  return new Map(rows.map(row => [row.id, row]));
}

export async function getMarketSnapshot(mode: TraderMode, currency: string, previousTop?: AssetSignal): Promise<TrustSnapshot> {
  const fallback = buildSignals(mode);
  const updatedAt = new Date().toISOString();

  try {
    const rows = await fetchCoinGeckoMarkets(currency);
    const live = fallback.map(signal => mergeLiveSignal(signal, rows.get(ids[signal.symbol]), mode));

    // NIGHT does not have a dependable public CoinGecko market id yet, so keep it as a canonical Midnight asset
    // while live market symbols rotate around it.
    const sorted = live.sort((a, b) => b.confidence - a.confidence || Math.abs(b.change24h) - Math.abs(a.change24h));
    return { signals: sorted, source: 'CoinGecko live', updatedAt, marketCondition: condition(sorted), confidenceReason: reason(sorted[0], previousTop) };
  } catch {
    return { signals: fallback, source: 'Fallback demo data', updatedAt, marketCondition: condition(fallback), confidenceReason: reason(fallback[0], previousTop) };
  }
}

export function supportedLiveSymbols() { return supportedSymbols; }

export async function getMarketPrice(symbol: string, currency = 'USD'): Promise<number> {
  const normalized = normalizeAssetSymbol(symbol);
  const fallback = buildSignals('swing').find(item => item.symbol === normalized)?.price ?? assetBySymbol.get(normalized)?.defaultPrice;
  const id = ids[normalized];
  if (!id) {
    if (fallback) return fallback;
    throw new Error(`Unsupported symbol: ${symbol}`);
  }

  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=${currency.toLowerCase()}`, { cache: 'no-store', next: { revalidate: 0 } });
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
