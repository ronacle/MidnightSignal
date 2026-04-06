'use client';

import AuthPanel from '@/components/AuthPanel';
import DisclaimerCard from '@/components/DisclaimerCard';
import SettingsPanel from '@/components/SettingsPanel';
import TopSignal from '@/components/TopSignal';
import WatchlistPanel from '@/components/WatchlistPanel';
import { MARKET_FIXTURES } from '@/lib/default-state';
import { formatTime } from '@/lib/utils';
import { useAccountSync } from '@/hooks/useAccountSync';

export default function HomePage() {
  const {
    state,
    setState,
    user,
    status,
    syncing,
    lastSyncedAt,
    signInWithEmail,
    signOut,
    refreshFromCloud,
    supabaseReady,
    clientError
  } = useAccountSync();

  const selected = MARKET_FIXTURES.find((item) => item.symbol === state.selectedAsset) || MARKET_FIXTURES[0];

  return (
    <main className="page">
      <div className="shell">
        <section className="hero">
          <div className="stack">
            <div className="brand-row">
              <div className="beacon"><div className="dot" /></div>
              <div className="brand-copy">
                <div className="eyebrow">Midnight Signal · v11.8</div>
                <h1>Midnight Signal</h1>
                <p>
                  Transforming Market Data → Information → Knowledge → Understanding → Market Wisdom.
                  Know the setup, the why, and act with more confidence.
                </p>
              </div>
            </div>

            <div className="notice small">
              This build adds cross-device account sync so a user can sign in on desktop, tablet, or phone and keep the same watchlist, mode, selected asset, timeframe, strategy, and disclaimer state.
            </div>
          </div>

          <div className="hero-stat-grid">
            <div className="mini">
              <div className="eyebrow">Sync status</div>
              <div className="value">{status}</div>
              <div className="muted small">{user ? user.email : 'Not signed in'}</div>
            </div>
            <div className="mini">
              <div className="eyebrow">Selected asset</div>
              <div className="value">{selected.symbol}</div>
              <div className="muted small">{selected.name}</div>
            </div>
            <div className="mini">
              <div className="eyebrow">Last cloud sync</div>
              <div className="value">{lastSyncedAt ? 'Live' : 'Pending'}</div>
              <div className="muted small">{formatTime(lastSyncedAt)}</div>
            </div>
            <div className="mini">
              <div className="eyebrow">Watchlist items</div>
              <div className="value">{state.watchlist.length}</div>
              <div className="muted small">Synced account preferences</div>
            </div>
          </div>
        </section>

        <section className="top-grid">
          <TopSignal state={state} />
          <div className="stack">
            <AuthPanel
              user={user}
              status={status}
              syncing={syncing}
              lastSyncedAt={lastSyncedAt}
              onSignIn={signInWithEmail}
              onSignOut={signOut}
              onRefresh={refreshFromCloud}
              supabaseReady={supabaseReady}
              clientError={clientError}
            />
            <DisclaimerCard state={state} setState={setState} />
          </div>
        </section>

        <section className="top-grid">
          <SettingsPanel state={state} setState={setState} />
          <div className="panel stack">
            <h2 className="section-title">What syncs now</h2>
            <div className="list-item small muted">• Beginner / Pro mode</div>
            <div className="list-item small muted">• Currency, strategy, timeframe</div>
            <div className="list-item small muted">• Watchlist and selected asset</div>
            <div className="list-item small muted">• Agreement-of-understanding completion</div>
            <div className="list-item small muted">• Last viewed state and update timestamp</div>
          </div>
        </section>

        <WatchlistPanel state={state} setState={setState} />

        <div className="footer-note">
          Build v11.8 · cross-device account sync bundle · educational product shell
        </div>
      </div>
    </main>
  );
}
