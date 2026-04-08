'use client';

import { applyProfileSnapshot, buildProfileSnapshot } from '@/lib/profiles';

const FOCUS_OPTIONS = [
  { value: 'top-signal', label: 'Top Signal first' },
  { value: 'watchlist', label: 'Watchlist first' },
  { value: 'board-scan', label: 'Top 20 board first' },
];

export default function SettingsPanel({ state, setState }) {
  function update(key, value) {
    setState((previous) => ({ ...previous, [key]: value }));
  }

  function applyPreset(preset) {
    if (preset === 'beginner') {
      setState((previous) => ({
        ...previous,
        mode: 'Beginner',
        strategy: 'Swing',
        timeframe: '1H',
        livePulseEnabled: true,
        signalSoundsEnabled: false,
        preferredDashboardFocus: 'top-signal',
      }));
      return;
    }

    if (preset === 'pro') {
      setState((previous) => ({
        ...previous,
        mode: 'Pro',
        strategy: 'Scalp',
        timeframe: '15M',
        livePulseEnabled: true,
        signalSoundsEnabled: true,
        preferredDashboardFocus: 'board-scan',
      }));
    }
  }

  function saveProfile(index) {
    setState((previous) => {
      const savedProfiles = Array.isArray(previous.savedProfiles) ? [...previous.savedProfiles] : [null, null, null];
      const profile = {
        ...buildProfileSnapshot(previous),
        restoreLastSelectedAsset: Boolean(previous.restoreLastSelectedAsset),
        restorePanelState: Boolean(previous.restorePanelState),
        preferredDashboardFocus: previous.preferredDashboardFocus || 'top-signal',
        soundProfile: previous.soundProfile || 'beacon-soft',
        id: `slot-${index + 1}`,
        name: previous.profileName || `Profile ${index + 1}`,
      };
      savedProfiles[index] = profile;
      return {
        ...previous,
        profileId: profile.id,
        savedProfiles,
      };
    });
  }

  function loadProfile(index) {
    const profile = state.savedProfiles?.[index];
    if (!profile) return;
    setState((previous) => applyProfileSnapshot({ ...previous }, profile));
  }

  function clearProfile(index) {
    setState((previous) => {
      const savedProfiles = Array.isArray(previous.savedProfiles) ? [...previous.savedProfiles] : [null, null, null];
      savedProfiles[index] = null;
      return { ...previous, savedProfiles };
    });
  }

  return (
    <div className="panel stack">
      <div className="row space-between wrap">
        <h2 className="section-title">Settings center</h2>
        <span className="badge">Account-ready preferences</span>
      </div>

      <div className="settings-presets-row">
        <button className="ghost-button" type="button" onClick={() => applyPreset('beginner')}>Use beginner setup</button>
        <button className="ghost-button" type="button" onClick={() => applyPreset('pro')}>Use pro scan setup</button>
      </div>

      <div className="controls">
        <div className="field">
          <label>Profile name</label>
          <input
            className="input"
            value={state.profileName || ''}
            onChange={(e) => update('profileName', e.target.value)}
            placeholder="My setup"
          />
        </div>

        <div className="field">
          <label>Mode</label>
          <select className="select" value={state.mode} onChange={(e) => update('mode', e.target.value)}>
            <option>Beginner</option>
            <option>Pro</option>
          </select>
        </div>

        <div className="field">
          <label>Currency</label>
          <select className="select" value={state.currency} onChange={(e) => update('currency', e.target.value)}>
            <option>USD</option>
            <option>CAD</option>
            <option>EUR</option>
          </select>
        </div>

        <div className="field">
          <label>Strategy</label>
          <select className="select" value={state.strategy} onChange={(e) => update('strategy', e.target.value)}>
            <option>Scalp</option>
            <option>Swing</option>
            <option>Position</option>
          </select>
        </div>

        <div className="field">
          <label>Timeframe</label>
          <select className="select" value={state.timeframe} onChange={(e) => update('timeframe', e.target.value)}>
            <option>5M</option>
            <option>15M</option>
            <option>1H</option>
            <option>4H</option>
          </select>
        </div>

        <div className="field">
          <label>Dashboard focus</label>
          <select className="select" value={state.preferredDashboardFocus || 'top-signal'} onChange={(e) => update('preferredDashboardFocus', e.target.value)}>
            {FOCUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <label className="toggle-row settings-toggle-full">
          <input
            type="checkbox"
            checked={Boolean(state.restoreLastSelectedAsset)}
            onChange={(e) => update('restoreLastSelectedAsset', e.target.checked)}
          />
          <div>
            <div className="toggle-title">Restore last selected asset</div>
            <div className="muted small">Re-open the same asset next session so your workflow feels continuous.</div>
          </div>
        </label>

        <label className="toggle-row settings-toggle-full">
          <input
            type="checkbox"
            checked={Boolean(state.restorePanelState)}
            onChange={(e) => update('restorePanelState', e.target.checked)}
          />
          <div>
            <div className="toggle-title">Restore panel state</div>
            <div className="muted small">Keep drawer preferences and view posture consistent between visits.</div>
          </div>
        </label>

        <div className="field">
          <label>Sound profile</label>
          <select className="select" value={state.soundProfile || 'beacon-soft'} onChange={(e) => update('soundProfile', e.target.value)}>
            <option value="beacon-soft">Beacon soft</option>
            <option value="beacon-clear">Beacon clear</option>
            <option value="silent-focus">Silent focus</option>
          </select>
        </div>
      </div>

      <div className="settings-memory-note muted small">
        Saved to account when signed in: mode, strategy, timeframe, focus preference, watchlist, selected asset, alert settings, and restore behavior.
      </div>

      <div className="stack">
        <div className="row space-between">
          <div>
            <div className="eyebrow">Saved profiles</div>
            <div className="muted small">Store up to 3 real setups and carry them with your account.</div>
          </div>
          <span className="badge">Cloud profiles</span>
        </div>

        <div className="stack">
          {[0, 1, 2].map((index) => {
            const profile = state.savedProfiles?.[index];
            return (
              <div className="list-item stack" key={`profile-slot-${index + 1}`}>
                <div className="row space-between wrap">
                  <div>
                    <div className="value">Slot {index + 1}: {profile?.name || 'Empty profile'}</div>
                    <div className="muted small">
                      {profile
                        ? `${profile.mode} · ${profile.strategy} · ${profile.timeframe} · ${profile.watchlist?.length || 0} watch assets`
                        : 'Save your current setup here.'}
                    </div>
                  </div>
                  <span className="badge">{profile ? 'Saved' : 'Empty'}</span>
                </div>
                <div className="row wrap">
                  <button className="button" type="button" onClick={() => saveProfile(index)}>Save current</button>
                  <button className="ghost-button" type="button" disabled={!profile} onClick={() => loadProfile(index)}>Load</button>
                  <button className="ghost-button" type="button" disabled={!profile} onClick={() => clearProfile(index)}>Clear</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
