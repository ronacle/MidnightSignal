'use client';

import { useMemo, useState } from 'react';

function PersistItem({ label, state }) {
  return (
    <div className="list-item row space-between wrap">
      <div className="muted small">{label}</div>
      <span className="badge">{state}</span>
    </div>
  );
}

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

export default function AuthPanel({ user, status, syncing, lastSyncedAt, onSignIn, onSignOut, onRefresh, supabaseReady, planTier = 'basic', profileCount = 0, entitlement = {}, acceptedDisclaimer = false }) {
  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState('');

  const setupCount = useMemo(() => [Boolean(user), Boolean(acceptedDisclaimer), planTier === 'pro'].filter(Boolean).length, [user, acceptedDisclaimer, planTier]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email) return;
    const result = await onSignIn(email);
    setFeedback(result?.error ? result.error.message : 'Check your email for the magic link. Use the same email everywhere to keep your setup in sync.');
  }

  return (
    <div className="panel stack account-panel">
      <div className="row space-between">
        <h2 className="section-title">Account & onboarding</h2>
        <span className="badge">{syncing ? 'Syncing…' : status}</span>
      </div>

      <div className="onboarding-summary">
        <div>
          <div className="eyebrow">Setup progress</div>
          <div className="value onboarding-progress">{setupCount}/3 complete</div>
        </div>
        <div className="muted small">Finish sync, acceptance, and billing setup from one place.</div>
      </div>

      <div className="setup-steps">
        <Step done={Boolean(user)} title="Connect your account" text={user ? `Signed in as ${user.email}` : 'Use a magic link so your setup follows you across devices.'} />
        <Step done={Boolean(acceptedDisclaimer)} title="Accept the Agreement of Understanding" text={acceptedDisclaimer ? 'Accepted on this account.' : 'Required before treating Midnight Signal like a working dashboard.'} />
        <Step done={planTier === 'pro'} title="Optional: unlock Pro" text={planTier === 'pro' ? 'Stripe-verified Pro is active.' : 'Upgrade later for deeper validation, forward tracking, and advanced alert tools.'} />
      </div>

      <div className="stack">
        <div className="eyebrow">What persistence covers</div>
        <PersistItem label="Watchlist" state={user ? 'Cloud + local backup' : 'Local only'} />
        <PersistItem label="Alert rules & recent history" state={user ? 'Cloud + local backup' : 'Local only'} />
        <PersistItem label="Saved profiles & onboarding setup" state={user ? 'Cloud + local backup' : 'Local only'} />
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
          <div className="muted small">Cloud sync carries your watchlist, onboarding state, saved profiles, alert rules, recent alert history, digest queue, and verified entitlement state.</div>
          <div className="row">
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
