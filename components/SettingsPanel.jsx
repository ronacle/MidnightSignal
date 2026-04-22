'use client';

import { applyProfileSnapshot, buildProfileSnapshot } from '@/lib/profiles';
import { applyModePreset, deriveExperienceProfile } from '@/lib/mode-engine';

const USER_TYPES = ['Beginner', 'Active trader', 'Long-term'];
const GOALS = [
  { value: 'learn', label: 'Learn' },
  { value: 'track', label: 'Track signals' },
  { value: 'alerts', label: 'Get alerts' },
];

export default function SettingsPanel({ state, setState }) {
  const experience = deriveExperienceProfile(state);
  function update(key, value) { setState((previous) => ({ ...previous, [key]: value })); }
  function applyModeChanges(overrides) { setState((previous) => applyModePreset({ ...previous, ...overrides })); }
  function saveProfile(index) {
    setState((previous) => {
      const savedProfiles = Array.isArray(previous.savedProfiles) ? [...previous.savedProfiles] : [null, null, null];
      const profile = { ...buildProfileSnapshot(previous), id: `slot-${index + 1}`, name: previous.profileName || `Profile ${index + 1}` };
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
    <div className="panel stack">
      <div className="row space-between"><h2 className="section-title">Session Settings</h2><span className="badge">Mode engine differentiated</span></div>
      <div className="controls">
        <div className="field"><label>Profile name</label><input className="input" value={state.profileName || ''} onChange={(e) => update('profileName', e.target.value)} placeholder="My setup" /></div>
        <div className="field"><label>User type</label><select className="select" value={state.userType || experience.userType} onChange={(e) => applyModeChanges({ userType: e.target.value })}>{USER_TYPES.map((option) => <option key={option}>{option}</option>)}</select></div>
        <div className="field"><label>Primary goal</label><select className="select" value={state.intent || experience.intent} onChange={(e) => applyModeChanges({ intent: e.target.value })}>{GOALS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
        <div className="field"><label>Learning density</label><select className="select" value={state.mode} onChange={(e) => update('mode', e.target.value)}><option>Beginner</option><option>Pro</option></select></div>
        <div className="field"><label>Currency</label><select className="select" value={state.currency} onChange={(e) => update('currency', e.target.value)}><option>USD</option><option>CAD</option><option>EUR</option></select></div>
        <div className="field"><label>Strategy</label><select className="select" value={state.strategy} onChange={(e) => update('strategy', e.target.value)}><option>Scalp</option><option>Swing</option><option>Position</option></select></div>
        <div className="field"><label>Timeframe</label><select className="select" value={state.timeframe} onChange={(e) => update('timeframe', e.target.value)}><option>5M</option><option>15M</option><option>1H</option><option>4H</option></select></div>
      </div>
      <div className="list-item stack"><div className="row space-between wrap"><div><div className="eyebrow">Current experience profile</div><div className="value">{experience.userType} · {GOALS.find((item) => item.value === experience.intent)?.label || 'Learn'}</div></div><button className="button" type="button" onClick={() => applyModeChanges({})}>Apply recommended defaults</button></div><div className="muted small">Recommended focus: {experience.boardTitle} · {experience.boardAssetCount} assets visible · {experience.showContextPanel ? 'context panel on' : 'context panel reduced'}.</div></div>
      <div className="stack"><div className="row space-between"><div><div className="eyebrow">Saved profiles</div><div className="muted small">Store up to 3 real setups and carry them with your account.</div></div><span className="badge">Cloud profiles</span></div><div className="stack">{[0, 1, 2].map((index) => { const profile = state.savedProfiles?.[index]; return (<div className="list-item stack" key={`profile-slot-${index + 1}`}><div className="row space-between wrap"><div><div className="value">Slot {index + 1}: {profile?.name || 'Empty profile'}</div><div className="muted small">{profile ? `${profile.userType || profile.mode} · ${profile.intent || 'learn'} · ${profile.strategy} · ${profile.timeframe} · ${profile.watchlist?.length || 0} watch assets` : 'Save your current setup here.'}</div></div><span className="badge">{profile ? 'Saved' : 'Empty'}</span></div><div className="row wrap"><button className="button" type="button" onClick={() => saveProfile(index)}>Save current</button><button className="ghost-button" type="button" disabled={!profile} onClick={() => loadProfile(index)}>Load</button><button className="ghost-button" type="button" disabled={!profile} onClick={() => clearProfile(index)}>Clear</button></div></div>); })}</div></div>
    </div>
  );
}
