'use client';

import AuthPanel from '@/components/AuthPanel';
import BeaconLogo from '@/components/BeaconLogo';
import DisclaimerCard from '@/components/DisclaimerCard';
import SettingsPanel from '@/components/SettingsPanel';
import TopSignal from '@/components/TopSignal';
import WatchlistPanel from '@/components/WatchlistPanel';
import { useAccountSync } from '@/hooks/useAccountSync';
import { MARKET_FIXTURES } from '@/lib/default-state';
import { formatTime, getConvictionTier } from '@/lib/utils';

const FLOW_STEPS = [
  { label: 'Data', tone: 'step-a' },
  { label: 'Information', tone: 'step-b' },
  { label: 'Knowledge', tone: 'step-c' },
  { label: 'Understanding', tone: 'step-d' },
  { label: 'Market Wisdom', tone: 'step-e' }
];

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
  const trustLabel = user
    ? syncing
      ? 'Syncing now'
      : lastSyncedAt
        ? 'Synced just now'
        : 'Cloud ready'
    : 'Saved locally';

  const trustMeta = user
    ? user.email
    : 'Sign in to keep your session in sync across devices';

  return (
    <main className="page page-restore">
      <div className="shell shell-restore">
        <section className="hero hero-restore">
          <div className="hero-main stack-lg">
            <div className="brand-lockup">
              <div className="brand-mark-wrap">
                <BeaconLogo size={104} animated />
              </div>
              <div className="brand-copy brand-copy-restore">
                <div className="eyebrow eyebrow-bright">Midnight Signal · v11.10.1</div>
                <h1>Midnight Signal</h1>
                <p className="hero-tagline">
                  Transforming Market Data → Information → Knowledge → Understanding → Market Wisdom.
                  Know the setup, the why, and act with more confidence.
                </p>
              </div>
            </div>

            <div className="flow-ribbon">
              {FLOW_STEPS.map((step) => (
                <span key={step.label} className={`flow-pill ${step.tone}`}>{step.label}</span>
              ))}
            </div>

            <div className="hero-spotlight card spotlight-card">
              <div className="row space-between align-start gap-lg wrap-mobile">
                <div className="stack-sm">
                  <div className="eyebrow">Tonight&apos;s signal focus</div>
                  <div className="spotlight-symbol-row">
                    <div className="spotlight-symbol">{selected.symbol}</div>
                    <div>
                      <div className="spotlight-name">{selected.name}</div>
                      <div className="muted">{selected.story}</div>
                    </div>
                  </div>
                </div>

                <div className="spotlight-metrics">
                  <div className="metric-chip">
                    <span className={`sentiment ${selected.sentiment}`}>{selected.sentiment}</span>
                    <span className="metric-helper">Direction</span>
                  </div>
                  <div className="metric-chip metric-chip-strong">
                    <span className="metric-value">{selected.conviction}%</span>
                    <span className="metric-helper">Conviction · {getConvictionTier(selected.conviction)}</span>
                  </div>
                </div>
              </div>

              <div className="hero-actions row wrap-mobile">
                <span className="badge badge-bright">{state.mode} mode</span>
                <span className="badge">{state.strategy} strategy</span>
                <span className="badge">{state.timeframe} timeframe</span>
                <span className="badge">{state.watchlist.length} watchlist assets</span>
              </div>
            </div>
          </div>

          <div className="hero-side stack-lg">
            <div className="panel trust-panel stack">
              <div className="row space-between">
                <h2 className="section-title">Trust layer</h2>
                <span className="badge badge-bright">{trustLabel}</span>
              </div>
              <div className="trust-copy">
                <div className="trust-meta">{trustMeta}</div>
                <div className="muted small">Last sync: {formatTime(lastSyncedAt)}</div>
              </div>
              <div className="trust-grid">
                <div className="mini">
                  <div className="eyebrow">Selected asset</div>
                  <div className="value">{selected.symbol}</div>
                  <div className="muted small">{selected.name}</div>
                </div>
                <div className="mini">
                  <div className="eyebrow">Sync scope</div>
                  <div className="value">{user ? 'Cloud' : 'Local'}</div>
                  <div className="muted small">Mode, asset, watchlist, disclaimer</div>
                </div>
              </div>
            </div>

            <div className="panel stack compact-panel">
              <div className="row space-between">
                <h2 className="section-title">Tonight&apos;s flow</h2>
                <span className="badge">Restored branded UI</span>
              </div>
              <div className="flow-list">
                <div className="flow-item"><strong>1.</strong> Tonight&apos;s Top Signal</div>
                <div className="flow-item"><strong>2.</strong> Why it matters</div>
                <div className="flow-item"><strong>3.</strong> Context + settings</div>
                <div className="flow-item"><strong>4.</strong> Watchlist exploration</div>
              </div>
            </div>
          </div>
        </section>

        <section className="main-grid-restore">
          <div className="stack-lg">
            <TopSignal state={state} />

            <div className="panel story-panel stack">
              <div className="row space-between">
                <h2 className="section-title">Tonight&apos;s Brief</h2>
                <span className="badge">Why this setup stands out</span>
              </div>
              <p className="story-text">
                {selected.symbol} is carrying the strongest focus in your current session because the posture is <strong>{selected.sentiment}</strong> while conviction remains elevated. Use the top signal first, then move into settings and your watchlist only after you understand the current posture and why it matters.
              </p>
              <div className="story-grid">
                <div className="list-item">
                  <div className="eyebrow">Direction</div>
                  <div className="value value-compact">{selected.sentiment}</div>
                  <div className="muted small">Directional posture should answer the market stance fast.</div>
                </div>
                <div className="list-item">
                  <div className="eyebrow">Conviction</div>
                  <div className="value value-compact">{selected.conviction}%</div>
                  <div className="muted small">Conviction is separate from direction so the read is clearer.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="stack-lg">
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
            <DisclaimerCard state={state} setState={setState} />
          </div>
        </section>

        <section className="main-grid-restore secondary-grid">
          <SettingsPanel state={state} setState={setState} />

          <div className="panel stack context-panel">
            <div className="row space-between">
              <h2 className="section-title">Since your last visit</h2>
              <span className="badge">Session context</span>
            </div>
            <div className="list-item stack">
              <div className="muted">
                Your active session is centered on <strong>{selected.symbol}</strong> with a <strong>{selected.sentiment}</strong> posture and <strong>{selected.conviction}% conviction</strong>.
              </div>
              <div className="context-grid">
                <div>
                  <div className="eyebrow">Mode</div>
                  <div className="context-value">{state.mode}</div>
                </div>
                <div>
                  <div className="eyebrow">Strategy</div>
                  <div className="context-value">{state.strategy}</div>
                </div>
                <div>
                  <div className="eyebrow">Timeframe</div>
                  <div className="context-value">{state.timeframe}</div>
                </div>
                <div>
                  <div className="eyebrow">Viewed</div>
                  <div className="context-value">{formatTime(state.lastViewedAt)}</div>
                </div>
              </div>
            </div>
            <div className="notice small">
              Cross-device sync stays underneath the experience. The branded UI stays in front, while account sync quietly preserves your settings, watchlist, selected asset, and disclaimer state.
            </div>
          </div>
        </section>

        <WatchlistPanel state={state} setState={setState} />

        <div className="footer-note footer-note-restore">
          Build v11.10.1 · restored pre-sync style direction with cross-device account sync preserved underneath
        </div>
      </div>
    </main>
  );
}
