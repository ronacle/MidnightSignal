'use client';

import { useMemo } from 'react';
import AuthPanel from '@/components/AuthPanel';
import BeaconLogo from '@/components/BeaconLogo';
import DisclaimerCard from '@/components/DisclaimerCard';
import LearningPanel from '@/components/LearningPanel';
import MenuBar from '@/components/MenuBar';
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

  const selected = useMemo(
    () => MARKET_FIXTURES.find((item) => item.symbol === state.selectedAsset) || MARKET_FIXTURES[0],
    [state.selectedAsset]
  );

  function jumpTo(id) {
    if (typeof document === 'undefined') return;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <main className="page">
      <div className="shell">
        <MenuBar state={state} user={user} status={status} onJump={jumpTo} />

        <section className="hero hero-shell">
          <div className="stack hero-copy">
            <div className="brand-row brand-row-large">
              <div className="beacon-wrap">
                <BeaconLogo size={108} animated />
              </div>
              <div className="brand-copy">
                <div className="eyebrow">Midnight Signal · v11.11.0</div>
                <h1>What’s the signal tonight?</h1>
                <p>
                  Transforming Market Data → Information → Knowledge → Understanding → Market Wisdom.
                  AI-assisted market posture built to help you see the setup, understand the why, and act with more confidence.
                </p>
              </div>
            </div>

            <div className="hero-pill-row">
              <span className="badge glow-badge">Tonight's ritual starts here</span>
              <span className="badge">Direction + conviction separated</span>
              <span className="badge">Cross-device sync ready</span>
              <span className="badge">Early Access · Pro framing</span>
            </div>

            <div className="notice small">
              Start with Tonight's Top Signal, scan the why, then move into context, settings, and your watchlist. The goal here is clarity first: the signal should lead, everything else should support it.
            </div>
          </div>

          <div className="hero-stat-grid">
            <div className="mini">
              <div className="eyebrow">Tonight’s lead</div>
              <div className="value">{selected.symbol}</div>
              <div className="muted small">{selected.name}</div>
            </div>
            <div className="mini">
              <div className="eyebrow">Direction</div>
              <div className="value sentiment-word">{selected.sentiment}</div>
              <div className="muted small">Market posture right now</div>
            </div>
            <div className="mini">
              <div className="eyebrow">Conviction</div>
              <div className="value">{selected.conviction}%</div>
              <div className="muted small">How strong the setup looks</div>
            </div>
            <div className="mini">
              <div className="eyebrow">Sync state</div>
              <div className="value">{user ? 'Cloud ready' : 'Local mode'}</div>
              <div className="muted small">{lastSyncedAt ? formatTime(lastSyncedAt) : 'Not yet synced'}</div>
            </div>
          </div>
        </section>

        <section className="top-grid" id="top-signal">
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
            />
            <DisclaimerCard state={state} setState={setState} />
          </div>
        </section>

        <section className="top-grid" id="brief">
          <div className="panel stack">
            <div className="row space-between">
              <h2 className="section-title">Tonight&apos;s Brief</h2>
              <span className="badge">{state.timeframe}</span>
            </div>
            <div className="list-item stack">
              <div className="eyebrow">Tonight&apos;s top signal</div>
              <div className="value brief-value">{selected.symbol} · {selected.sentiment}</div>
              <div className="muted">{selected.story}</div>
            </div>
            <div className="notice small">
              Returning user flow: read the top signal first, check the brief for the why, then adjust your control settings or watchlist if your posture changed since last visit.
            </div>
          </div>

          <div className="panel stack">
            <h2 className="section-title">Since your last visit</h2>
            <div className="list-item small muted">• Selected asset: {state.selectedAsset}</div>
            <div className="list-item small muted">• Mode: {state.mode}</div>
            <div className="list-item small muted">• Strategy: {state.strategy}</div>
            <div className="list-item small muted">• Watchlist count: {state.watchlist.length}</div>
            <div className="list-item small muted">• Last viewed: {formatTime(state.lastViewedAt)}</div>
          </div>
        </section>

        <section className="top-grid" id="controls">
          <SettingsPanel state={state} setState={setState} />
          <LearningPanel state={state} />
        </section>

        <section id="watchlist">
          <WatchlistPanel state={state} setState={setState} />
        </section>

        <div className="footer-note">
          Build v11.11.0 · polish + identity lock · clearer hero, calmer trust layer, cleaner signal hierarchy
        </div>
      </div>
    </main>
  );
}
