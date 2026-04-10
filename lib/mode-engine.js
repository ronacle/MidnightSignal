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
    modeClass: userType === 'Beginner' ? 'experience-beginner' : userType === 'Active trader' ? 'experience-active' : 'experience-longterm',
    intentClass: intent === 'learn' ? 'intent-learn' : intent === 'track' ? 'intent-track' : 'intent-alerts',
    learningTone: userType === 'Beginner',
    boardAssetCount: 10,
    boardTitle: "Tonight's Board",
    boardSubtitle: 'Scan the live field, open a name, and save favorites from the board.',
    boardBadge: 'Ranked signal scan',
    boardHint: 'Open any card to drill into the signal story.',
    boardCardStyle: 'balanced',
    boardColumnsClass: 'board-columns-balanced',
    contextTitle: 'Signal context',
    contextFirst: false,
    showContextPanel: true,
    showSinceLastVisit: true,
    highlightAlerts: false,
    heroTitle: "What's the signal tonight?",
    heroSubtitle: 'Learn the setup, understand the why, and move with calmer market awareness.',
    heroSupport: 'Start with Tonight’s Top Signal, open the why, then scan the board for broader posture.',
    heroCtaTitle: 'Read tonight’s signal in under a minute',
    heroCtaBody: 'Use the free flow first: Top Signal → Why it appears → Board scan → Watchlist.',
    heroChecklist: ['Built to explain the signal, not just flash it.','Free mode stays useful before any upgrade pressure.','The beacon visual language now carries from hero to board to breakdown.'],
    onboardingPreviewTitle: 'Guided night scan',
    onboardingPreviewBullets: ['Smaller board with less noise','Plain-English explanations stay visible','Defaults favor patience over speed'],
    conversionTitle: 'A clearer path from market noise to market wisdom',
    conversionCards: [
      { title: 'Learn first', body: 'Tonight’s Top Signal and the board are built to explain posture in plain language, not just throw numbers around.' },
      { title: 'Trust the setup', body: 'Disclaimer-first onboarding, optional cloud sync, and verified billing flow keep the experience more trustworthy.' },
      { title: 'Upgrade only if it fits', body: 'Free covers the read, scan, and watchlist flow. Pro adds validation, forward tracking, and deeper breakdowns.' },
    ],
    sinceTitle: 'Since your last visit',
    sinceEyebrow: 'Return signal',
    marketEyebrow: 'Next up',
    learningTitle: 'Understand the signal system',
    learningIntro: 'Use the glossary to understand what the app is trying to tell you before you act on it.',
    recommended: { mode: userType === 'Beginner' ? 'Beginner' : 'Pro', strategy: 'Swing', timeframe: '1H', livePulseEnabled: userType !== 'Long-term', signalSoundsEnabled: false, dashboardFocus: intent === 'track' ? 'board' : intent === 'alerts' ? 'watchlist' : 'signals' },
  };
  if (userType === 'Beginner') {
    Object.assign(profile, { boardAssetCount: intent === 'track' ? 8 : 6, contextFirst: true, boardCardStyle: 'gentle', boardColumnsClass: 'board-columns-calm', heroSubtitle: 'A guided read of the market with clearer explanations and less noise.', heroSupport: 'Midnight Signal explains the posture before asking you to scan a lot of assets.', heroCtaTitle: 'Start with the clearest signal first', heroCtaBody: 'We keep the board smaller, the language calmer, and the supporting context close by.', boardTitle: intent === 'track' ? 'Focused board' : 'Starter board', boardBadge: 'Guided scan', boardHint: 'Use these as the clearest names to learn from first.', onboardingPreviewTitle: 'Calm guided setup', onboardingPreviewBullets: ['Fewer names on the board','Context appears earlier in the flow','Pulse motion stays softer by default'], conversionTitle: 'A calmer way to learn the market without drowning in noise', conversionCards: [ { title: 'Explain the signal', body: 'The app favors plain-English phrasing, context-first reading, and a smaller board so a new user is not overwhelmed.' }, { title: 'Keep the pace calm', body: 'Defaults lean toward swing-style rhythm, steadier timeframes, and less visual urgency on first use.' }, { title: 'Build confidence', body: 'You can still track favorites and open details, but the experience nudges learning before speed.' } ], learningTitle: 'Learn the signal language', learningIntro: 'This mode keeps the glossary practical and plain-English so you can build confidence without feeling buried.' });
    profile.recommended.strategy = 'Swing'; profile.recommended.timeframe = '1H'; profile.recommended.livePulseEnabled = false;
  }
  if (userType === 'Active trader') {
    Object.assign(profile, { boardAssetCount: intent === 'learn' ? 12 : 20, contextFirst: false, boardCardStyle: 'dense', boardColumnsClass: 'board-columns-dense', heroSubtitle: 'A faster, tighter read built for quick posture checks and broad board scanning.', heroSupport: 'Keep the top signal in view, then move straight into the board and watchlist flow.', heroCtaTitle: 'Scan fast, open only what matters', heroCtaBody: 'This profile prioritizes board density, quicker signal checks, and stronger tactical language.', boardTitle: 'Tactical board', boardBadge: 'Fast tactical scan', boardHint: 'Keep moving. Open details only when a name earns more time.', onboardingPreviewTitle: 'Fast tactical setup', onboardingPreviewBullets: ['Denser board with more names visible','Pulse and tactical wording stay active','The board is emphasized before deep context'], conversionTitle: 'A faster dashboard built to scan, compare, and react', conversionCards: [ { title: 'See more of the field', body: 'The board expands, the wording tightens up, and the app assumes you want quicker posture checks.' }, { title: 'Stay tactical', body: 'Recommended defaults lean toward shorter timeframes, scalp-style rhythm, and stronger board-first emphasis.' }, { title: 'Open depth on demand', body: 'The full signal story is still there, but it stays behind the cards until a setup earns more attention.' } ], learningTitle: 'Signal definitions for a faster read', learningIntro: 'This mode keeps explanations concise so you can stay tactical and only expand when you need a definition.' });
    profile.recommended.strategy = 'Scalp'; profile.recommended.timeframe = intent === 'alerts' ? '5M' : '15M'; profile.recommended.livePulseEnabled = true;
  }
  if (userType === 'Long-term') {
    Object.assign(profile, { boardAssetCount: intent === 'track' ? 10 : 8, contextFirst: true, boardCardStyle: 'calm', boardColumnsClass: 'board-columns-calm', heroSubtitle: 'A calmer, slower read designed to emphasize trend quality over short-term noise.', heroSupport: 'Use the brief and context first, then scan a smaller board for stronger longer-horizon posture.', heroCtaTitle: 'Read the posture before the noise', heroCtaBody: 'This profile de-emphasizes short-term urgency and makes the broader trend read feel more deliberate.', boardTitle: 'Trend board', boardBadge: 'Trend posture', boardHint: 'Use the board to compare structure, not chase every twitch.', onboardingPreviewTitle: 'Trend-focused setup', onboardingPreviewBullets: ['Smaller board with steadier pacing','Higher-timeframe defaults','Calmer language around posture and conviction'], conversionTitle: 'A steadier experience built around posture, patience, and trend quality', conversionCards: [ { title: 'Zoom out first', body: 'The app leans into context, trend posture, and steadier framing so the market does not feel as noisy.' }, { title: 'Favor structure', body: 'Recommended defaults shift toward position-style rhythm and slower timeframes where trend quality matters more.' }, { title: 'Use alerts selectively', body: 'The dashboard stays useful, but the experience is designed to help you avoid babysitting every short-term move.' } ], learningTitle: 'Trend language and regime context', learningIntro: 'This mode keeps the learning layer focused on trend quality, regime changes, and why patience matters.' });
    profile.recommended.strategy = 'Position'; profile.recommended.timeframe = '4H'; profile.recommended.livePulseEnabled = false;
  }
  if (intent === 'learn') { profile.showContextPanel = true; profile.showSinceLastVisit = true; profile.contextTitle = 'Why the signal looks this way'; profile.heroChecklist = ['Explanations stay closer to the core signal.','Context appears earlier in the reading flow.','The app nudges understanding before speed.']; }
  if (intent === 'track') { profile.showContextPanel = true; profile.showSinceLastVisit = true; profile.boardSubtitle = 'Keep the board dense, compare names quickly, and open details only when something deserves a closer look.'; profile.marketEyebrow = 'Board focus'; profile.heroChecklist = ['The board is the main workspace.','Since Last Visit stays visible for quick catch-up.','You can compare more names without changing screens.']; }
  if (intent === 'alerts') { Object.assign(profile, { highlightAlerts: true, showContextPanel: userType !== 'Active trader', showSinceLastVisit: true, boardSubtitle: 'Focus on the names you care about, then use alerts to stay informed without babysitting the dashboard.', contextTitle: 'Alert context', boardHint: 'This board supports alert setup more than constant monitoring.', marketEyebrow: 'Alert watch', sinceTitle: 'Latest alert-aware changes', sinceEyebrow: 'Stay informed', heroCtaTitle: 'Use the dashboard as alert intelligence', heroCtaBody: 'This profile emphasizes meaningful changes, watchlist awareness, and staying informed without constant screen time.', heroChecklist: ['The app highlights meaningful shifts instead of constant checking.','Watchlist and alert delivery matter more than full-board babysitting.','The dashboard stays useful as an alert intelligence layer.'], conversionTitle: 'A dashboard that helps you stay informed without hovering over it all night', conversionCards: [ { title: 'Watch what matters', body: 'The board supports watchlist awareness and alert setup instead of pushing you to stare at every asset.' }, { title: 'Reduce babysitting', body: 'The flow is tuned to surface meaningful changes, not reward constant refreshing or noise chasing.' }, { title: 'Prepare for alert delivery', body: 'This mode nudges the product toward email alerts, history, and threshold-based monitoring as the next layer.' } ], learningTitle: 'Understand what should trigger an alert', learningIntro: 'This mode keeps the learning layer focused on what changes matter and why a signal deserves attention.' }); profile.recommended.dashboardFocus = 'watchlist'; }
  return profile;
}

export function applyModePreset(state = {}, override = {}) {
  const base = deriveExperienceProfile({ ...state, ...override });
  return { ...state, userType: base.userType, intent: base.intent, mode: base.recommended.mode, strategy: base.recommended.strategy, timeframe: base.recommended.timeframe, livePulseEnabled: base.recommended.livePulseEnabled, signalSoundsEnabled: base.recommended.signalSoundsEnabled, dashboardFocus: base.recommended.dashboardFocus, onboardingGoal: base.intent, onboardingCompletedAt: state.onboardingCompletedAt || new Date().toISOString(), modeEngineVersion: '11.80' };
}
