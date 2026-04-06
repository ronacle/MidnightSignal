'use client';

import { useEffect, useState } from 'react';

export default function AuthPanel({
  user,
  status,
  syncing,
  lastSyncedAt,
  onSignIn,
  onSignOut,
  onRefresh,
  supabaseReady,
  authFeedback,
  authError,
  linkSentTo,
  clearAuthMessages
}) {
  const [email, setEmail] = useState(linkSentTo || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (linkSentTo) setEmail(linkSentTo);
  }, [linkSentTo]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email || submitting) return;
    setSubmitting(true);
    try {
      await onSignIn(email);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="panel stack auth-panel">
      <div className="row space-between">
        <div>
          <h2 className="section-title">Account sync</h2>
          <div className="muted small">One email. Every device. Same Midnight Signal setup.</div>
        </div>
        <span className="badge">{syncing ? 'Syncing…' : status}</span>
      </div>

      {!supabaseReady && (
        <div className="notice small notice-warning">
          Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in Vercel to enable cloud sync.
        </div>
      )}

      {user ? (
        <>
          <div className="list-item stack">
            <div><strong>Signed in as:</strong> {user.email}</div>
            <div className="muted small">Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Not yet synced'}</div>
            <div className="row">
              <button className="button" onClick={onRefresh}>Sync now</button>
              <button className="ghost-button" onClick={onSignOut}>Sign out</button>
            </div>
          </div>
          <div className="auth-steps small muted">
            Your watchlist, selected asset, mode, timeframe, strategy, and disclaimer state now follow this account across devices.
          </div>
        </>
      ) : (
        <form className="stack" onSubmit={handleSubmit}>
          <div className="auth-card stack">
            <div className="auth-title">Magic link sign-in</div>
            <div className="muted small">
              Enter your email and we&apos;ll send a one-tap sign-in link. Use the same email on phone, tablet, and desktop to sync your setup.
            </div>
            <input
              className="input"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (authFeedback || authError) clearAuthMessages?.();
              }}
            />
            <button className="button" type="submit" disabled={!supabaseReady || submitting}>
              {submitting ? 'Sending…' : 'Send sign-in link'}
            </button>
          </div>

          {authFeedback ? <div className="notice small">{authFeedback}</div> : null}
          {authError ? <div className="notice small notice-error">{authError}</div> : null}

          <div className="auth-steps small muted">
            <div>1. Open the email on the device you want to sign in on.</div>
            <div>2. Tap the link and wait for Midnight Signal to reload.</div>
            <div>3. If it does not sign you in, open the link in a private tab and try once more.</div>
          </div>
        </form>
      )}
    </div>
  );
}
