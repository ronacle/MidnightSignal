'use client';

import { useEffect, useMemo, useState } from 'react';
import TopNav from '@/components/layout/TopNav';
import HeroSection from '@/components/layout/HeroSection';
import TopSignalCard from '@/components/signals/TopSignalCard';
import TonightBrief from '@/components/signals/TonightBrief';
import SinceLastVisit from '@/components/signals/SinceLastVisit';
import Top20Grid from '@/components/signals/Top20Grid';
import WatchlistPanel from '@/components/WatchlistPanel';
import ControlDrawer from '@/components/panels/ControlDrawer';
import LearningDrawer from '@/components/panels/LearningDrawer';
import AssetDetailSheet from '@/components/panels/AssetDetailSheet';
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

  const [controlOpen, setControlOpen] = useState(false);
  const [learningOpen, setLearningOpen] = useState(false);
  const [detailAsset, setDetailAsset] = useState(null);
  const [learningAsset, setLearningAsset] = useState(null);
  const [alertAsset, setAlertAsset] = useState(null);
  const [sinceHidden, setSinceHidden] = useState(false);

  const selected = useMemo(
    () => MARKET_FIXTURES.find((item) => item.symbol === state.selectedAsset) || MARKET_FIXTURES[0],
    [state.selectedAsset]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSinceHidden(window.localStorage.getItem('since-dismissed') === 'true');
  }, []);

  function toggleWatchlist(symbol) {
    setState((previous) => ({
      ...previous,
      watchlist: previous.watchlist.includes(symbol)
        ? previous.watchlist.filter((item) => item !== symbol)
        : [...previous.watchlist, symbol]
    }));
  }

  function jumpTo(id) {
    if (typeof document === 'undefined') return;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <main className="page">
      <div className="shell">
        <TopNav
          state={state}
          user={user}
          status={status}
          onJump={jumpTo}
          onOpenControls={() => { setAlertAsset(null); setControlOpen(true); }}
          onOpenLearning={() => { setLearningAsset(null); setLearningOpen(true); }}
        />

        <HeroSection
          selected={selected}
          user={user}
          status={status}
          lastSyncedAt={lastSyncedAt}
          watchlistCount={state.watchlist.length}
          syncing={syncing}
          onOpenControls={() => { setAlertAsset(null); setControlOpen(true); }}
        >
          {!sinceHidden ? (
            <SinceLastVisit
              state={state}
              lastSyncedAt={lastSyncedAt}
              onJump={() => jumpTo('top-signal')}
              onDismiss={() => {
                setSinceHidden(true);
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem('since-dismissed', 'true');
                }
              }}
            />
          ) : null}
        </HeroSection>

        <section className="top-grid" id="top-signal">
          <TopSignalCard state={state} />
          <TonightBrief selected={selected} timeframe={state.timeframe} />
        </section>

        <section className="market-grid" id="market-scan">
          <Top20Grid state={state} setState={setState} onAssetOpen={setDetailAsset} />
          <WatchlistPanel state={state} setState={setState} onAssetOpen={setDetailAsset} />
        </section>

        <div className="footer-note">
          Build v11.13.5 · hero strip + live controls fix
        </div>
      </div>

      <ControlDrawer
        open={controlOpen}
        onClose={() => setControlOpen(false)}
        state={state}
        setState={setState}
        user={user}
        status={status}
        syncing={syncing}
        lastSyncedAt={lastSyncedAt}
        onSignIn={signInWithEmail}
        onSignOut={signOut}
        onRefresh={refreshFromCloud}
        supabaseReady={supabaseReady}
        alertAsset={alertAsset}
        onConsumeAlertAsset={() => setAlertAsset(null)}
      />
      <LearningDrawer
        open={learningOpen}
        onClose={() => setLearningOpen(false)}
        state={state}
        focusAsset={learningAsset}
      />
      <AssetDetailSheet
        asset={detailAsset}
        open={Boolean(detailAsset)}
        onClose={() => setDetailAsset(null)}
        timeframe={state.timeframe}
        onToggleWatchlist={toggleWatchlist}
        inWatchlist={detailAsset ? state.watchlist.includes(detailAsset.symbol) : false}
        onOpenLearning={(asset) => {
          setDetailAsset(null);
          setControlOpen(false);
          setLearningAsset(asset);
          setLearningOpen(true);
        }}
        onSetAlert={(asset) => {
          setDetailAsset(null);
          setLearningOpen(false);
          setAlertAsset(asset);
          setControlOpen(true);
        }}
      />
    </main>
  );
}
