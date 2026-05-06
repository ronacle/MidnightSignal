import { AssetSignal, TraderMode, buildSignals } from './signals';
import { coingeckoIdsBySymbol, normalizeAssetSymbol } from './assets';

export type MarketCondition = 'calm' | 'active' | 'volatile';

export type LiveDiagnostics = {
  source: 'CoinGecko live' | 'Fallback demo data';
  requestedSymbols: string[];
  matchedSymbols: string[];
  missingSymbols: string[];
  rowCount: number;
  latencyMs: number;
  globalTop: string;
  currency: string;
  mode: TraderMode;
  fallbackReason?: string;
};

export type TrustSnapshot = {
  signals: AssetSignal[];
  source: 'CoinGecko live' | 'Fallback demo data';
  updatedAt: string;
  marketCondition: MarketCondition;
  confidenceReason: string;
  diagnostics: LiveDiagnostics;
};

type CoinGeckoMarketRow = {
  id: string;
  symbol: string;
  name: string;
  current_price: number | null;
  price_change_percentage_1h_in_currency?: number | null;
  price_change_percentage_24h_in_currency?: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  total_volume?: number | null;
  market_cap_rank?: number | null;
};

const ids: Record<string, string> = coingeckoIdsBySymbol();
const supportedSymbols = Object.keys(ids);

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
  if (!previous) return `${top.symbol} leads because live momentum, trend, and multi-timeframe readings are currently strongest.`;
  const delta = top.confidence - previous.confidence;
  if (delta > 0) return `${top.symbol} confidence improved by ${delta} points as live momentum and trend alignment strengthened.`;
  if (delta < 0) return `${top.symbol} confidence cooled by ${Math.abs(delta)} points as live volatility weighed on the setup.`;
  return `${top.symbol} confidence is steady; live market inputs have not materially changed the setup.`;
}

function scoreLiveSignal(base: AssetSignal, row: CoinGeckoMarketRow | undefined, mode: TraderMode): AssetSignal {
  if (!row?.current_price || !Number.isFinite(row.current_price)) return base;

  const change1h = Number(row.price_change_percentage_1h_in_currency ?? 0);
  const change24h = Number(row.price_change_percentage_24h_in_currency ?? base.change24h ?? 0);
  const change7d = Number(row.price_change_percentage_7d_in_currency ?? change24h ?? 0);
  const volumeBoost = row.total_volume && row.total_volume > 0 ? Math.min(8, Math.log10(row.total_volume) - 5) : 0;
  const modeBias = mode === 'scalp' ? change1h * 8 : mode === 'position' ? change7d * 1.4 : change24h * 3.2;

  const momentum = clamp(50 + change1h * 9 + change24h * 2.8 + volumeBoost);
  const trend = clamp(50 + change24h * 3.4 + change7d * 1.15 + volumeBoost / 2);
  const volatility = clamp(34 + Math.abs(change1h) * 9 + Math.abs(change24h) * 4 + Math.abs(change7d) * 0.85);
  const mtf = clamp(momentum * 0.34 + trend * 0.46 + (100 - volatility) * 0.2);
  const confidence = clamp(Math.round(mtf + modeBias + (change1h > 0 && change24h > 0 && change7d > 0 ? 6 : 0) - (change1h < 0 && change24h < 0 ? 8 : 0)), 12, 96);
  const label = confidence >= 67 ? 'Bullish' : confidence <= 45 ? 'Bearish' : 'Neutral';
  const why = label === 'Bullish'
    ? `${base.symbol} is leading on live ${mode} data: 1h ${change1h >= 0 ? '+' : ''}${change1h.toFixed(2)}%, 24h ${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%, and 7d ${change7d >= 0 ? '+' : ''}${change7d.toFixed(2)}%.`
    : label === 'Bearish'
      ? `${base.symbol} is under live pressure: momentum is weak while volatility is elevated across the current ${mode} view.`
      : `${base.symbol} is mixed on live data: enough movement to monitor, but not enough confirmation to chase.`;

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
    why
  };
}

async function fetchCoinGeckoMarkets(currency: string): Promise<Record<string, CoinGeckoMarketRow>> {
  const liveIds = Object.values(ids).join(',');
  const vsCurrency = currency.toLowerCase();
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${encodeURIComponent(vsCurrency)}&ids=${encodeURIComponent(liveIds)}&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=1h,24h,7d`;
  const res = await fetch(url, {
    cache: 'no-store',
    next: { revalidate: 0 },
    headers: { accept: 'application/json' }
  });
  if (!res.ok) throw new Error(`CoinGecko request failed: ${res.status}`);
  const rows = (await res.json()) as CoinGeckoMarketRow[];
  const byId: Record<string, CoinGeckoMarketRow> = {};
  for (const row of rows) byId[row.id] = row;
  return byId;
}

function buildDiagnostics(params: {
  source: 'CoinGecko live' | 'Fallback demo data';
  signals: AssetSignal[];
  byId?: Record<string, CoinGeckoMarketRow>;
  startedAt: number;
  currency: string;
  mode: TraderMode;
  fallbackReason?: string;
}): LiveDiagnostics {
  const requestedSymbols = [...supportedSymbols];
  const matchedSymbols = requestedSymbols.filter(symbol => Boolean(params.byId?.[ids[symbol]]?.current_price));
  const missingSymbols = requestedSymbols.filter(symbol => !matchedSymbols.includes(symbol));
  return {
    source: params.source,
    requestedSymbols,
    matchedSymbols,
    missingSymbols,
    rowCount: Object.keys(params.byId || {}).length,
    latencyMs: Date.now() - params.startedAt,
    globalTop: params.signals[0]?.symbol || 'N/A',
    currency: params.currency.toUpperCase(),
    mode: params.mode,
    fallbackReason: params.fallbackReason
  };
}

export async function getMarketSnapshot(mode: TraderMode, currency: string, previousTop?: AssetSignal): Promise<TrustSnapshot> {
  const fallback = buildSignals(mode);
  const updatedAt = new Date().toISOString();
  const startedAt = Date.now();

  try {
    const byId = await fetchCoinGeckoMarkets(currency);
    const live = fallback
      .map(signal => scoreLiveSignal(signal, byId[ids[signal.symbol]], mode))
      .sort((a, b) => b.confidence - a.confidence || b.change24h - a.change24h);
    const diagnostics = buildDiagnostics({ source: 'CoinGecko live', signals: live, byId, startedAt, currency, mode });
    return { signals: live, source: 'CoinGecko live', updatedAt, marketCondition: condition(live), confidenceReason: reason(live[0], previousTop), diagnostics };
  } catch (error) {
    const diagnostics = buildDiagnostics({
      source: 'Fallback demo data',
      signals: fallback,
      startedAt,
      currency,
      mode,
      fallbackReason: error instanceof Error ? error.message : 'Unknown live market error'
    });
    return { signals: fallback, source: 'Fallback demo data', updatedAt, marketCondition: condition(fallback), confidenceReason: reason(fallback[0], previousTop), diagnostics };
  }
}

export function supportedLiveSymbols() { return supportedSymbols; }

export async function getMarketPrice(symbol: string, currency = 'USD'): Promise<number> {
  const normalized = normalizeAssetSymbol(symbol);
  const fallback = buildSignals('swing').find(item => item.symbol === normalized)?.price;
  const id = ids[normalized];
  if (!id) {
    if (fallback) return fallback;
    throw new Error(`Unsupported symbol: ${symbol}`);
  }

  try {
    const byId = await fetchCoinGeckoMarkets(currency);
    const price = Number(byId[id]?.current_price);
    if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid CoinGecko price response');
    return price;
  } catch {
    if (fallback) return fallback;
    throw new Error(`No fallback price for ${symbol}`);
  }
}
