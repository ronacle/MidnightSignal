'use client';

import AuthPanel from '@/components/AuthPanel';
import BeaconLogo from '@/components/BeaconLogo';
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
    supabaseReady
  } = useAccountSync();

  const selected = MARKET_FIXTURES.find((item) => item.symbol === state.selectedAsset) || MARKET_FIXTURES[0];
  const syncedLabel = syncing ? 'Syncing now' : user ? (lastSyncedAt ? 'Synced just now' : 'Cloud ready') : 'Saved locally';
  const tone = selected.sentiment === 'bullish' ? 'up' : selected.sentiment === 'bearish' ? 'down' : 'flat';

  return (
    <main className="page">
      <div className="shell">
        <section className="hero hero-v11-10">
          <div className="stack hero-copy">
            <div className="brand-lockup">
              <div className="beacon-wrap"><BeaconLogo size={104} /></div>
              <div className="brand-copy">
                <div className="eyebrow">Midnight Signal · v11.10</div>
                <h1>Midnight Signal</h1>
                <p className="hero-lede">
                  Transforming Market Data → Information → Knowledge → Understanding → Market Wisdom.
                  Know the setup, the why, and act with more confidence.
                </p>
              </div>
            </div>

            <div className="hero-trust-row">
              <span className={`trust-pill ${user ? 'cloud' : 'local'}`}>{syncedLabel}</span>
              <span className="trust-pill subtle">{user ? user.email : 'Sign in to sync across devices'}</span>
              <span className="trust-pill subtle">Disclaimer {state.acceptedDisclaimer ? 'accepted' : 'pending'}</span>
            </div>

            <div className="hero-story panel inset-panel">
              <div className="eyebrow">Tonight’s flow</div>
              <div className="flow-grid">
                <div className="flow-item">
                  <div className="flow-step">1</div>
                  <div>
                    <strong>Top signal</strong>
                    <div className="muted small">Start with the clearest setup on the board.</div>
                  </div>
                </div>
                <div className="flow-item">
                  <div className="flow-step">2</div>
                  <div>
                    <strong>Why it matters</strong>
                    <div className="muted small">Read the brief before you react.</div>
                  </div>
                </div>
                <div className="flow-item">
                  <div className="flow-step">3</div>
                  <div>
                    <strong>Context + explore</strong>
                    <div className="muted small">Use your recent sync state, settings, and watchlist.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="hero-stat-grid hero-side">
            <div className="mini spotlight-card">
              <div className="eyebrow">Tonight’s posture</div>
              <div className={`value tone-${tone}`}>{selected.sentiment}</div>
              <div className="muted small">{selected.conviction}% conviction on {selected.symbol}</div>
            </div>
            <div className="mini">
              <div className="eyebrow">Selected asset</div>
              <div className="value">{selected.symbol}</div>
              <div className="muted small">{selected.name}</div>
            </div>
            <div className="mini">
              <div className="eyebrow">Last sync</div>
              <div className="value">{user ? 'Cloud' : 'Local'}</div>
              <div className="muted small">{formatTime(lastSyncedAt)}</div>
            </div>
            <div className="mini">
              <div className="eyebrow">Watchlist</div>
              <div className="value">{state.watchlist.length}</div>
              <div className="muted small">Assets following you across devices</div>
            </div>
          </div>
        </section>

        <section className="top-grid primary-grid">
          <TopSignal state={state} />
          <AuthPanel
            user={user}
            status={status}
            syncing={syncing}
            lastSyncedAt={lastSyncedAt}
            onSignIn={signInWithEmail}
            onSignOut={signOut}
            onRefresh={refreshFromCloud}
            supabaseReady={supabaseReady}
          />
        </section>

        <section className="top-grid story-grid">
          <div className="panel stack">
            <div className="row space-between">
              <h2 className="section-title">Tonight&apos;s Brief</h2>
              <span className="badge">Why before action</span>
            </div>
            <div className="list-item stack">
              <div className="eyebrow">Current read</div>
              <div className="muted">{selected.story}</div>
              <div className="row">
                <span className="badge">Direction: {selected.sentiment}</span>
                <span className="badge">Conviction: {selected.conviction}%</span>
                <span className="badge">Timeframe: {state.timeframe}</span>
              </div>
            </div>
          </div>

          <div className="panel stack">
            <div className="row space-between">
              <h2 className="section-title">Since your last visit</h2>
              <span className="badge">Trust layer</span>
            </div>
            <div className="list-item stack">
              <div className="muted small">Last viewed</div>
              <div className="value slim">{formatTime(state.lastViewedAt)}</div>
              <div className="muted small">
                Your mode, strategy, timeframe, selected asset, watchlist, and agreement state are preserved locally and synced to cloud when signed in.
              </div>
            </div>
            <div className="trust-list">
              <div className="trust-row"><span>Storage mode</span><strong>{user ? 'Cloud + local backup' : 'Local only'}</strong></div>
              <div className="trust-row"><span>Newest state wins</span><strong>Timestamp merge</strong></div>
              <div className="trust-row"><span>Sync health</span><strong>{syncing ? 'Working…' : status}</strong></div>
            </div>
          </div>
        </section>

        <section className="top-grid secondary-grid">
          <SettingsPanel state={state} setState={setState} />
          <DisclaimerCard state={state} setState={setState} />
        </section>

        <WatchlistPanel state={state} setState={setState} />

        <div className="footer-note">
          Build v11.10 · hero + flow + trust layer · educational product shell
        </div>
      </div>
    </main>
  );
}
