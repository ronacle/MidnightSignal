export const DEFAULT_STATE = {
  mode: 'Beginner',
  currency: 'USD',
  strategy: 'Swing',
  timeframe: '1H',
  selectedAsset: 'BTC',
  watchlist: ['BTC', 'ETH', 'ADA', 'SOL'],
  alerts: [],
  acceptedDisclaimer: false,
  lastViewedAt: null,
  updatedAt: null,
  deviceLabel: 'This device',
  liveUpdatesEnabled: true,
  liveRefreshInterval: '60',
  livePulseEnabled: true,
  signalSoundsEnabled: false
};

export const MARKET_FIXTURES = [
  { symbol: 'BTC', name: 'Bitcoin', conviction: 78, sentiment: 'bullish', story: 'Holding trend structure while momentum remains constructive.' },
  { symbol: 'ETH', name: 'Ethereum', conviction: 63, sentiment: 'neutral', story: 'Strength improving, but still waiting on cleaner follow-through.' },
  { symbol: 'ADA', name: 'Cardano', conviction: 74, sentiment: 'bullish', story: 'Leadership tone improving with a stronger recovery posture.' },
  { symbol: 'SOL', name: 'Solana', conviction: 46, sentiment: 'neutral', story: 'Momentum is mixed after a quick stretch higher.' },
  { symbol: 'XRP', name: 'XRP', conviction: 39, sentiment: 'bearish', story: 'Still lagging relative strength leaders.' }
];
