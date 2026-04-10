const FALLBACK_USER_TYPE = 'Beginner';
const FALLBACK_INTENT = 'learn';

export const USER_TYPE_OPTIONS = ['Beginner', 'Active trader', 'Long-term'];
export const INTENT_OPTIONS = ['learn', 'track', 'alerts'];

export function normalizeUserType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'active' || normalized === 'active trader' || normalized === 'active-trader') return 'Active trader';
  if (normalized === 'long' || normalized === 'long-term' || normalized === 'long term') return 'Long-term';
  return 'Beginner';
}

export function normalizeIntent(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'track signals' || normalized === 'signals' || normalized === 'board') return 'track';
  if (normalized === 'get alerts' || normalized === 'alert') return 'alerts';
  return INTENT_OPTIONS.includes(normalized) ? normalized : FALLBACK_INTENT;
}

export function deriveExperienceProfile(state = {}) {
  const userType = normalizeUserType(state.userType || state.mode || FALLBACK_USER_TYPE);
  const intent = normalizeIntent(state.intent || state.onboardingGoal || FALLBACK_INTENT);

  const profile = {
    userType,
    intent,
    learningTone: userType === 'Beginner',
    boardAssetCount: 10,
    boardTitle: "Tonight's Board",
    boardSubtitle: 'Scan the live field, open a name, and save favorites from the board.',
    contextTitle: 'Signal context',
    contextFirst: false,
    showContextPanel: true,
    showSinceLastVisit: true,
    highlightAlerts: false,
    heroTitle: "What's the signal tonight?",
    heroSubtitle: 'Learn the setup, understand the why, and move with calmer market awareness.',
    heroSupport: 'Start with Tonight’s Top Signal, open the why, then scan the board for broader posture.',
    recommended: {
      mode: userType === 'Beginner' ? 'Beginner' : 'Pro',
      strategy: 'Swing',
      timeframe: '1H',
      livePulseEnabled: userType !== 'Long-term',
      signalSoundsEnabled: false,
      dashboardFocus: intent === 'track' ? 'board' : intent === 'alerts' ? 'watchlist' : 'signals',
    },
  };

  if (userType === 'Beginner') {
    profile.boardAssetCount = intent === 'track' ? 8 : 6;
    profile.contextFirst = true;
    profile.heroSubtitle = 'A guided read of the market with clearer explanations and less noise.';
    profile.heroSupport = 'Midnight Signal explains the posture before asking you to scan a lot of assets.';
    profile.boardTitle = intent === 'track' ? 'Focused board' : 'Starter board';
    profile.recommended.strategy = 'Swing';
    profile.recommended.timeframe = '1H';
    profile.recommended.livePulseEnabled = false;
  }

  if (userType === 'Active trader') {
    profile.boardAssetCount = intent === 'learn' ? 12 : 20;
    profile.contextFirst = false;
    profile.heroSubtitle = 'A faster, tighter read built for quick posture checks and broad board scanning.';
    profile.heroSupport = 'Keep the top signal in view, then move straight into the board and watchlist flow.';
    profile.boardTitle = 'Tactical board';
    profile.recommended.strategy = 'Scalp';
    profile.recommended.timeframe = intent === 'alerts' ? '5M' : '15M';
    profile.recommended.livePulseEnabled = true;
  }

  if (userType === 'Long-term') {
    profile.boardAssetCount = intent === 'track' ? 10 : 8;
    profile.contextFirst = true;
    profile.heroSubtitle = 'A calmer, slower read designed to emphasize trend quality over short-term noise.';
    profile.heroSupport = 'Use the brief and context first, then scan a smaller board for stronger longer-horizon posture.';
    profile.boardTitle = 'Trend board';
    profile.recommended.strategy = 'Position';
    profile.recommended.timeframe = '4H';
    profile.recommended.livePulseEnabled = false;
  }

  if (intent === 'learn') {
    profile.showContextPanel = true;
    profile.showSinceLastVisit = true;
    profile.contextTitle = 'Why the signal looks this way';
  }

  if (intent === 'track') {
    profile.showContextPanel = true;
    profile.showSinceLastVisit = true;
    profile.boardSubtitle = 'Keep the board dense, compare names quickly, and open details only when something deserves a closer look.';
  }

  if (intent === 'alerts') {
    profile.highlightAlerts = true;
    profile.showContextPanel = userType != 'Active trader';
    profile.showSinceLastVisit = true;
    profile.boardSubtitle = 'Focus on the names you care about, then use alerts to stay informed without babysitting the dashboard.';
    profile.contextTitle = 'Alert context';
    profile.recommended.dashboardFocus = 'watchlist';
  }

  return profile;
}

export function applyModePreset(state = {}, override = {}) {
  const base = deriveExperienceProfile({ ...state, ...override });
  return {
    ...state,
    userType: base.userType,
    intent: base.intent,
    mode: base.recommended.mode,
    strategy: base.recommended.strategy,
    timeframe: base.recommended.timeframe,
    livePulseEnabled: base.recommended.livePulseEnabled,
    signalSoundsEnabled: base.recommended.signalSoundsEnabled,
    dashboardFocus: base.recommended.dashboardFocus,
    onboardingGoal: base.intent,
    onboardingCompletedAt: state.onboardingCompletedAt || new Date().toISOString(),
    modeEngineVersion: '11.79',
  };
}
