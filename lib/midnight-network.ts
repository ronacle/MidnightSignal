import type { AssetSignal } from './signals';

export const MIDNIGHT_NETWORK_SYMBOLS = ['BTC', 'ADA', 'NIGHT'] as const;
export type MidnightNetworkSymbol = typeof MIDNIGHT_NETWORK_SYMBOLS[number];

export type MidnightAssetRole = {
  symbol: MidnightNetworkSymbol;
  role: string;
  shortRole: string;
  thesis: string;
};

export type MidnightNetworkInsight = {
  score: number;
  posture: 'Strong' | 'Constructive' | 'Mixed' | 'Defensive';
  strongest: AssetSignal | null;
  weakest: AssetSignal | null;
  topContributor: string;
  drag: string;
  divergence: string;
  summary: string;
  basket: AssetSignal[];
};

export const MIDNIGHT_ASSET_ROLES: Record<MidnightNetworkSymbol, MidnightAssetRole> = {
  BTC: {
    symbol: 'BTC',
    role: 'Liquidity / macro anchor',
    shortRole: 'Macro anchor',
    thesis: 'BTC sets the broad risk backdrop for crypto liquidity and market appetite.'
  },
  ADA: {
    symbol: 'ADA',
    role: 'Cardano ecosystem anchor',
    shortRole: 'Cardano anchor',
    thesis: 'ADA reflects Cardano ecosystem strength, which matters for Midnight network attention.'
  },
  NIGHT: {
    symbol: 'NIGHT',
    role: 'Midnight ecosystem asset',
    shortRole: 'Midnight asset',
    thesis: 'NIGHT is the direct Midnight asset and should represent Midnight-specific signal strength.'
  }
};

export function midnightAssetRole(symbol: string) {
  return MIDNIGHT_ASSET_ROLES[symbol as MidnightNetworkSymbol];
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function buildMidnightNetworkInsight(signals: AssetSignal[]): MidnightNetworkInsight {
  const bySymbol = new Map(signals.map(signal => [signal.symbol, signal]));
  const basket = MIDNIGHT_NETWORK_SYMBOLS.map(symbol => bySymbol.get(symbol)).filter(Boolean) as AssetSignal[];
  const score = Math.round(average(basket.map(signal => signal.confidence)));
  const strongest = basket.length ? [...basket].sort((a, b) => b.confidence - a.confidence)[0] : null;
  const weakest = basket.length ? [...basket].sort((a, b) => a.confidence - b.confidence)[0] : null;
  const spread = strongest && weakest ? strongest.confidence - weakest.confidence : 0;
  const posture = score >= 72 ? 'Strong' : score >= 62 ? 'Constructive' : score >= 50 ? 'Mixed' : 'Defensive';
  const topContributor = strongest ? `${strongest.symbol} is leading the basket as the ${midnightAssetRole(strongest.symbol)?.shortRole || 'strongest asset'}.` : 'No Midnight Network contributor available yet.';
  const drag = weakest ? `${weakest.symbol} is the current drag with ${weakest.confidence}% confidence.` : 'No drag detected yet.';
  const divergence = spread >= 18
    ? `${spread} point divergence: one network leg is moving far ahead of another.`
    : spread >= 10
      ? `${spread} point spread: watch for rotation inside the Midnight basket.`
      : 'Network legs are relatively aligned today.';
  const summary = posture === 'Strong'
    ? 'BTC, ADA, and NIGHT are broadly confirming the Midnight Network basket.'
    : posture === 'Constructive'
      ? 'The Midnight Network basket is constructive, but one leg still needs confirmation.'
      : posture === 'Mixed'
        ? 'The Midnight Network basket is mixed, so confirmation matters more than chasing.'
        : 'The Midnight Network basket is defensive; preserve attention for cleaner confirmation.';

  return { score, posture, strongest, weakest, topContributor, drag, divergence, summary, basket };
}
