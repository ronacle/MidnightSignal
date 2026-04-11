export function buildProfileSnapshot(state = {}) {
  return {
    id: state.profileId || null,
    name: state.profileName || 'My setup',
    mode: state.mode || 'Beginner',
    userType: state.userType || state.mode || 'Beginner',
    intent: state.intent || state.onboardingGoal || 'learn',
    currency: state.currency || 'USD',
    strategy: state.strategy || 'Swing',
    timeframe: state.timeframe || '1H',
    selectedAsset: state.selectedAsset || 'BTC',
    watchlist: Array.isArray(state.watchlist) ? state.watchlist.slice(0, 12) : ['BTC', 'ETH', 'ADA', 'SOL'],
    liveUpdatesEnabled: Boolean(state.liveUpdatesEnabled),
    liveRefreshInterval: state.liveRefreshInterval || '60',
    livePulseEnabled: state.livePulseEnabled !== false,
    signalSoundsEnabled: Boolean(state.signalSoundsEnabled),
    savedAt: new Date().toISOString(),
  };
}

export function applyProfileSnapshot(state = {}, profile = {}) {
  return {
    ...state,
    profileId: profile.id || state.profileId || null,
    profileName: profile.name || state.profileName || 'My setup',
    mode: profile.mode || state.mode || 'Beginner',
    userType: profile.userType || profile.mode || state.userType || state.mode || 'Beginner',
    intent: profile.intent || profile.onboardingGoal || state.intent || state.onboardingGoal || 'learn',
    currency: profile.currency || state.currency || 'USD',
    strategy: profile.strategy || state.strategy || 'Swing',
    timeframe: profile.timeframe || state.timeframe || '1H',
    selectedAsset: profile.selectedAsset || state.selectedAsset || 'BTC',
    watchlist: Array.isArray(profile.watchlist) && profile.watchlist.length
      ? profile.watchlist
      : state.watchlist || ['BTC', 'ETH', 'ADA', 'SOL'],
    liveUpdatesEnabled: typeof profile.liveUpdatesEnabled === 'boolean' ? profile.liveUpdatesEnabled : state.liveUpdatesEnabled,
    liveRefreshInterval: profile.liveRefreshInterval || state.liveRefreshInterval || '60',
    livePulseEnabled: typeof profile.livePulseEnabled === 'boolean' ? profile.livePulseEnabled : state.livePulseEnabled,
    signalSoundsEnabled: typeof profile.signalSoundsEnabled === 'boolean' ? profile.signalSoundsEnabled : state.signalSoundsEnabled,
  };
}

export function normalizeSavedProfiles(savedProfiles = []) {
  const next = Array.from({ length: 3 }, (_, index) => {
    const entry = savedProfiles[index];
    if (!entry) return null;
    return {
      ...entry,
      name: entry.name || `Profile ${index + 1}`,
      watchlist: Array.isArray(entry.watchlist) ? entry.watchlist.slice(0, 12) : ['BTC', 'ETH', 'ADA', 'SOL'],
    };
  });
  return next;
}
