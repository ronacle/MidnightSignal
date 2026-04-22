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


function BillingPanel({ state, setState, user, onRefresh }) {
  const [busy, setBusy] = React.useState('');
  const [feedback, setFeedback] = React.useState('');
  const planTier = state?.planTier === 'pro' ? 'pro' : 'basic';
  const entitlement = state?.entitlement || {};
  const verified = Boolean(entitlement?.verified);
  const statusLabel = entitlement?.status ? String(entitlement.status).replace(/_/g, ' ') : 'inactive';
  const customerId = entitlement?.customerId || null;
  const subscriptionId = entitlement?.subscriptionId || null;
  const periodEndLabel = entitlement?.currentPeriodEnd ? new Date(entitlement.currentPeriodEnd).toLocaleString() : '—';
  const checkedAtLabel = entitlement?.checkedAt ? new Date(entitlement.checkedAt).toLocaleString() : 'Not checked yet';

  async function handleManageSubscription() {
    if (!customerId) {
      setFeedback('No Stripe customer is linked yet on this account.');
      return;
    }
    setBusy('portal');
    setFeedback('');
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, returnPath: '/?billing_return=portal' }),
      });
      const data = await res.json();
      if (data?.ok && data?.url) {
        window.location.href = data.url;
        return;
      }
      setFeedback(data?.error || 'Unable to open Stripe billing portal.');
    } catch {
      setFeedback('Unable to open Stripe billing portal.');
    } finally {
      setBusy('');
    }
  }

  async function handleRefreshEntitlement() {
    if (!entitlement?.subscriptionId && !entitlement?.checkoutSessionId && !entitlement?.customerId) {
      setFeedback('There is no Stripe entitlement on this account to refresh yet.');
      return;
    }
    setBusy('refresh');
    setFeedback('');
    try {
      const res = await fetch('/api/stripe/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entitlement }),
      });
      const data = await res.json();
      if (data?.ok && data?.entitlement) {
        setState((previous) => ({ ...previous, entitlement: data.entitlement, planTier: data.entitlement?.verified ? 'pro' : 'basic' }));
        setFeedback('Billing status refreshed from Stripe.');
        onRefresh?.();
        return;
      }
      setFeedback(data?.error || 'Unable to refresh billing status.');
    } catch {
      setFeedback('Unable to refresh billing status.');
    } finally {
      setBusy('');
    }
  }

  async function handleCancelAtPeriodEnd() {
    if (!subscriptionId) {
      setFeedback('No active Stripe subscription is linked yet on this account.');
      return;
    }
    const confirmed = window.confirm('Cancel Midnight Signal Pro at the end of the current billing period?');
    if (!confirmed) return;
    setBusy('cancel');
    setFeedback('');
    try {
      const res = await fetch('/api/stripe/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId,
          customerId: entitlement?.customerId || null,
          checkoutSessionId: entitlement?.checkoutSessionId || null,
          priceId: entitlement?.priceId || null,
        }),
      });
      const data = await res.json();
      if (data?.ok && data?.entitlement) {
        setState((previous) => ({
          ...previous,
          entitlement: {
            ...data.entitlement,
            status: data.cancelAtPeriodEnd ? 'canceled' : data.entitlement?.status || 'inactive',
            verified: data.cancelAtPeriodEnd ? true : Boolean(data.entitlement?.verified),
          },
          stripeWebhookStatus: data.cancelAtPeriodEnd ? 'Cancel scheduled at period end' : 'Subscription updated',
          stripeWebhookUpdatedAt: new Date().toISOString(),
        }));
        setFeedback(data.cancelAtPeriodEnd ? 'Cancellation scheduled. Pro stays active until the current period ends.' : 'Subscription updated.');
        onRefresh?.();
        return;
      }
      setFeedback(data?.error || 'Unable to change subscription status.');
    } catch {
      setFeedback('Unable to change subscription status.');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="panel stack compact-panel billing-panel">
      <div className="row space-between">
        <h3 className="section-title">Billing & plan center</h3>
        <span className={`badge ${planTier === 'pro' ? 'plan-nav-badge tier-pro' : 'plan-nav-badge tier-basic'}`}>{planTier === 'pro' ? 'Pro Active' : 'Free Plan'}</span>
      </div>

      <div className="muted small">
        {planTier === 'pro'
          ? 'Your Pro access is verified from Stripe on this account. Use the billing center below to refresh Stripe truth, manage payment details, or schedule cancellation.'
          : 'You are on the free plan. Free keeps the board scan, watchlist, learning flow, and alerts available. Upgrade from Top Signal only if you want deeper validation, forward tracking, and synced Pro access after Stripe verification.'}
      </div>

      <div className="list-item stack">
        <div><strong>Billing status:</strong> {verified ? 'Verified' : 'Not verified'} · {statusLabel}</div>
        <div className="muted small"><strong>Signed-in account:</strong> {user?.email || 'Not signed in'}</div>
        <div className="muted small"><strong>Current period end:</strong> {periodEndLabel}</div>
        <div className="muted small"><strong>Last Stripe check:</strong> {checkedAtLabel}</div>
        <div className="muted small"><strong>Stripe customer:</strong> {customerId || 'Not linked yet'}</div>
        <div className="muted small"><strong>Subscription:</strong> {subscriptionId || 'Not linked yet'}</div>
      </div>

      <div className="billing-next-step">
        <strong>{planTier === 'pro' ? 'Next best action:' : 'Pro adds:'}</strong>{' '}
        {planTier === 'pro'
          ? 'Refresh billing if anything changed in Stripe, then use Manage subscription for payment methods, invoices, or plan updates.'
          : 'Open the Pro paywall from the Top Signal panel when you want the deeper signal breakdown and advanced tracking tools.'}
      </div>

      <div className="row wrap-gap">
        <button className="button" type="button" onClick={handleRefreshEntitlement} disabled={busy === 'refresh'}>
          {busy === 'refresh' ? 'Refreshing…' : 'Refresh billing status'}
        </button>
        <button className="ghost-button" type="button" onClick={handleManageSubscription} disabled={!customerId || busy === 'portal'}>
          {busy === 'portal' ? 'Opening…' : 'Manage subscription'}
        </button>
        <button className="ghost-button" type="button" onClick={handleCancelAtPeriodEnd} disabled={!subscriptionId || busy === 'cancel'}>
          {busy === 'cancel' ? 'Scheduling…' : 'Cancel at period end'}
        </button>
      </div>

      {feedback ? <div className="muted small">{feedback}</div> : null}

      <div className="billing-note">Secure checkout via Stripe · verified entitlement controls Pro access · canceling at period end keeps Pro active until the paid window expires · educational tool, not financial advice.</div>
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
            <div className="eyebrow">Session controls</div>
            <h2 className="section-title">Control Center</h2>
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
            entitlement={state?.entitlement || {}}
            acceptedDisclaimer={Boolean(state?.acceptedDisclaimer)}
          />
          <SettingsPanel state={state} setState={setState} />
          <BillingPanel state={state} setState={setState} user={user} onRefresh={onRefresh} />
          <AlertManagerPanel state={state} setState={setState} alertAsset={alertAsset} onConsumeAlertAsset={onConsumeAlertAsset} />
          <LiveUpdateControls state={state} setState={setState} />
          <DisclaimerCard state={state} setState={setState} />
        </div>
      </aside>
    </div>
  );
}
