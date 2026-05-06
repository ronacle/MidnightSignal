export type CanonicalAsset = {
  symbol: string;
  name: string;
  network?: string;
  coingeckoId?: string;
  defaultPrice: number;
  defaultChange24h: number;
  aliases: string[];
};

export const MIDNIGHT_NETWORK_DEFAULT_WATCHLIST = ['BTC', 'ADA', 'NIGHT'] as const;

export const CANONICAL_ASSETS: CanonicalAsset[] = [
  { symbol: 'ADA', name: 'Cardano', network: 'Cardano', coingeckoId: 'cardano', defaultPrice: 0.62, defaultChange24h: 4.3, aliases: ['CARDANO'] },
  { symbol: 'BTC', name: 'Bitcoin', network: 'Bitcoin', coingeckoId: 'bitcoin', defaultPrice: 68420, defaultChange24h: 1.4, aliases: ['BITCOIN', 'XBT'] },
  { symbol: 'NIGHT', name: 'Midnight', network: 'Cardano', coingeckoId: 'midnight-3', defaultPrice: 0.036, defaultChange24h: 1.2, aliases: ['MIDNIGHT', 'MIDNIGHT NETWORK', 'MID'] },
  { symbol: 'ETH', name: 'Ethereum', coingeckoId: 'ethereum', defaultPrice: 3420, defaultChange24h: 2.6, aliases: ['ETHEREUM'] },
  { symbol: 'SOL', name: 'Solana', coingeckoId: 'solana', defaultPrice: 151, defaultChange24h: -1.8, aliases: ['SOLANA'] },
  { symbol: 'XRP', name: 'XRP', coingeckoId: 'ripple', defaultPrice: 0.58, defaultChange24h: 0.9, aliases: ['RIPPLE'] },
  { symbol: 'LINK', name: 'Chainlink', coingeckoId: 'chainlink', defaultPrice: 17.9, defaultChange24h: 3.2, aliases: ['CHAINLINK'] },
  { symbol: 'AVAX', name: 'Avalanche', coingeckoId: 'avalanche-2', defaultPrice: 38.2, defaultChange24h: -2.7, aliases: ['AVALANCHE'] },
  { symbol: 'DOT', name: 'Polkadot', coingeckoId: 'polkadot', defaultPrice: 7.3, defaultChange24h: 1.9, aliases: ['POLKADOT'] },
  { symbol: 'MATIC', name: 'Polygon', coingeckoId: 'matic-network', defaultPrice: 0.91, defaultChange24h: -0.6, aliases: ['POLYGON'] },
  { symbol: 'SUI', name: 'Sui', coingeckoId: 'sui', defaultPrice: 1.72, defaultChange24h: 5.8, aliases: ['SUI NETWORK'] },
  { symbol: 'ARB', name: 'Arbitrum', coingeckoId: 'arbitrum', defaultPrice: 1.08, defaultChange24h: -1.2, aliases: ['ARBITRUM'] },
  { symbol: 'RNDR', name: 'Render', coingeckoId: 'render-token', defaultPrice: 9.6, defaultChange24h: 6.3, aliases: ['RENDER'] },
  { symbol: 'NEAR', name: 'Near', coingeckoId: 'near', defaultPrice: 6.4, defaultChange24h: 2.2, aliases: ['NEAR PROTOCOL'] },
  { symbol: 'ATOM', name: 'Cosmos', coingeckoId: 'cosmos', defaultPrice: 8.2, defaultChange24h: -3.1, aliases: ['COSMOS'] },
  { symbol: 'FIL', name: 'Filecoin', coingeckoId: 'filecoin', defaultPrice: 6.1, defaultChange24h: 0.5, aliases: ['FILECOIN'] },
  { symbol: 'AAVE', name: 'Aave', coingeckoId: 'aave', defaultPrice: 112, defaultChange24h: 4.9, aliases: ['AAVE'] },
  { symbol: 'UNI', name: 'Uniswap', coingeckoId: 'uniswap', defaultPrice: 9.8, defaultChange24h: -0.8, aliases: ['UNISWAP'] },
  { symbol: 'DOGE', name: 'Dogecoin', coingeckoId: 'dogecoin', defaultPrice: 0.15, defaultChange24h: 1.1, aliases: ['DOGECOIN'] },
  { symbol: 'LTC', name: 'Litecoin', coingeckoId: 'litecoin', defaultPrice: 82.4, defaultChange24h: -1.6, aliases: ['LITECOIN'] }
];

const aliasMap = new Map<string, string>();
for (const asset of CANONICAL_ASSETS) {
  aliasMap.set(asset.symbol, asset.symbol);
  aliasMap.set(asset.name.toUpperCase(), asset.symbol);
  for (const alias of asset.aliases) aliasMap.set(alias.toUpperCase(), asset.symbol);
}

export function normalizeAssetSymbol(value: string) {
  const clean = value.trim().toUpperCase();
  return aliasMap.get(clean) || clean;
}

export function getCanonicalAsset(symbol: string) {
  const normalized = normalizeAssetSymbol(symbol);
  return CANONICAL_ASSETS.find(asset => asset.symbol === normalized);
}

export function coingeckoIdsBySymbol() {
  return Object.fromEntries(CANONICAL_ASSETS.filter(asset => asset.coingeckoId).map(asset => [asset.symbol, asset.coingeckoId as string]));
}
