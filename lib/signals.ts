import { CANONICAL_ASSETS } from './assets';

export type TraderMode = 'scalp' | 'swing' | 'position';
export type Experience = 'beginner' | 'pro';
export type SignalLabel = 'Bullish' | 'Neutral' | 'Bearish';

export type AssetSignal = {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  confidence: number;
  momentum: number;
  trend: number;
  volatility: number;
  mtf: number;
  label: SignalLabel;
  why: string;
};

const assets = CANONICAL_ASSETS.map(asset => [asset.symbol, asset.name, asset.defaultPrice, asset.defaultChange24h] as const);

function clamp(value: number, min = 0, max = 100) { return Math.max(min, Math.min(max, value)); }
function seeded(symbol: string, salt: number) {
  return Array.from(symbol).reduce((sum, char) => sum + char.charCodeAt(0) * salt, 0) % 37;
}

export function buildSignals(mode: TraderMode): AssetSignal[] {
  const modeBias = mode === 'scalp' ? 4 : mode === 'position' ? -2 : 1;
  return assets.map(([symbol, name, price, change24h]) => {
    const momentum = clamp(52 + change24h * 6 + seeded(symbol, 5) / 2 + modeBias);
    const trend = clamp(48 + change24h * 4 + seeded(symbol, 7) / 2);
    const volatility = clamp(38 + Math.abs(change24h) * 6 + seeded(symbol, 11) / 3);
    const mtf = clamp(momentum * .35 + trend * .45 + (100 - volatility) * .2);
    const confidence = clamp(Math.round(mtf + (change24h > 3 ? 8 : change24h < -2 ? -8 : 0)));
    const label: SignalLabel = confidence >= 67 ? 'Bullish' : confidence <= 45 ? 'Bearish' : 'Neutral';
    const why = label === 'Bullish'
      ? `${symbol} is showing improving momentum with trend alignment across the active ${mode} view.`
      : label === 'Bearish'
        ? `${symbol} has weaker confirmation right now, with volatility pressuring the current setup.`
        : `${symbol} is mixed: enough movement to watch, but not enough confirmation to chase.`;
    return { symbol, name, price, change24h, confidence, momentum: Math.round(momentum), trend: Math.round(trend), volatility: Math.round(volatility), mtf: Math.round(mtf), label, why };
  }).sort((a, b) => b.confidence - a.confidence);
}

export function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: price < 1 ? 4 : 2 }).format(price);
}
