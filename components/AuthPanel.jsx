'use client';

import { useEffect, useMemo, useState } from 'react';

function Step({ done, title, text }) {
  return (
    <div className={`setup-step ${done ? 'done' : ''}`}>
      <div className="setup-step-dot">{done ? '✓' : '•'}</div>
      <div>
        <div className="setup-step-title">{title}</div>
        <div className="muted small">{text}</div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, detail }) {
  return (
    <div className="account-mini-stat">
      <div className="eyebrow">{label}</div>
      <div className="value">{value}</div>
      <div className="muted small">{detail}</div>
    </div>
  );
}

export default function AuthPanel({ user, status, syncing, lastSyncedAt, onSignIn, onSignOut, onRefresh, supabaseReady, planTier = 'basic', profileCount = 0, entitlement = {}, acceptedDisclaimer = false, state }) {
  const [email, setEmail] = useState(state?.alertDeliveryEmail || '');
  const [feedback, setFeedback] = useState('');

  const setupCount = useMemo(() => [Boolean(user), Boolean(acceptedDisclaimer), planTier === 'pro'].filter(Boolean).length, [user, acceptedDisclaimer, planTier]);
  const watchlistCount = Array.isArray(state?.watchlist) ? state.watchlist.length : 0;
  const selectedAsset = state?.selectedAsset || 'BTC';
  const restoreSummary = [state?.restoreLastSelectedAsset ? 'asset memory on' : 'asset memory off', state?.restorePanelState ? 'panel restore on' : 'panel restore off'].join(' · ');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      const authStatus = url.searchParams.get('auth');
      const authError = url.searchParams.get('error_description') || url.searchParams.get('error');
      if (authStatus === 'signed-in') {
        setFeedback('Magic link accepted. Your account session is live and your settings can sync across devices.');
      } else if (authError) {
        setFeedback(`Sign-in issue: ${String(authError).replace(/\+/g, ' ')}`);
      }
    } catch {
      // no-op
    }
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email) return;
    const result = await onSignIn(email);
    setFeedback(result?.error ? result.error.message : 'Check your email for the magic link. Use the same email everywhere to keep your setup in sync.');
  }

  return (
    <div className="panel stack account-panel">
      <div className="row space-between wrap">
        <h2 className="section-title">Account & onboarding</h2>
        <span className="badge">{syncing ? 'Syncing…' : status}</span>
      </div>

      <div className="onboarding-summary">
        <div>
          <div className="eyebrow">Account readiness</div>
          <div className="value onboarding-progress">{setupCount}/3 complete</div>
        </div>
        <div className="muted small">Sign in once, save your preferences, and keep your Midnight setup consistent across devices.</div>
      </div>

      <div className="account-mini-grid">
        <MiniStat label="Session" value={user ? 'Signed in' : 'Local only'} detail={user ? user.email : 'This device only'} />
        <MiniStat label="Watchlist" value={watchlistCount} detail={`Primary asset ${selectedAsset}`} />
        <MiniStat label="Restore" value={state?.restoreLastSelectedAsset ? 'On' : 'Off'} detail={restoreSummary} />
      </div>

      <div className="setup-steps">
        <Step done={Boolean(user)} title="Connect your account" text={user ? `Signed in as ${user.email}` : 'Use a magic link so your setup follows you across devices.'} />
        <Step done={Boolean(acceptedDisclaimer)} title="Accept the Agreement of Understanding" text={acceptedDisclaimer ? 'Accepted on this account.' : 'Required before treating Midnight Signal like a working dashboard.'} />
        <Step done={planTier === 'pro'} title="Optional: unlock Pro" text={planTier === 'pro' ? 'Stripe-verified Pro is active.' : 'Upgrade later for deeper validation, forward tracking, and advanced alert tools.'} />
      </div>

      {!supabaseReady && (
        <div className="notice small">
          Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable cloud sync.
        </div>
      )}

      {user ? (
        <div className="list-item stack account-card">
          <div><strong>Signed in as:</strong> {user.email}</div>
          <div className="muted small">Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Not yet synced'}</div>
          <div className="muted small">Saved profiles in cloud: {profileCount}</div>
          <div className="muted small">Billing truth: {entitlement?.verified ? 'Verified Pro' : 'Free / unverified'}{entitlement?.status ? ` · ${String(entitlement.status).replace(/_/g, ' ')}` : ''}</div>
          <div className="muted small">Preferences saved to account: mode, strategy, timeframe, watchlist, selected asset, alert rules, delivery memory, panel restore choices, and onboarding state.</div>
          <div className="row wrap-gap">
            <button className="button" onClick={onRefresh} type="button">Pull latest cloud state</button>
            <button className="ghost-button" onClick={onSignOut} type="button">Sign out</button>
          </div>
        </div>
      ) : (
        <form className="stack" onSubmit={handleSubmit}>
          <div className="muted small">
            Sign in with the same email on multiple devices to sync settings, watchlist, selected asset, onboarding state, saved profiles, alert rules, trigger memory, digest queue, and verified entitlement state.
          </div>
          <input
            className="input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <div className="row wrap-gap">
            <button className="button" type="submit">Send magic link</button>
            <button className="ghost-button" type="button" onClick={() => setFeedback('You can keep using Midnight Signal locally. Sign in later when you want sync and saved cloud state.')}>Stay local for now</button>
          </div>
          {feedback ? <div className="muted small">{feedback}</div> : null}
        </form>
      )}
    </div>
  );
}
