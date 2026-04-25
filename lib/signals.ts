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

const assets = [
  ['ADA', 'Cardano', 0.62, 4.3], ['BTC', 'Bitcoin', 68420, 1.4], ['ETH', 'Ethereum', 3420, 2.6],
  ['MID', 'Midnight', 0.18, 7.1], ['SOL', 'Solana', 151, -1.8], ['XRP', 'XRP', 0.58, 0.9],
  ['LINK', 'Chainlink', 17.9, 3.2], ['AVAX', 'Avalanche', 38.2, -2.7], ['DOT', 'Polkadot', 7.3, 1.9],
  ['MATIC', 'Polygon', 0.91, -0.6], ['SUI', 'Sui', 1.72, 5.8], ['ARB', 'Arbitrum', 1.08, -1.2],
  ['RNDR', 'Render', 9.6, 6.3], ['NEAR', 'Near', 6.4, 2.2], ['ATOM', 'Cosmos', 8.2, -3.1],
  ['FIL', 'Filecoin', 6.1, 0.5], ['AAVE', 'Aave', 112, 4.9], ['UNI', 'Uniswap', 9.8, -0.8],
  ['DOGE', 'Dogecoin', 0.15, 1.1], ['LTC', 'Litecoin', 82.4, -1.6]
] as const;

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
