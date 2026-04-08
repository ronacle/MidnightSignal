'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import TopNav from '@/components/layout/TopNav';
import HeroSection from '@/components/layout/HeroSection';
import Top20Grid from '@/components/signals/Top20Grid';
import LeadSignalPanel from '@/components/signals/LeadSignalPanel';
import SignalContextPanel from '@/components/signals/SignalContextPanel';
import AlertCenterPanel from '@/components/signals/AlertCenterPanel';
import ControlDrawer from '@/components/panels/ControlDrawer';
import LearningDrawer from '@/components/panels/LearningDrawer';
import AssetDetailSheet from '@/components/panels/AssetDetailSheet';
import WatchlistPanel from '@/components/WatchlistPanel';
import { MARKET_FIXTURES } from '@/lib/default-state';
import { useAccountSync } from '@/hooks/useAccountSync';
import { shouldRefreshEntitlement } from '@/lib/entitlements';
import { rankAssets, buildSignalSnapshot, detectMarketRegime } from '@/lib/signal-engine';
import { appendSignalSnapshot, buildValidationSummary, readSignalHistory } from '@/lib/signal-history';
import { buildSignalContext } from '@/lib/news-context';
import {
  buildForwardScorecard,
  readForwardValidation,
  updateForwardCheckpoints,
  upsertForwardSignal,
  writeForwardValidation,
} from '@/lib/signal-forward-validation';
import {
  buildAdaptiveSummary,
  deriveAdaptiveWeights,
  readAdaptiveWeights,
  writeAdaptiveWeights,
} from '@/lib/adaptive-weights';
import { buildDecisionLayer } from '@/lib/decision-layer';
import {
  buildAssetSnapshotMap,
  buildSystemAlerts,
  buildMeaningfulChangeAlerts,
  evaluateConfiguredAlerts,
  readAlertMemory,
  readDigestMemory,
  readEmailDeliveryMemory,
  recordEmailDelivery,
  selectDeliverableAlerts,
  writeAlertMemory,
  writeDigestMemory,
  writeEmailDeliveryMemory,
  queueDigestEvents,
  consumeQueuedDigestEvents,
} from '@/lib/alert-engine';


const SESSION_SNAPSHOT_KEY = 'midnight-signal-session-snapshot-v1';

function normalizeSignalLabel(label = '') {
  return String(label || '')
    .replace(/\s+/g, ' ')
    .trim() || 'Mixed posture';
}

function safeRenderText(value, fallback = '') {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map((item) => safeRenderText(item, '')).filter(Boolean).join(' · ') || fallback;
  if (value && typeof value === 'object') {
    if (typeof value.headline === 'string' && value.headline.trim()) return value.headline;
    if (typeof value.title === 'string' && value.title.trim()) return value.title;
    if (typeof value.label === 'string' && value.label.trim()) return value.label;
    if (typeof value.detail === 'string' && value.detail.trim()) return value.detail;
    if (typeof value.body === 'string' && value.body.trim()) return value.body;
  }
  return fallback;
}

function createSessionSnapshot({ topSignal, rankedAssets = [], watchlist = [], regimeSummary, marketUpdatedAt }) {
  const watchSymbols = Array.isArray(watchlist) ? watchlist.map((item) => String(item).toUpperCase()) : [];
  const watchAssets = rankedAssets.filter((item) => watchSymbols.includes(item.symbol));

  return {
    capturedAt: marketUpdatedAt || new Date().toISOString(),
    topSignal: topSignal ? {
      symbol: topSignal.symbol,
      conviction: Number(topSignal.conviction ?? topSignal.signalScore ?? 0),
      signalLabel: normalizeSignalLabel(topSignal.signalLabel),
      sentiment: topSignal.sentiment || 'neutral',
      change24h: Number(topSignal.change24h || 0),
    } : null,
    regime: regimeSummary?.regime || 'Mixed',
    watchlist: watchAssets.map((asset) => ({
      symbol: asset.symbol,
      conviction: Number(asset.conviction ?? asset.signalScore ?? 0),
      signalLabel: normalizeSignalLabel(asset.signalLabel),
      sentiment: asset.sentiment || 'neutral',
      change24h: Number(asset.change24h || 0),
    })),
  };
}

function buildVisitIntelligence(previousSnapshot, currentSnapshot) {
  if (!previousSnapshot || !currentSnapshot?.topSignal) {
    return {
      highlights: ['No prior session snapshot yet — tonight starts your first tracked rhythm.'],
      improved: [],
      weakened: [],
      takeaway: 'Check the top signal, scan your watchlist, and your next visit will compare against tonight.',
      changedCount: 0,
    };
  }

  const highlights = [];
  const improved = [];
  const weakened = [];

  const previousTop = previousSnapshot.topSignal || null;
  const currentTop = currentSnapshot.topSignal || null;

  if (previousTop?.symbol && currentTop?.symbol && previousTop.symbol !== currentTop.symbol) {
    highlights.push(`Top signal changed from ${previousTop.symbol} to ${currentTop.symbol}.`);
  }

  if (typeof previousTop?.conviction === 'number' && typeof currentTop?.conviction === 'number') {
    const diff = Math.round(currentTop.conviction - previousTop.conviction);
    if (Math.abs(diff) >= 3) {
      const verb = diff > 0 ? 'improved' : 'cooled';
      highlights.push(`${currentTop.symbol} conviction ${verb} from ${previousTop.conviction}% to ${currentTop.conviction}%.`);
    }
  }

  if (previousTop?.signalLabel && currentTop?.signalLabel && previousTop.signalLabel !== currentTop.signalLabel) {
    highlights.push(`${currentTop.symbol} shifted from ${previousTop.signalLabel} to ${currentTop.signalLabel}.`);
  }

  if (previousSnapshot.regime && currentSnapshot.regime && previousSnapshot.regime !== currentSnapshot.regime) {
    highlights.push(`Market tone moved from ${previousSnapshot.regime} to ${currentSnapshot.regime}.`);
  }

  const previousWatchMap = new Map((previousSnapshot.watchlist || []).map((asset) => [asset.symbol, asset]));
  const currentWatchlist = currentSnapshot.watchlist || [];
  const deltas = currentWatchlist
    .map((asset) => {
      const previous = previousWatchMap.get(asset.symbol);
      const delta = previous ? Math.round(asset.conviction - previous.conviction) : 0;
      return { asset, previous, delta };
    })
    .filter((entry) => entry.previous);

  deltas
    .filter((entry) => entry.delta >= 4)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 2)
    .forEach((entry) => {
      improved.push(`${entry.asset.symbol} strengthened from ${entry.previous.conviction}% to ${entry.asset.conviction}%.`);
    });

  deltas
    .filter((entry) => entry.delta <= -4)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 2)
    .forEach((entry) => {
      weakened.push(`${entry.asset.symbol} softened from ${entry.previous.conviction}% to ${entry.asset.conviction}%.`);
    });

  deltas
    .filter((entry) => entry.previous?.signalLabel && entry.previous.signalLabel !== entry.asset.signalLabel)
    .slice(0, 2)
    .forEach((entry) => {
      const line = `${entry.asset.symbol} moved from ${entry.previous.signalLabel} to ${entry.asset.signalLabel}.`;
      if (!highlights.includes(line) && !improved.includes(line) && !weakened.includes(line)) {
        highlights.push(line);
      }
    });

  const strongestImprover = deltas
    .filter((entry) => entry.delta > 0)
    .sort((a, b) => b.delta - a.delta)[0];
  const biggestDrop = deltas
    .filter((entry) => entry.delta < 0)
    .sort((a, b) => a.delta - b.delta)[0];

  let takeaway = `Focus first on ${currentTop.symbol}: ${currentTop.signalLabel}.`;
  if (strongestImprover && biggestDrop) {
    takeaway = `${strongestImprover.asset.symbol} improved most since your last visit, while ${biggestDrop.asset.symbol} weakened and deserves caution tonight.`;
  } else if (strongestImprover) {
    takeaway = `${strongestImprover.asset.symbol} improved most since your last visit, so it deserves the first look tonight.`;
  } else if (biggestDrop) {
    takeaway = `${biggestDrop.asset.symbol} weakened most since your last visit, so treat rallies there with more caution tonight.`;
  } else if (previousTop?.symbol !== currentTop?.symbol) {
    takeaway = `Leadership changed from ${previousTop?.symbol || 'the prior leader'} to ${currentTop.symbol}, so re-anchor tonight around the new top signal.`;
  }

  const uniqueHighlights = Array.from(new Set(highlights)).slice(0, 3);

  return {
    highlights: uniqueHighlights.length ? uniqueHighlights : [`Top signal remains ${currentTop.symbol} at ${currentTop.conviction}%.`],
    improved,
    weakened,
    takeaway,
    changedCount: uniqueHighlights.length + improved.length + weakened.length,
  };
}



function buildDailyRitualStatus(lastVisitAt, marketUpdatedAt, topSignal, visitIntelligence) {
  const now = Date.now();
  const visitTs = lastVisitAt ? new Date(lastVisitAt).getTime() : null;
  const marketTs = marketUpdatedAt ? new Date(marketUpdatedAt).getTime() : null;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const visitedToday = Boolean(visitTs) && new Date(visitTs).toDateString() === today.toDateString();

  let streak = 1;
  try {
    if (typeof window !== 'undefined') {
      const stored = JSON.parse(window.localStorage.getItem('midnight-signal-daily-ritual') || 'null');
      if (stored?.dayKey === todayKey) {
        streak = stored.streak || 1;
      } else {
        const yesterday = new Date(now - 24 * 60 * 60 * 1000).toDateString();
        const nextStreak = stored?.lastDateString === yesterday ? (stored.streak || 1) + 1 : 1;
        window.localStorage.setItem('midnight-signal-daily-ritual', JSON.stringify({
          dayKey: todayKey,
          streak: nextStreak,
          lastDateString: today.toDateString(),
        }));
        streak = nextStreak;
      }
    }
  } catch {
    // no-op
  }

  const ageMinutes = marketTs ? Math.max(0, Math.round((now - marketTs) / 60000)) : null;
  const freshness = ageMinutes === null ? 'freshness unknown' : ageMinutes <= 2 ? 'signal refreshed just now' : `signal refreshed ${ageMinutes}m ago`;

  if (!visitedToday) {
    return {
      title: "Tonight's check-in is ready",
      detail: `${topSignal?.symbol || 'Your lead asset'} is waiting with ${topSignal?.signalLabel || 'a fresh signal posture'} and ${freshness}.`,
      badge: 'Check-in pending',
      streakLabel: `Streak ${streak} night${streak === 1 ? '' : 's'}`,
    };
  }

  return {
    title: "Tonight's check-in complete",
    detail: visitIntelligence?.takeaway || `${topSignal?.symbol || 'Your lead asset'} remains the focus tonight.`,
    badge: 'Checked in',
    streakLabel: `Streak ${streak} night${streak === 1 ? '' : 's'}`,
  };
}

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
  { symbol: 'SEI', name: 'Sei', conviction: 64, sentiment: 'bullish', story: 'Momentum is improving with better follow-through.' },
].slice(0, 15);

function buildMarketUniverse(liveItems = []) {
  const fallbackAssets = [...MARKET_FIXTURES, ...EXTRA_SCAN_ASSETS].slice(0, 20);
  const fallbackBySymbol = new Map(fallbackAssets.map((item, index) => [item.symbol, { ...item, fallbackRank: index + 1 }]));

  if (Array.isArray(liveItems) && liveItems.length) {
    return liveItems.slice(0, 20).map((item, index) => {
      const fallback = fallbackBySymbol.get(item.symbol) || {};
      return {
        ...fallback,
        ...item,
        rank: item.rank || fallback.fallbackRank || index + 1,
        conviction: fallback.conviction || item.signalScore || 50,
        live: true,
      };
    });
  }

  return fallbackAssets.map((asset, index) => ({
    ...asset,
    rank: asset.rank || index + 1,
    price: asset.price ?? null,
    change24h: asset.change24h ?? 0,
    volumeNum: asset.volumeNum ?? 0,
    marketCap: asset.marketCap ?? 0,
    lastUpdated: asset.lastUpdated ?? null,
    priceRange24h: asset.priceRange24h ?? 0,
    distanceFromHigh24h: asset.distanceFromHigh24h ?? -8,
    volumeToMarketCap: asset.volumeToMarketCap ?? 0,
    live: false,
  }));
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
    supabaseReady,
  } = useAccountSync();

  const [controlOpen, setControlOpen] = useState(false);
  const [learningOpen, setLearningOpen] = useState(false);
  const [detailAsset, setDetailAsset] = useState(null);
  const [learningAsset, setLearningAsset] = useState(null);
  const [alertAsset, setAlertAsset] = useState(null);
  const [upgradeNotice, setUpgradeNotice] = useState('');
  const [liveItems, setLiveItems] = useState([]);
  const [marketSource, setMarketSource] = useState('fallback');
  const [marketUpdatedAt, setMarketUpdatedAt] = useState(null);
  const [marketReady, setMarketReady] = useState(false);
  const [signalHistory, setSignalHistory] = useState([]);
  const [forwardValidation, setForwardValidation] = useState([]);
  const [adaptiveWeights, setAdaptiveWeights] = useState({});
  const [lastVisitAt, setLastVisitAt] = useState(null);
  const [previousSessionSnapshot, setPreviousSessionSnapshot] = useState(null);
  const [priorityAlerts, setPriorityAlerts] = useState([]);
  const [contextItems, setContextItems] = useState([]);
  const [contextMeta, setContextMeta] = useState({ live: false, sourceTypes: { article: 0, x: 0, note: 0 }, updatedAt: null });
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistStatus, setWaitlistStatus] = useState('');
  const entitlementRefreshRef = useRef(false);

  useEffect(() => {
    setSignalHistory(readSignalHistory());
    setForwardValidation(readForwardValidation());
    setAdaptiveWeights(readAdaptiveWeights());
  }, []);

  useEffect(() => {
    const localAlertMemory = readAlertMemory();
    const localDigestMemory = readDigestMemory();
    const cloudAlertMemory = state?.alertMemory || { assetMap: {}, triggerLog: {} };
    const cloudDigestMemory = state?.alertDigestMemory || { queued: [], lastSentAt: null };

    const localAlertStamp = Object.values(localAlertMemory?.triggerLog || {}).sort().slice(-1)[0] || null;
    const cloudAlertStamp = Object.values(cloudAlertMemory?.triggerLog || {}).sort().slice(-1)[0] || null;
    const localDigestStamp = localDigestMemory?.lastSentAt || null;
    const cloudDigestStamp = cloudDigestMemory?.lastSentAt || null;

    const preferCloudAlerts = cloudAlertStamp && (!localAlertStamp || new Date(cloudAlertStamp).getTime() >= new Date(localAlertStamp).getTime());
    const preferCloudDigest = cloudDigestStamp && (!localDigestStamp || new Date(cloudDigestStamp).getTime() >= new Date(localDigestStamp).getTime());

    if (preferCloudAlerts) {
      writeAlertMemory(cloudAlertMemory);
    } else if (user && JSON.stringify(localAlertMemory) !== JSON.stringify(cloudAlertMemory)) {
      setState((previous) => ({ ...previous, alertMemory: localAlertMemory }));
    }

    if (preferCloudDigest) {
      writeDigestMemory(cloudDigestMemory);
    } else if (user && JSON.stringify(localDigestMemory) !== JSON.stringify(cloudDigestMemory)) {
      setState((previous) => ({ ...previous, alertDigestMemory: localDigestMemory }));
    }
  }, [setState, state?.alertDigestMemory, state?.alertMemory, user]);

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
          setMarketUpdatedAt(data.updatedAt || new Date().toISOString());
        } else {
          setLiveItems([]);
          setMarketSource(data?.source || 'fallback');
        }
      } catch {
        if (cancelled) return;
        setLiveItems([]);
        setMarketSource('fallback');
      } finally {
        if (!cancelled) {
          setMarketUpdatedAt(new Date().toISOString());
          setMarketReady(true);
        }
      }
    }

    loadMarket();
    const timer = window.setInterval(loadMarket, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const url = new URL(window.location.href);
      const checkout = url.searchParams.get('checkout');
      const billing = url.searchParams.get('billing');
      const billingReturn = url.searchParams.get('billing_return');

      if (checkout === 'canceled') {
        setUpgradeNotice('Checkout canceled — Basic access remains active.');
        url.searchParams.delete('checkout');
        window.history.replaceState({}, '', url.toString());
      } else if (billing === 'unavailable') {
        setUpgradeNotice('Stripe checkout is not configured yet. Pro stays locked until billing is live.');
        url.searchParams.delete('billing');
        window.history.replaceState({}, '', url.toString());
      } else if (billingReturn === 'portal') {
        setUpgradeNotice('Returned from Stripe billing portal. You can refresh billing status in Control Panel if anything changed.');
        url.searchParams.delete('billing_return');
        window.history.replaceState({}, '', url.toString());
      }
    } catch {
      // no-op
    }
  }, []);


  useEffect(() => {
    if (entitlementRefreshRef.current) return;
    if (!state?.entitlement || !shouldRefreshEntitlement(state.entitlement)) return;

    entitlementRefreshRef.current = true;

    async function refreshEntitlement() {
      try {
        const response = await fetch('/api/stripe/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entitlement: state.entitlement }),
        });
        const data = await response.json().catch(() => ({}));
        if (data?.ok && data?.entitlement) {
          setState((previous) => ({
            ...previous,
            entitlement: data.entitlement,
            planTier: data.entitlement?.verified ? 'pro' : 'basic',
          }));
        }
      } catch {
        // no-op
      } finally {
        entitlementRefreshRef.current = false;
      }
    }

    void refreshEntitlement();
  }, [setState, state?.entitlement]);

  const rankedAssets = useMemo(
    () => rankAssets(buildMarketUniverse(liveItems), adaptiveWeights),
    [liveItems, adaptiveWeights]
  );

  const topSignal = useMemo(
    () => rankedAssets[0] || MARKET_FIXTURES[0],
    [rankedAssets]
  );

useEffect(() => {
  if (typeof window === 'undefined' || !topSignal?.symbol) return;

  let cancelled = false;

  async function loadContextFeed() {
    try {
      const params = new URLSearchParams({
        symbol: topSignal.symbol,
        watchlist: Array.isArray(state?.watchlist) ? state.watchlist.join(',') : '',
      });
      const response = await fetch(`/api/context/ingest?${params.toString()}`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (cancelled) return;

      if (data?.ok) {
        setContextItems(Array.isArray(data.items) ? data.items : []);
        setContextMeta({
          live: Boolean(data?.meta?.live),
          sourceTypes: data?.meta?.sourceTypes || { article: 0, x: 0, note: 0 },
          updatedAt: data?.updatedAt || null,
        });
      } else {
        setContextItems([]);
        setContextMeta({ live: false, sourceTypes: { article: 0, x: 0, note: 0 }, updatedAt: null });
      }
    } catch {
      if (!cancelled) {
        setContextItems([]);
        setContextMeta({ live: false, sourceTypes: { article: 0, x: 0, note: 0 }, updatedAt: null });
      }
    }
  }

  loadContextFeed();
  const timer = window.setInterval(loadContextFeed, 90000);

  return () => {
    cancelled = true;
    window.clearInterval(timer);
  };
}, [topSignal?.symbol, state?.watchlist]);

  const selected = useMemo(
    () => rankedAssets.find((item) => item.symbol === state.selectedAsset) || topSignal,
    [rankedAssets, state.selectedAsset, topSignal]
  );

  const previousSignalEntry = useMemo(
    () => signalHistory[1] || null,
    [signalHistory]
  );

  const decisionLayer = useMemo(
    () => buildDecisionLayer(topSignal, previousSignalEntry),
    [topSignal, previousSignalEntry]
  );

  const regimeSummary = useMemo(
    () => detectMarketRegime(rankedAssets),
    [rankedAssets]
  );

  const forwardScorecard = useMemo(
    () => buildForwardScorecard(forwardValidation),
    [forwardValidation]
  );

  const adaptiveSummary = useMemo(
    () => buildAdaptiveSummary(adaptiveWeights),
    [adaptiveWeights]
  );

  const validationSummary = useMemo(
    () => buildValidationSummary(signalHistory),
    [signalHistory]
  );

  const watchlistHighlights = useMemo(() => {
    const watchSymbols = Array.isArray(state?.watchlist) ? state.watchlist : [];
    return rankedAssets
      .filter((item) => watchSymbols.includes(item.symbol))
      .sort((a, b) => Math.abs(b.change24h || 0) - Math.abs(a.change24h || 0))
      .slice(0, 2);
  }, [rankedAssets, state?.watchlist]);


const currentSessionSnapshot = useMemo(
  () => createSessionSnapshot({
    topSignal,
    rankedAssets,
    watchlist: state?.watchlist || [],
    regimeSummary,
    marketUpdatedAt,
  }),
  [topSignal, rankedAssets, state?.watchlist, regimeSummary, marketUpdatedAt]
);

const visitIntelligence = useMemo(
  () => buildVisitIntelligence(previousSessionSnapshot, currentSessionSnapshot),
  [previousSessionSnapshot, currentSessionSnapshot]
);


const sinceLastVisitSummary = useMemo(() => {
  const fallbackBits = [];
  const previous = previousSignalEntry;

  if (previous?.symbol && previous.symbol !== topSignal?.symbol) {
    fallbackBits.push(`Top signal flipped from ${previous.symbol} to ${topSignal.symbol}`);
  } else if (typeof previous?.conviction === 'number' && typeof topSignal?.conviction === 'number') {
    const delta = Math.round(topSignal.conviction - previous.conviction);
    if (delta > 0) fallbackBits.push(`${topSignal.symbol} conviction is up ${delta} pts`);
    else if (delta < 0) fallbackBits.push(`${topSignal.symbol} conviction cooled ${Math.abs(delta)} pts`);
  }

  if (watchlistHighlights[0]) {
    const mover = watchlistHighlights[0];
    const direction = (mover.change24h || 0) >= 0 ? 'up' : 'down';
    fallbackBits.push(`Watchlist: ${mover.symbol} ${direction} ${Math.abs(mover.change24h || 0).toFixed(1)}%`);
  }

  if (regimeSummary?.regime) {
    fallbackBits.push(`Market tone: ${String(regimeSummary.regime).replace(/-/g, ' ')}`);
  }

  return visitIntelligence.highlights?.length
    ? visitIntelligence.highlights
    : fallbackBits.length
      ? fallbackBits.slice(0, 3)
      : [`Top signal remains ${topSignal?.symbol || 'the same'} with ${topSignal?.conviction ?? '--'}% conviction`];
}, [previousSignalEntry, topSignal, watchlistHighlights, regimeSummary, visitIntelligence]);


  const lastVisitLabel = useMemo(() => {
    if (!lastVisitAt) return 'First visit on this device';
    const diffMs = Date.now() - new Date(lastVisitAt).getTime();
    if (!Number.isFinite(diffMs) || diffMs < 0) return 'Welcome back';
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Back within the hour';
    if (diffHours < 24) return `Back after ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Back after ${diffDays}d`;
  }, [lastVisitAt]);


  const recentAlertEvents = useMemo(() => Array.isArray(state?.recentAlertEvents) ? state.recentAlertEvents.slice(0, 5) : [], [state?.recentAlertEvents]);

  const newAlertCountSinceVisit = useMemo(() => {
    const visitTs = lastVisitAt ? new Date(lastVisitAt).getTime() : 0;
    return (state?.recentAlertEvents || []).filter((alert) => {
      const ts = alert?.triggeredAt ? new Date(alert.triggeredAt).getTime() : 0;
      return ts && ts >= visitTs;
    }).length;
  }, [state?.recentAlertEvents, lastVisitAt]);

  const recentAlertSymbols = useMemo(() => Array.from(new Set((state?.recentAlertEvents || []).map((alert) => alert?.symbol).filter(Boolean))).slice(0, 12), [state?.recentAlertEvents]);

  const alertSummary = useMemo(() => ({
    title: newAlertCountSinceVisit ? `${newAlertCountSinceVisit} important change${newAlertCountSinceVisit === 1 ? '' : 's'} since your last check` : 'Alert loop armed for tonight',
    detail: newAlertCountSinceVisit
      ? 'Watchlist assets and major signal shifts are being tracked so return visits feel instantly useful.'
      : 'Signal changes will stack here as assets strengthen, weaken, or flip posture.',
    badge: newAlertCountSinceVisit ? `${newAlertCountSinceVisit} new alerts` : 'Monitoring live',
    watchlistLabel: `${state?.watchlist?.length || 0} watchlist names tracked`,
  }), [newAlertCountSinceVisit, state?.watchlist]);


  useEffect(() => {
    if (!topSignal || !marketReady || typeof window === 'undefined') return;

    let cancelled = false;

    async function runAlertEngine() {
      try {
        const memory = state?.alertMemory || readAlertMemory();
        const previousMap = memory?.assetMap || {};
        const currentMap = buildAssetSnapshotMap(rankedAssets);
        const previousRegime = window.localStorage.getItem('midnight-signal-last-regime');
        const dismissed = JSON.parse(window.localStorage.getItem('midnight-signal-dismissed-alerts') || '[]');

        const systemAlerts = buildSystemAlerts({
          previousTopSignal: JSON.parse(window.localStorage.getItem('midnight-signal-last-top-signal') || 'null'),
          topSignal,
          previousRegime,
          regimeSummary,
          watchlistHighlights,
        });

        const configured = evaluateConfiguredAlerts(state?.alerts || [], previousMap, currentMap, {
          triggerLog: memory?.triggerLog || {},
          cooldownMinutes: Number(state?.alertCooldownMinutes || 30),
        });

        const meaningfulAlerts = buildMeaningfulChangeAlerts(previousMap, currentMap, state?.watchlist || []);

        const allAlerts = [...configured.events, ...meaningfulAlerts, ...systemAlerts]
          .filter((item) => !dismissed.includes(item.id))
          .sort((a, b) => b.priority - a.priority);

        if (!cancelled) {
          setPriorityAlerts(allAlerts.slice(0, 4));
        }

        if (allAlerts.length) {
          const recent = [
            ...allAlerts,
            ...(state?.recentAlertEvents || []),
          ].filter(Boolean).filter((alert, index, array) => array.findIndex((item) => item?.id === alert?.id) === index).slice(0, 12);
          setState((previous) => ({ ...previous, recentAlertEvents: recent }));

          if (state?.signalSoundsEnabled && typeof window !== 'undefined' && window.AudioContext) {
            try {
              const context = new window.AudioContext();
              const oscillator = context.createOscillator();
              const gain = context.createGain();
              oscillator.type = 'sine';
              oscillator.frequency.value = 880;
              gain.gain.value = 0.03;
              oscillator.connect(gain);
              gain.connect(context.destination);
              oscillator.start();
              oscillator.stop(context.currentTime + 0.12);
            } catch {}
          }

          if (state?.alertDeliveryEnabled && state?.alertDeliveryEmail) {
            try {
              const digestMode = state.alertDigestMode || 'instant';
              const emailMemory = state?.alertEmailDeliveryMemory || readEmailDeliveryMemory();
              const deliverable = selectDeliverableAlerts(
                [...configured.events, ...meaningfulAlerts, ...systemAlerts],
                {
                  scope: state?.alertDeliveryScope || 'watchlist',
                  memory: emailMemory,
                  cooldownMinutes: digestMode === 'digest'
                    ? Number(state?.alertDigestIntervalMinutes || 240)
                    : Math.max(Number(state?.alertCooldownMinutes || 30), 180),
                }
              );

              let payloadAlerts = deliverable.alerts;
              let shouldSend = Boolean(payloadAlerts.length);

              if (digestMode === 'digest') {
                const queuedDigestMemory = queueDigestEvents(payloadAlerts);
                setState((previous) => ({ ...previous, alertDigestMemory: queuedDigestMemory }));
                const digest = consumeQueuedDigestEvents(Number(state?.alertDigestIntervalMinutes || 240));
                writeDigestMemory(digest.memory);
                setState((previous) => ({ ...previous, alertDigestMemory: digest.memory }));
                shouldSend = digest.shouldSend;
                payloadAlerts = digest.alerts;
              }

              if (shouldSend && payloadAlerts.length) {
                const response = await fetch('/api/alerts/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: state.alertDeliveryEmail,
                    alerts: payloadAlerts,
                    digestMode,
                  }),
                });
                const data = await response.json().catch(() => ({}));
                const sentAt = data?.sentAt || new Date().toISOString();
                const nextEmailMemory = data?.ok
                  ? recordEmailDelivery(deliverable.memory, payloadAlerts, { sentAt, mode: data?.mode || 'live' })
                  : deliverable.memory;
                writeEmailDeliveryMemory(nextEmailMemory);
                if (data?.ok) {
                  const sentIds = new Set(payloadAlerts.map((item) => item.id));
                  setPriorityAlerts((previous) => previous.map((item) => (
                    sentIds.has(item.id) ? { ...item, emailedAt: sentAt } : item
                  )));
                }
                setState((previous) => ({
                  ...previous,
                  alertEmailDeliveryMemory: nextEmailMemory,
                  recentEmailDeliveries: nextEmailMemory.recent || [],
                  alertLastDeliveryAt: sentAt,
                  alertLastDeliveryStatus: data?.ok
                    ? data?.mode === 'mock'
                      ? 'Delivery route ready in mock mode'
                      : digestMode === 'digest'
                        ? 'Digest sent'
                        : 'Instant alert sent'
                    : data?.message || 'Delivery failed',
                }));
              } else {
                writeEmailDeliveryMemory(deliverable.memory);
                setState((previous) => ({
                  ...previous,
                  alertEmailDeliveryMemory: deliverable.memory,
                }));
              }
            } catch (error) {
              setState((previous) => ({
                ...previous,
                alertLastDeliveryStatus: error?.message || 'Delivery failed',
              }));
            }
          }
        }

        const nextAlertMemory = { assetMap: currentMap, triggerLog: configured.triggerLog };
        writeAlertMemory(nextAlertMemory);
        if (JSON.stringify(state?.alertMemory || {}) !== JSON.stringify(nextAlertMemory)) {
          setState((previous) => ({ ...previous, alertMemory: nextAlertMemory }));
        }
        window.localStorage.setItem(
          'midnight-signal-last-top-signal',
          JSON.stringify({ symbol: topSignal.symbol, conviction: topSignal.conviction })
        );
        if (regimeSummary?.regime) {
          window.localStorage.setItem('midnight-signal-last-regime', regimeSummary.regime);
        }
      } catch {
        if (!cancelled) setPriorityAlerts([]);
      }
    }

    void runAlertEngine();
    return () => {
      cancelled = true;
    };
  }, [topSignal, watchlistHighlights, regimeSummary, rankedAssets, state?.watchlist, marketReady, state?.alerts, state?.alertCooldownMinutes, state?.alertDeliveryEnabled, state?.alertDeliveryEmail, state?.alertDigestMode, state?.alertDigestIntervalMinutes, state?.signalSoundsEnabled, setState]);

  useEffect(() => {
    if (!topSignal || !marketReady) return;
    const next = appendSignalSnapshot(buildSignalSnapshot(topSignal, marketSource));
    setSignalHistory(next);
  }, [topSignal, marketSource, marketReady]);

  useEffect(() => {
    if (!topSignal || !marketReady) return;

    setForwardValidation((previous) => {
      const seeded = upsertForwardSignal(previous, topSignal, regimeSummary?.regime, marketSource);
      const updated = updateForwardCheckpoints(seeded, liveItems);
      writeForwardValidation(updated);

      const nextAdaptive = deriveAdaptiveWeights(updated);
      writeAdaptiveWeights(nextAdaptive);
      setAdaptiveWeights(nextAdaptive);

      return updated;
    });
  }, [topSignal, regimeSummary, marketSource, marketReady, liveItems]);


  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setLastVisitAt(window.localStorage.getItem('midnight-signal-last-visit-at'));
    } catch {
      setLastVisitAt(null);
    }
  }, []);

  useEffect(() => {
    if (!marketReady || typeof window === 'undefined' || !currentSessionSnapshot) return;
    try {
      const stamp = new Date().toISOString();
      window.localStorage.setItem('midnight-signal-last-visit-at', stamp);
      window.localStorage.setItem(SESSION_SNAPSHOT_KEY, JSON.stringify({
        ...currentSessionSnapshot,
        capturedAt: stamp,
      }));
    } catch {
      // no-op
    }
  }, [marketReady, currentSessionSnapshot, topSignal?.symbol, topSignal?.conviction]);


  function dismissPriorityAlert(alertId) {
    setPriorityAlerts((previous) => previous.filter((item) => item.id !== alertId));
    if (typeof window === 'undefined') return;
    try {
      const dismissed = JSON.parse(window.localStorage.getItem('midnight-signal-dismissed-alerts') || '[]');
      const next = Array.from(new Set([...dismissed, alertId])).slice(-20);
      window.localStorage.setItem('midnight-signal-dismissed-alerts', JSON.stringify(next));
    } catch {
      // no-op
    }
  }

  function openAlertAsset(symbol) {
    const asset = rankedAssets.find((item) => item.symbol === symbol);
    if (!asset) return;
    setDetailAsset(asset);
    if (typeof document !== 'undefined') {
      document.getElementById('market-scan')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function toggleWatchlist(symbol) {
    setState((previous) => ({
      ...previous,
      watchlist: previous.watchlist.includes(symbol)
        ? previous.watchlist.filter((item) => item !== symbol)
        : [...previous.watchlist, symbol],
    }));
  }

  async function handleEarlyAccessSignup(event) {
    event?.preventDefault?.();
    const email = String(waitlistEmail || '').trim();
    if (!email) {
      setWaitlistStatus("Enter an email to get tonight's signal by email.");
      return;
    }

    try {
      const result = await signInWithEmail(email);
      if (result?.error) {
        setWaitlistStatus(result.error.message || 'Could not start email sign-in.');
        return;
      }
      setWaitlistStatus('Check your inbox for the magic link — early access is now tied to your email.');
      setWaitlistEmail('');
    } catch (error) {
      setWaitlistStatus(error?.message || 'Could not start email sign-in.');
    }
  }

  function jumpTo(id) {
    if (typeof document === 'undefined') return;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const signalContext = useMemo(() => buildSignalContext(topSignal, rankedAssets, state.watchlist, regimeSummary, { items: contextItems, meta: contextMeta }), [topSignal, rankedAssets, state.watchlist, regimeSummary, contextItems, contextMeta]);
  const ritualStatus = useMemo(() => buildDailyRitualStatus(lastVisitAt, marketUpdatedAt, topSignal, visitIntelligence), [lastVisitAt, marketUpdatedAt, topSignal, visitIntelligence]);

  return (
    <main className="page">
      <div className="shell">
        <TopNav
          state={state}
          user={user}
          status={status}
          onJump={jumpTo}
          onOpenControls={() => {
            setAlertAsset(null);
            setControlOpen(true);
          }}
          onOpenLearning={() => {
            setLearningAsset(null);
            setLearningOpen(true);
          }}
        />


        {priorityAlerts.length ? (
          <section className="priority-alert-stack" aria-label="Signal alerts">
            {priorityAlerts.map((alert) => (
              <div key={alert.id} className={`priority-alert priority-alert--${alert.level}`}>
                <div className="priority-alert-copy">
                  <div className="priority-alert-title">{alert.title}</div>
                  <div className="priority-alert-body">{alert.body}</div>
                </div>
                <div className="priority-alert-actions">
                  {alert.symbol ? (
                    <button
                      type="button"
                      className="ghost-button small"
                      onClick={() => openAlertAsset(alert.symbol)}
                    >
                      Open
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="ghost-button small"
                    onClick={() => dismissPriorityAlert(alert.id)}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </section>
        ) : null}

        <HeroSection
          selected={topSignal}
          user={user}
          status={status}
          lastSyncedAt={lastSyncedAt}
          watchlistCount={state.watchlist.length}
          syncing={syncing}
          state={state}
          ritualStatus={ritualStatus}
          alertSummary={alertSummary}
          onOpenControls={() => {
            setAlertAsset(null);
            setControlOpen(true);
          }}
        />

        <AlertCenterPanel
          alerts={recentAlertEvents}
          newCount={newAlertCountSinceVisit}
          lastVisitLabel={lastVisitLabel}
          onOpenAsset={openAlertAsset}
          onDismissAll={() => setState((previous) => ({ ...previous, recentAlertEvents: [] }))}
        />

        <section className="landing-command card" aria-label="Midnight Signal landing message">
          <div className="landing-command-copy">
            <div className="eyebrow">What&apos;s the signal tonight?</div>
            <h2 className="section-title">Transforming market noise into market wisdom</h2>
            <p className="muted small">Midnight Signal helps non-experts read posture, confidence, and catalysts fast. Free gets the nightly read. Pro unlocks the deeper board, retention loop, and alert engine.</p>
            <div className="landing-command-actions">
              <button type="button" className="primary-button" onClick={() => jumpTo('market-scan')}>Enter Tonight&apos;s Signal 🌙</button>
              <button type="button" className="ghost-button" onClick={() => setControlOpen(true)}>Get Early Access</button>
            </div>
          </div>
          <div className="landing-command-panel">
            <div className="landing-mini-card">
              <div className="landing-mini-label">Tonight&apos;s preview</div>
              <div className="landing-mini-symbol">{topSignal?.symbol || '--'} <span>{Math.round(topSignal?.conviction || 0)}%</span></div>
              <div className="landing-mini-copy">{safeRenderText(decisionLayer?.statusLabel || topSignal?.signalLabel, 'Top signal ready')} • {safeRenderText(signalContext?.marketContext, 'Context loading')}</div>
            </div>
            <div className="landing-mini-grid">
              <div className="landing-mini-stat"><span>Context</span><strong>{safeRenderText(signalContext?.catalystTitle, 'Catalyst watch armed')}</strong></div>
              <div className="landing-mini-stat"><span>Alerts</span><strong>{alertSummary.badge}</strong></div>
              <div className="landing-mini-stat"><span>Board</span><strong>{state.planTier === 'pro' ? 'Full board unlocked' : 'Preview + upgrade path'}</strong></div>
            </div>
          </div>
        </section>

        <section className="product-preview-grid" aria-label="Product preview and plans">
          <div className="product-preview card">
            <div className="preview-head">
              <div>
                <div className="eyebrow">Product preview</div>
                <h3 className="section-title">See the product before you commit</h3>
              </div>
              <span className="badge preview-badge">Live nightly flow</span>
            </div>
            <div className="preview-stack">
              <div className="preview-panel">
                <div className="preview-panel-label">Tonight&apos;s Top Signal</div>
                <div className="preview-panel-title">{topSignal?.symbol || '--'} • {topSignal?.signalLabel || 'Mixed posture'}</div>
                <div className="preview-meter-row">
                  <div className="preview-meter"><span style={{ width: `${Math.max(12, Math.min(100, Math.round(topSignal?.conviction || 0)))}%` }} /></div>
                  <div className="muted small">Confidence {Math.round(topSignal?.conviction || 0)}%</div>
                </div>
              </div>
              <div className="preview-three-up">
                <div className="preview-subcard">
                  <div className="preview-sub-label">Why now</div>
                  <div className="preview-sub-copy">{safeRenderText(signalContext?.whyThisIsHappening?.[0], 'Momentum, trend, and volatility are fused into one plain-English read.')}</div>
                </div>
                <div className="preview-subcard">
                  <div className="preview-sub-label">Catalyst</div>
                  <div className="preview-sub-copy">{safeRenderText(signalContext?.catalystSummary, 'Possible catalyst matching now sits next to the signal instead of in a noisy feed.')}</div>
                </div>
                <div className="preview-subcard">
                  <div className="preview-sub-label">What changes next</div>
                  <div className="preview-sub-copy">{visitIntelligence?.takeaway || 'Return visits highlight what changed, what improved, and what needs caution.'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="plan-ladder card">
            <div className="eyebrow">Free vs Pro</div>
            <h3 className="section-title">A clean value ladder</h3>
            <div className="plan-columns">
              <div className="plan-card">
                <div className="plan-title">Free</div>
                <div className="plan-price">Useful nightly read</div>
                <ul className="plan-list">
                  <li>Tonight&apos;s Top Signal</li>
                  <li>Board preview</li>
                  <li>Basic context and catalyst hints</li>
                  <li>Clean educational read</li>
                </ul>
              </div>
              <div className="plan-card plan-card--pro">
                <div className="plan-title">Pro</div>
                <div className="plan-price">Full Midnight Signal depth</div>
                <ul className="plan-list">
                  <li>Full signal board</li>
                  <li>Watchlist persistence</li>
                  <li>Email alerts and deeper revisit flow</li>
                  <li>Full catalyst and context fusion</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="conversion-strip card" aria-label="Why Midnight Signal">
          <div className="conversion-intro">
            <div className="eyebrow">Why Midnight Signal</div>
            <h2 className="section-title">A clearer path from market noise to market wisdom</h2>
            <p className="muted small">Midnight Signal is designed to teach what the signal means, show why it appears, and let users stay useful on Free before deciding whether Pro depth is worth it.</p>
          </div>
          <div className="conversion-grid">
            <div className="conversion-card">
              <div className="conversion-card-title">Learn first</div>
              <p className="muted small">Tonight’s Top Signal and the board are built to explain posture in plain language, not just throw numbers around.</p>
            </div>
            <div className="conversion-card">
              <div className="conversion-card-title">Trust the setup</div>
              <p className="muted small">Disclaimer-first onboarding, optional cloud sync, and verified billing flow keep the experience more trustworthy.</p>
            </div>
            <div className="conversion-card">
              <div className="conversion-card-title">Upgrade only if it fits</div>
              <p className="muted small">Free covers the read, scan, and watchlist flow. Pro adds validation, forward tracking, and deeper breakdowns.</p>
            </div>
          </div>
        </section>

        <section className="brand-story-grid" aria-label="Brand trust and email capture">
          <div className="brand-story card">
            <div className="eyebrow">From data to wisdom</div>
            <h3 className="section-title">A signal journey people can actually follow</h3>
            <div className="wisdom-path">
              {['Data', 'Information', 'Knowledge', 'Understanding', 'Wisdom'].map((item) => (
                <span key={item} className="wisdom-step">{item}</span>
              ))}
            </div>
            <p className="muted small">That&apos;s the Midnight Signal promise: don&apos;t just dump numbers on the screen — help people move from noise to an understandable posture, then to a smarter next step.</p>
            <div className="trust-note">Educational tool only. Midnight Signal is built for guidance, learning, and market orientation — not financial advice.</div>
          </div>

          <form className="email-capture card" onSubmit={handleEarlyAccessSignup}>
            <div className="eyebrow">Get tonight&apos;s signal by email</div>
            <h3 className="section-title">Start with a lightweight early-access entry</h3>
            <p className="muted small">Use your email to unlock the magic-link flow, save your profile, and start the nightly habit loop.</p>
            <label className="capture-label" htmlFor="early-access-email">Email</label>
            <input
              id="early-access-email"
              type="email"
              className="capture-input"
              placeholder="you@example.com"
              value={waitlistEmail}
              onChange={(event) => setWaitlistEmail(event.target.value)}
            />
            <div className="capture-actions">
              <button type="submit" className="primary-button">Get Early Access</button>
              <button type="button" className="ghost-button" onClick={() => jumpTo('since-last-visit')}>See the retention loop</button>
            </div>
            <div className="capture-status muted small">{waitlistStatus || 'We use your email for magic-link access and account-based signal memory.'}</div>
          </form>
        </section>


        <section className="top-grid lead-flow-grid">
          <LeadSignalPanel
            asset={topSignal}
            state={state}
            setState={setState}
            marketSource={marketSource}
            marketUpdatedAt={marketUpdatedAt}
            marketReady={marketReady}
            signalHistory={signalHistory}
            validationSummary={validationSummary}
            regimeSummary={regimeSummary}
            forwardValidation={forwardValidation}
            forwardScorecard={forwardScorecard}
            adaptiveSummary={adaptiveSummary}
            decisionLayer={decisionLayer}
          />
        </section>

        <SignalContextPanel
          context={signalContext}
          asset={topSignal}
          planTier={state.planTier}
        />

        <section className="since-panel card" id="since-last-visit">
          <div className="since-panel-head">
            <div>
              <div className="eyebrow">Return signal</div>
              <h2 className="section-title">Since your last visit</h2>
            </div>
            <span className="badge since-badge">{lastVisitLabel}</span>
          </div>

          <div className="since-chip-row">
            {sinceLastVisitSummary.map((item) => (
              <div key={item} className="since-chip">{item}</div>
            ))}
          </div>

          <div className="since-intel-grid">
            <div className="since-intel-card">
              <div className="since-intel-label">Important alerts</div>
              <div className="since-intel-list">
                {recentAlertEvents.length ? recentAlertEvents.slice(0, 3).map((item) => (
                  <div key={item.id} className="since-intel-item">{item.symbol ? `${item.symbol}: ` : ''}{item.body || item.text}</div>
                )) : <div className="since-intel-item muted">No important alerts since your last visit.</div>}
              </div>
            </div>
            <div className="since-intel-card">
              <div className="since-intel-label">What changed</div>
              <div className="since-intel-list">
                {visitIntelligence.highlights.map((item) => (
                  <div key={item} className="since-intel-item">{item}</div>
                ))}
              </div>
            </div>

            <div className="since-intel-card">
              <div className="since-intel-label">What improved</div>
              <div className="since-intel-list">
                {visitIntelligence.improved.length ? visitIntelligence.improved.map((item) => (
                  <div key={item} className="since-intel-item">{item}</div>
                )) : <div className="since-intel-item muted">No major strengthening moves yet.</div>}
              </div>
            </div>

            <div className="since-intel-card">
              <div className="since-intel-label">What weakened</div>
              <div className="since-intel-list">
                {visitIntelligence.weakened.length ? visitIntelligence.weakened.map((item) => (
                  <div key={item} className="since-intel-item">{item}</div>
                )) : <div className="since-intel-item muted">No major weakening moves yet.</div>}
              </div>
            </div>
          </div>

          <div className="since-takeaway">
            <div className="since-intel-label">Tonight&apos;s takeaway</div>
            <div className="since-takeaway-copy">{visitIntelligence.takeaway}</div>
          </div>
        </section>

        <section className="market-grid market-grid-single" id="market-scan">
          <div className="market-scan-header">
            <div>
              <div className="eyebrow">Next up</div>
              <h2 className="section-title">Tonight&apos;s Board</h2>
            </div>
            <div className="muted small">
              Scan the live field, open a name, and save favorites from the board.
            </div>
          </div>

          <WatchlistPanel
            state={state}
            setState={setState}
            onAssetOpen={setDetailAsset}
            assets={rankedAssets}
            recentAlertSymbols={recentAlertSymbols}
          />

          <Top20Grid
            state={state}
            setState={setState}
            onAssetOpen={setDetailAsset}
            assets={rankedAssets}
            recentAlertSymbols={recentAlertSymbols}
          />
        </section>

        {upgradeNotice ? (
          <div className="upgrade-notice-banner">
            <span>{upgradeNotice}</span>
            <button
              type="button"
              className="ghost-button small"
              onClick={() => setUpgradeNotice('')}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <div className="footer-note">
          Build v11.68 · Mobile pass + production cleanup · source: {marketSource} · updated {marketUpdatedAt ? new Date(marketUpdatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'pending'}
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