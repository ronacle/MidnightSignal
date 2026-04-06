'use client';

export default function SettingsPanel({ state, setState }) {
  function update(key, value) {
    setState((previous) => ({ ...previous, [key]: value }));
  }

  return (
    <div className="panel stack">
      <div className="row space-between">
        <h2 className="section-title">Session Settings</h2>
        <span className="badge">Synced preferences</span>
      </div>

      <div className="controls">
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
      </div>

      <div className="trust-list compact">
        <div className="trust-row"><span>Mode memory</span><strong>{state.mode} persists</strong></div>
        <div className="trust-row"><span>Trade posture</span><strong>{state.strategy} / {state.timeframe}</strong></div>
      </div>
    </div>
  );
}
