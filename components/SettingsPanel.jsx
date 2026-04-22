'use client';

import { applyProfileSnapshot, buildProfileSnapshot } from '@/lib/profiles';
import { applyModePreset, deriveExperienceProfile } from '@/lib/mode-engine';

const USER_TYPES = ['Beginner', 'Active trader', 'Long-term'];
const GOALS = [
  { value: 'learn', label: 'Learn' },
  { value: 'track', label: 'Track signals' },
  { value: 'alerts', label: 'Get alerts' },
];

function ControlGroup({ eyebrow, title, hint, children, wide = false }) {
  return (
    <section className={`control-group-card ${wide ? 'is-wide' : ''}`}>
      <div className="control-group-head stack-tight">
        <div className="eyebrow">{eyebrow}</div>
        <h3 className="control-group-title">{title}</h3>
        {hint ? <div className="muted small">{hint}</div> : null}
      </div>
      <div className={`control-group-grid ${wide ? 'is-wide' : ''}`}>{children}</div>
    </section>
  );
}

function ProfileSlot({ index, profile, onSave, onLoad, onClear }) {
  return (
    <div className="list-item stack profile-slot-card">
      <div className="row space-between wrap">
        <div>
          <div className="value profile-slot-title">Slot {index + 1}: {profile?.name || 'Empty profile'}</div>
          <div className="muted small">
            {profile
              ? `${profile.userType || profile.mode} · ${profile.intent || 'learn'} · ${profile.strategy} · ${profile.timeframe} · ${profile.watchlist?.length || 0} watch assets`
              : 'Save your current setup here.'}
          </div>
        </div>
        <span className="badge">{profile ? 'Saved' : 'Empty'}</span>
      </div>
      <div className="row wrap control-action-row">
        <button className="button" type="button" onClick={onSave}>Save current</button>
        <button className="ghost-button" type="button" disabled={!profile} onClick={onLoad}>Load</button>
        <button className="ghost-button" type="button" disabled={!profile} onClick={onClear}>Clear</button>
      </div>
    </div>
  );
}

export default function SettingsPanel({ state, setState }) {
  const experience = deriveExperienceProfile(state);

  function update(key, value) {
    setState((previous) => ({ ...previous, [key]: value }));
  }

  function applyModeChanges(overrides) {
    setState((previous) => applyModePreset({ ...previous, ...overrides }));
  }

  function saveProfile(index) {
    setState((previous) => {
      const savedProfiles = Array.isArray(previous.savedProfiles) ? [...previous.savedProfiles] : [null, null, null];
      const profile = {
        ...buildProfileSnapshot(previous),
        id: `slot-${index + 1}`,
        name: previous.profileName || `Profile ${index + 1}`,
      };
      savedProfiles[index] = profile;
      return { ...previous, profileId: profile.id, savedProfiles };
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
    <div className="panel stack control-layer-panel">
      <div className="row space-between wrap control-layer-top">
        <div>
          <div className="eyebrow">Control layer</div>
          <h2 className="section-title">Session Settings</h2>
          <div className="muted small">Primary controls stay visible, secondary preferences get cleaner grouping, and profile tools stay one layer below.</div>
        </div>
        <span className="badge">v11.97 alert quality</span>
      </div>

      <div className="control-layer-shell stack">
        <ControlGroup
          eyebrow="Primary controls"
          title="View"
          hint="How Midnight Signal reads the market for this session."
        >
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
            <label>User type</label>
            <select className="select" value={state.userType || experience.userType} onChange={(e) => applyModeChanges({ userType: e.target.value })}>
              {USER_TYPES.map((option) => <option key={option}>{option}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Primary goal</label>
            <select className="select" value={state.intent || experience.intent} onChange={(e) => applyModeChanges({ intent: e.target.value })}>
              {GOALS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </ControlGroup>

        <ControlGroup
          eyebrow="Secondary controls"
          title="Preferences"
          hint="How the session behaves and how much explanation you want on screen."
        >
          <div className="field">
            <label>Learning density</label>
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

          <div className="field control-group-span-2">
            <label>Profile name</label>
            <input className="input" value={state.profileName || ''} onChange={(e) => update('profileName', e.target.value)} placeholder="My setup" />
          </div>
        </ControlGroup>

        <div className="list-item stack control-summary-card">
          <div className="row space-between wrap control-summary-row">
            <div>
              <div className="eyebrow">Current experience profile</div>
              <div className="value control-summary-value">{experience.userType} · {GOALS.find((item) => item.value === experience.intent)?.label || 'Learn'}</div>
            </div>
            <button className="button" type="button" onClick={() => applyModeChanges({})}>Apply recommended defaults</button>
          </div>
          <div className="muted small">Recommended focus: {experience.boardTitle} · {experience.boardAssetCount} assets visible · {experience.showContextPanel ? 'context panel on' : 'context panel reduced'}.</div>
        </div>

        <details className="advanced-settings-shell" open>
          <summary className="advanced-settings-toggle">
            <div>
              <div className="eyebrow">Saved setups</div>
              <div className="advanced-settings-title">Profiles</div>
            </div>
            <span className="badge">Cloud profiles</span>
          </summary>

          <div className="stack advanced-settings-content">
            <div className="muted small">Store up to 3 real setups and carry them with your account.</div>
            {[0, 1, 2].map((index) => {
              const profile = state.savedProfiles?.[index];
              return (
                <ProfileSlot
                  key={`profile-slot-${index + 1}`}
                  index={index}
                  profile={profile}
                  onSave={() => saveProfile(index)}
                  onLoad={() => loadProfile(index)}
                  onClear={() => clearProfile(index)}
                />
              );
            })}
          </div>
        </details>
      </div>
    </div>
  );
}
