'use client';

import { useState } from 'react';

export default function AuthPanel({ user, status, syncing, lastSyncedAt, onSignIn, onSignOut, onRefresh, supabaseReady, planTier = 'basic', profileCount = 0 }) {
  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email) return;
    const result = await onSignIn(email);
    setFeedback(result?.error ? result.error.message : 'Check your email for the magic link.');
  }

  return (
    <div className="panel stack">
      <div className="row space-between">
        <h2 className="section-title">Account sync</h2>
        <span className="badge">{syncing ? 'Syncing…' : status}</span>
      </div>

      {!supabaseReady && (
        <div className="notice small">
          Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable cloud sync.
        </div>
      )}

      {user ? (
        <>
          <div className="list-item stack">
            <div><strong>Signed in as:</strong> {user.email}</div>
            <div className="muted small">Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Not yet synced'}</div>
            <div className="muted small">Cloud sync now carries your watchlist, saved profiles, alert memory, digest queue, and {planTier === 'pro' ? 'Pro access state' : 'membership state'}.</div>
            <div className="muted small">Saved profiles in cloud: {profileCount}</div>
            <div className="row">
              <button className="button" onClick={onRefresh}>Pull latest cloud state</button>
              <button className="ghost-button" onClick={onSignOut}>Sign out</button>
            </div>
          </div>
        </>
      ) : (
        <form className="stack" onSubmit={handleSubmit}>
          <div className="muted small">
            Sign in with the same email on multiple devices to sync settings, watchlist, selected asset, onboarding state, saved profiles, alert rules, trigger memory, digest queue, and membership state.
          </div>
          <input
            className="input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button className="button" type="submit">Send magic link</button>
          {feedback ? <div className="muted small">{feedback}</div> : null}
        </form>
      )}
    </div>
  );
}
