'use client';

import React from 'react';
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


function BillingPanel({ state }) {
  const planTier = state?.planTier === 'pro' ? 'pro' : 'basic';

  return (
    <div className="panel stack compact-panel billing-panel">
      <div className="row space-between">
        <h3 className="section-title">Membership</h3>
        <span className={`badge ${planTier === 'pro' ? 'plan-nav-badge tier-pro' : 'plan-nav-badge tier-basic'}`}>{planTier === 'pro' ? 'Pro Active' : 'Free Plan'}</span>
      </div>

      <div className="muted small">
        {planTier === 'pro'
          ? 'Your Pro access is active on this browser. Deeper signal breakdowns and advanced context are unlocked.'
          : 'You are on the free plan. Upgrade from the Top Signal panel to unlock deeper validation, forward tracking, expanded signal context, and synced Pro access across devices.'}
      </div>

      <div className="billing-note">Secure checkout via Stripe · Cancel anytime · Educational tool, not financial advice.</div>
    </div>
  );
}

function LiveUpdateControls({ state, setState }) {
  function update(key, value) {
    setState((previous) => ({ ...previous, [key]: value }));
  }

  return (
    <div className="panel stack compact-panel">
      <div className="row space-between">
        <h3 className="section-title">Live Update Controls</h3>
        <span className="badge">Live</span>
      </div>

      <div className="controls">
        <label className="field">
          <span>Update mode</span>
          <select
            className="select"
            value={state.liveUpdatesEnabled ? 'live' : 'manual'}
            onChange={(e) => update('liveUpdatesEnabled', e.target.value === 'live')}
          >
            <option value="live">Live updates</option>
            <option value="manual">Manual refresh only</option>
          </select>
        </label>

        <label className="field">
          <span>Refresh interval</span>
          <select
            className="select"
            value={state.liveRefreshInterval || '60'}
            onChange={(e) => update('liveRefreshInterval', e.target.value)}
            disabled={!state.liveUpdatesEnabled}
          >
            <option value="15">15 seconds</option>
            <option value="30">30 seconds</option>
            <option value="60">1 minute</option>
            <option value="300">5 minutes</option>
          </select>
        </label>
      </div>

      <div className="controls">
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={Boolean(state.livePulseEnabled)}
            onChange={(e) => update('livePulseEnabled', e.target.checked)}
          />
          <div>
            <div className="toggle-title">Pulse motion</div>
            <div className="muted small">Keep subtle motion and signal liveliness turned on.</div>
          </div>
        </label>

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={Boolean(state.signalSoundsEnabled)}
            onChange={(e) => update('signalSoundsEnabled', e.target.checked)}
          />
          <div>
            <div className="toggle-title">Signal sounds</div>
            <div className="muted small">Enable alert sounds when you later turn on signal events.</div>
          </div>
        </label>
      </div>
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
            planTier={state?.planTier || 'basic'}
            profileCount={(state?.savedProfiles || []).filter(Boolean).length}
          />
          <SettingsPanel state={state} setState={setState} />
          <BillingPanel state={state} />
          <AlertManagerPanel state={state} setState={setState} alertAsset={alertAsset} onConsumeAlertAsset={onConsumeAlertAsset} />
          <LiveUpdateControls state={state} setState={setState} />
          <DisclaimerCard state={state} setState={setState} />
        </div>
      </aside>
    </div>
  );
}
