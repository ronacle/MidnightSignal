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
import { useAccountSync } from '@/hooks/useAccountSync';

const EXTRA_SCAN_ASSETS = [
  { symbol: 'LINK', name: 'Chainlink', conviction: 62, sentiment: 'neutral', story: 'Quiet accumulation behavior with improving structure.' },
  { symbol: 'AVAX', name: 'Avalanche', conviction: 44, sentiment: 'bearish', story: 'Weak follow-through is keeping conviction lower.' },
  { symbol: 'DOGE', name: 'Dogecoin', conviction: 51, sentiment: 'neutral', story: 'Speculative energy is present, but posture is mixed.' },
  { symbol: 'SUI', name: 'Sui', conviction: 69, sentiment: 'bullish', story: 'Leadership tone is improving on recent momentum.' },
  { symbol: 'HBAR', name: 'Hedera', conviction: 48, sentiment: 'neutral', story: 'Setup is still looking for stronger agreement.' },
  { symbol: 'TON', name: 'Toncoin', conviction: 57, sentiment: 'bullish', story: 'Constructive structure with selective strength.' },
  { symbol: 'DOT', name: 'Polkadot', conviction: 46, sentiment: 'bearish', story: 'Needs stronger participation to improve posture.' },
  { symbol: 'NEAR', name: 'Near', conviction: 61, sentiment: 'bullish', story: 'Trend quality is improving with steadier participation.' },
  { symbol: 'APT', name: 'Aptos', conviction: 54, sentiment: 'neutral', story: 'Still in the middle zone between noise and trend.' },
  { symbol: 'XLM', name: 'Stellar', conviction: 42, sentiment: 'bearish', story: 'Relative strength remains soft.' },
  { symbol: 'INJ', name: 'Injective', conviction: 73, sentiment: 'bullish', story: 'Momentum and structure are aligning well.' },
  { symbol: 'ARB', name: 'Arbitrum', conviction: 58, sentiment: 'neutral', story: 'Constructive, but not yet decisive.' },
  { symbol: 'OP', name: 'Optimism', conviction: 55, sentiment: 'neutral', story: 'Moderate alignment with room for stronger confirmation.' },
  { symbol: 'ATOM', name: 'Cosmos', conviction: 49, sentiment: 'neutral', story: 'Balanced posture with limited edge.' },
  { symbol: 'SEI', name: 'Sei', conviction: 64, sentiment: 'bullish', story: 'Momentum is improving with better follow-through.' }
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getSentiment(conviction) {
  if (conviction >= 68) return 'bullish';
  if (conviction <= 44) return 'bearish';
  return 'neutral';
}

function buildStory(symbol, conviction, change24h) {
  const move = Number.isFinite(change24h) ? change24h : 0;
  if (conviction >= 72) {
    return `${symbol} is leading tonight as price strength and structure are aligning.`;
  }
  if (conviction >= 60) {
    return `${symbol} is constructive with improving trend quality, but follow-through still matters.`;
  }
  if (conviction >= 45) {
    return `${symbol} is sitting in the middle zone with mixed signals and selective opportunity.`;
  }
  return `${symbol} is lagging tonight as momentum and participation remain weak.`;
}

function convictionFromMarket(item) {
  const change = Number(item?.change24h ?? 0);
  const rank = Number(item?.rank ?? 25);
  const volume = Number(item?.volumeNum ?? 0);

  let score = 56;
  score += change * 4.25;
  score += rank <= 3 ? 8 : rank <= 8 ? 4 : rank <= 15 ? 1 : -2;
  score += volume >= 10_000_000_000 ? 4 : volume >= 1_000_000_000 ? 2 : 0;

  return clamp(Math.round(score), 28, 92);
}

function mergeAssets(liveItems) {
  const liveMap = new Map((liveItems || []).map((item) => [item.symbol, item]));
  const baseAssets = [...MARKET_FIXTURES, ...EXTRA_SCAN_ASSETS].slice(0, 20);

  const merged = baseAssets.map((asset) => {
    const live = liveMap.get(asset.symbol);
    if (!live) return asset;

    const conviction = convictionFromMarket(live);
    const sentiment = getSentiment(conviction);

    return {
      ...asset,
      conviction,
      sentiment,
      story: buildStory(asset.symbol, conviction, live.change24h),
      price: live.price,
      change24h: live.change24h,
      rank: live.rank,
      volumeNum: live.volumeNum,
      marketCap: live.marketCap,
      lastUpdated: live.lastUpdated,
      live: true
    };
  });

  return merged.sort((a, b) => {
    if (b.conviction !== a.conviction) return b.conviction - a.conviction;
    return String(a.symbol).localeCompare(String(b.symbol));
  });
}

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
  const [liveItems, setLiveItems] = useState([]);
  const [marketSource, setMarketSource] = useState('fixtures');
  const [marketUpdatedAt, setMarketUpdatedAt] = useState(null);
  const [marketReady, setMarketReady] = useState(false);

  const rankedAssets = useMemo(() => mergeAssets(liveItems), [liveItems]);

  const topSignal = useMemo(
    () => rankedAssets[0] || MARKET_FIXTURES[0],
    [rankedAssets]
  );

  const selected = useMemo(
    () => rankedAssets.find((item) => item.symbol === state.selectedAsset) || topSignal,
    [rankedAssets, state.selectedAsset, topSignal]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadMarket() {
      try {
        const response = await fetch('/api/market', { cache: 'no-store' });
        const data = await response.json();
        if (cancelled) return;

        if (data?.ok && Array.isArray(data.items) && data.items.length) {
          setLiveItems(data.items);
          setMarketSource(data.source || 'coingecko');
          setMarketUpdatedAt(new Date().toISOString());
        } else {
          setLiveItems([]);
          setMarketSource(data?.source || 'fallback');
          setMarketUpdatedAt(new Date().toISOString());
        }
      } catch {
        if (cancelled) return;
        setLiveItems([]);
        setMarketSource('fallback');
        setMarketUpdatedAt(new Date().toISOString());
      } finally {
        if (!cancelled) setMarketReady(true);
      }
    }

    loadMarket();
    const interval = window.setInterval(loadMarket, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!state.selectedAsset && topSignal?.symbol) {
      setState((previous) => ({ ...previous, selectedAsset: topSignal.symbol }));
    }
  }, [state.selectedAsset, topSignal, setState]);

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
          selected={topSignal}
          user={user}
          status={status}
          lastSyncedAt={lastSyncedAt}
          watchlistCount={state.watchlist.length}
          syncing={syncing}
          onOpenControls={() => { setAlertAsset(null); setControlOpen(true); }}
        />

        <section className="top-grid" id="top-signal">
          <TopSignalCard
            asset={topSignal}
            mode={state.mode}
            strategy={state.strategy}
            source={marketSource}
            updatedAt={marketUpdatedAt}
            liveReady={marketReady}
          />
          <TonightBrief asset={topSignal} timeframe={state.timeframe} />
        </section>

        <section id="since-last-visit">
          <SinceLastVisit state={state} lastSyncedAt={lastSyncedAt} />
        </section>

        <section className="market-grid" id="market-scan">
          <Top20Grid
            state={state}
            setState={setState}
            onAssetOpen={setDetailAsset}
            assets={rankedAssets}
          />
          <WatchlistPanel state={state} setState={setState} onAssetOpen={setDetailAsset} />
        </section>

        <div className="footer-note">
          Build v11.14.0 · top signal decoupled from selected asset · source: {marketSource}
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
        asset={detailAsset || selected}
        open={Boolean(detailAsset)}
        onClose={() => setDetailAsset(null)}
        timeframe={state.timeframe}
        onToggleWatchlist={toggleWatchlist}
        inWatchlist={(detailAsset || selected) ? state.watchlist.includes((detailAsset || selected).symbol) : false}
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
