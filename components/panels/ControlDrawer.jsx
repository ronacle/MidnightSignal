'use client';

import AuthPanel from '@/components/AuthPanel';
import DisclaimerCard from '@/components/DisclaimerCard';
import SettingsPanel from '@/components/SettingsPanel';
import AlertManagerPanel from '@/components/panels/AlertManagerPanel';

function PlaceholderPanel({ title, text }) {
  return (
    <div className="panel stack compact-panel">
      <div className="row space-between">
        <h3 className="section-title">{title}</h3>
        <span className="badge">Panel</span>
      </div>
      <div className="muted small">{text}</div>
    </div>
  );
}

export default function ControlDrawer({ open, onClose, state, setState, user, status, syncing, lastSyncedAt, onSignIn, onSignOut, onRefresh, supabaseReady, alertAsset, onConsumeAlertAsset }) {
  return (
    <div className={`drawer-root ${open ? 'open' : ''}`}>
      <button type="button" className="drawer-backdrop" onClick={onClose} aria-label="Close control panel" />
      <aside className="drawer drawer-right">
        <div className="drawer-header">
          <div>
            <div className="eyebrow">Slide-out controls</div>
            <h2 className="section-title">Control Panel</h2>
          </div>
          <button className="ghost-button" type="button" onClick={onClose}>Close</button>
        </div>

        <div className="drawer-content stack">
          <AuthPanel
            user={user}
            status={status}
            syncing={syncing}
            lastSyncedAt={lastSyncedAt}
            onSignIn={onSignIn}
            onSignOut={onSignOut}
            onRefresh={onRefresh}
            supabaseReady={supabaseReady}
          />
          <SettingsPanel state={state} setState={setState} />
          <AlertManagerPanel state={state} setState={setState} alertAsset={alertAsset} onConsumeAlertAsset={onConsumeAlertAsset} />
          <PlaceholderPanel title="Live Update Controls" text="Live-refresh and motion controls belong in the control drawer, not on the main page." />
          <DisclaimerCard state={state} setState={setState} />
        </div>
      </aside>
    </div>
  );
}
