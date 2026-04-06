'use client';

import { useState } from 'react';
import { formatTime } from '@/lib/utils';

export default function AuthPanel({ user, status, syncing, lastSyncedAt, onSignIn, onSignOut, onRefresh, supabaseReady }) {
  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email) return;
    const result = await onSignIn(email);
    setFeedback(result?.error ? result.error.message : 'Magic link sent. Open it on any device and your setup should follow you.');
  }

  return (
    <div className="panel stack">
      <div className="row space-between">
        <h2 className="section-title">Account sync</h2>
        <span className={`badge ${syncing ? 'badge-live' : ''}`}>{syncing ? 'Syncing…' : status}</span>
      </div>

      {!supabaseReady && (
        <div className="notice small">
          Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable cloud sync.
        </div>
      )}

      <div className="trust-list compact">
        <div className="trust-row"><span>Status</span><strong>{syncing ? 'Saving now' : user ? 'Connected' : 'Local fallback'}</strong></div>
        <div className="trust-row"><span>Last sync</span><strong>{formatTime(lastSyncedAt)}</strong></div>
        <div className="trust-row"><span>Fallback</span><strong>{user ? 'Saved locally too' : 'Ready without account'}</strong></div>
      </div>

      {user ? (
        <div className="list-item stack">
          <div><strong>Signed in as:</strong> {user.email}</div>
          <div className="muted small">Your watchlist, settings, selected asset, and disclaimer state can follow you across devices.</div>
          <div className="row">
            <button className="button" onClick={onRefresh}>Sync now</button>
            <button className="ghost-button" onClick={onSignOut}>Sign out</button>
          </div>
        </div>
      ) : (
        <form className="stack" onSubmit={handleSubmit}>
          <div className="muted small">
            Sign in with the same email on desktop, tablet, or mobile to keep one consistent Midnight Signal setup.
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
