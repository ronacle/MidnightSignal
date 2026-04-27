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

export type LiveSignalInput = {
  price?: number;
  change1h?: number;
  change24h?: number;
  change7d?: number;
  volumeRank?: number;
};

const assets = [
  ['ADA', 'Cardano', 0.62, 4.3], ['BTC', 'Bitcoin', 68420, 1.4], ['ETH', 'Ethereum', 3420, 2.6],
  ['NIGHT', 'Midnight', 0.18, 7.1], ['SOL', 'Solana', 151, -1.8], ['XRP', 'XRP', 0.58, 0.9],
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
function finiteNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function buildSignals(mode: TraderMode, live: Record<string, LiveSignalInput> = {}): AssetSignal[] {
  const modeBias = mode === 'scalp' ? 4 : mode === 'position' ? -2 : 1;

  return assets.map(([symbol, name, fallbackPrice, fallbackChange24h]) => {
    const liveInput = live[symbol] || {};
    const price = finiteNumber(liveInput.price, fallbackPrice);
    const change1h = finiteNumber(liveInput.change1h, fallbackChange24h / 6);
    const change24h = finiteNumber(liveInput.change24h, fallbackChange24h);
    const change7d = finiteNumber(liveInput.change7d, change24h * 2.25);
    const volumeRank = finiteNumber(liveInput.volumeRank, seeded(symbol, 13));

    // Live-first scoring: the top signal now responds to fresh market movement,
    // not just the static fallback universe.
    const momentum = clamp(50 + change1h * 10 + change24h * 3.8 + seeded(symbol, 5) / 3 + modeBias);
    const trend = clamp(50 + change24h * 2.4 + change7d * 0.75 + seeded(symbol, 7) / 3);
    const volatility = clamp(34 + Math.abs(change1h) * 8 + Math.abs(change24h) * 3.2 + seeded(symbol, 11) / 4);
    const liquidity = clamp(72 - volumeRank * 1.35, 10, 72);
    const mtf = clamp(momentum * .38 + trend * .38 + (100 - volatility) * .14 + liquidity * .10);
    const confidence = clamp(Math.round(mtf + (change1h > 1.25 ? 5 : change1h < -1.25 ? -5 : 0) + (change24h > 4 ? 4 : change24h < -4 ? -4 : 0)));
    const label: SignalLabel = confidence >= 67 ? 'Bullish' : confidence <= 45 ? 'Bearish' : 'Neutral';
    const why = label === 'Bullish'
      ? `${symbol} is showing improving live momentum with trend alignment across the active ${mode} view.`
      : label === 'Bearish'
        ? `${symbol} has weaker live confirmation right now, with volatility pressuring the current setup.`
        : `${symbol} is mixed: enough movement to watch, but not enough confirmation to chase.`;
    return {
      symbol,
      name,
      price,
      change24h: Number(change24h.toFixed(2)),
      confidence,
      momentum: Math.round(momentum),
      trend: Math.round(trend),
      volatility: Math.round(volatility),
      mtf: Math.round(mtf),
      label,
      why
    };
  }).sort((a, b) => b.confidence - a.confidence);
}

export function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: price < 1 ? 4 : 2 }).format(price);
}
