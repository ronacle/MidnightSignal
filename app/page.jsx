'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import TopNav from '@/components/layout/TopNav';
import HeroSection from '@/components/layout/HeroSection';
import Top20Grid from '@/components/signals/Top20Grid';
import LeadSignalPanel from '@/components/signals/LeadSignalPanel';
import SignalContextPanel from '@/components/signals/SignalContextPanel';
import ControlDrawer from '@/components/panels/ControlDrawer';
import LearningDrawer from '@/components/panels/LearningDrawer';
import AlertCenterScaffold from '@/components/panels/AlertCenterScaffold';
import TrustDashboardPanel from '@/components/panels/TrustDashboardPanel';
import AssetDetailSheet from '@/components/panels/AssetDetailSheet';
import WatchlistPanel from '@/components/WatchlistPanel';
import DisclaimerModal from '@/components/modals/DisclaimerModal';
import OnboardingModal from '@/components/modals/OnboardingModal';
import { MARKET_FIXTURES } from '@/lib/default-state';
import { useAccountSync } from '@/hooks/useAccountSync';
import { shouldRefreshEntitlement } from '@/lib/entitlements';
import { rankAssets, buildSignalSnapshot, detectMarketRegime } from '@/lib/signal-engine';
import { appendSignalSnapshot, buildValidationSummary, readSignalHistory } from '@/lib/signal-history';
import { buildSignalContext } from '@/lib/news-context';
import { getConvictionComparison, getConvictionPointLabel } from '@/lib/conviction-intelligence';
import { applyModePreset, deriveExperienceProfile, normalizeIntent, normalizeUserType } from '@/lib/mode-engine';
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
  evaluateConfiguredAlerts,
  readAlertMemory,
  writeAlertMemory,
  readDigestMemory,
  writeDigestMemory,
  queueDigestEvents,
  consumeQueuedDigestEvents,
} from '@/lib/alert-engine';


const SESSION_SNAPSHOT_KEY = 'midnight-signal-session-snapshot-v2';
const COLLAPSIBLE_PANELS_KEY = 'midnight-signal-collapsible-panels-v2';
const DEFAULT_PANEL_STATE = { sinceLastVisit: true, marketScan: true, signalContext: false };

function getSessionSnapshotStorageKey(state = {}) {
  const timeframe = String(state?.timeframe || '1H').toUpperCase();
  const strategy = String(state?.strategy || 'swing').toLowerCase();
  const mode = String(state?.mode || 'beginner').toLowerCase();
  return `${SESSION_SNAPSHOT_KEY}-${timeframe}-${strategy}-${mode}`;
}

function getLastVisitStorageKey(state = {}) {
  const timeframe = String(state?.timeframe || '1H').toUpperCase();
  const strategy = String(state?.strategy || 'swing').toLowerCase();
  const mode = String(state?.mode || 'beginner').toLowerCase();
  return `midnight-signal-last-visit-at-${timeframe}-${strategy}-${mode}`;
}

function normalizeSignalLabel(label = '') {
  return String(label || '')
    .replace(/\s+/g, ' ')
    .trim() || 'Mixed posture';
}

function getSessionConvictionSnapshot(snapshot = null, asset = null) {
  if (!asset) return { symbol: '', conviction: null, capturedAt: snapshot?.capturedAt || null };
  const watchAsset = (snapshot?.watchlist || []).find((item) => item.symbol === asset.symbol);
  const matched = snapshot?.topSignal?.symbol === asset.symbol
    ? snapshot.topSignal
    : snapshot?.focusedAsset?.symbol === asset.symbol
      ? snapshot.focusedAsset
      : watchAsset || null;

  return {
    symbol: asset.symbol,
    conviction: Number(matched?.conviction),
    capturedAt: snapshot?.capturedAt || null,
  };
}

function createSessionSnapshot({ topSignal, rankedAssets = [], watchlist = [], selectedAsset = 'BTC', regimeSummary, marketUpdatedAt }) {
  const watchSymbols = Array.isArray(watchlist) ? watchlist.map((item) => String(item).toUpperCase()) : [];
  const watchAssets = rankedAssets.filter((item) => watchSymbols.includes(item.symbol));
  const selectedSymbol = String(selectedAsset || topSignal?.symbol || 'BTC').toUpperCase();
  const focusedAsset = rankedAssets.find((item) => item.symbol === selectedSymbol) || topSignal || null;

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
    focusedAsset: focusedAsset ? {
      symbol: focusedAsset.symbol,
      conviction: Number(focusedAsset.conviction ?? focusedAsset.signalScore ?? 0),
      signalLabel: normalizeSignalLabel(focusedAsset.signalLabel),
      sentiment: focusedAsset.sentiment || 'neutral',
      change24h: Number(focusedAsset.change24h || 0),
      timeframe: focusedAsset.timeframe || {},
    } : null,
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
      takeaway: 'Start with the lead signal, then scan your watchlist so tomorrow has a clean comparison point.',
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

  const topComparison = getConvictionComparison({
    currentSymbol: currentTop?.symbol,
    previousSymbol: previousTop?.symbol,
    currentScore: currentTop?.conviction,
    previousScore: previousTop?.conviction,
    currentCapturedAt: currentSnapshot?.capturedAt,
    previousCapturedAt: previousSnapshot?.capturedAt,
  });

  if (topComparison.mode === 'improving') {
    const pointLabel = getConvictionPointLabel(topComparison);
    highlights.push(`${currentTop.symbol} stayed in front and conviction is improving${pointLabel ? ` (${pointLabel})` : ''}.`);
  } else if (topComparison.mode === 'fading') {
    const pointLabel = getConvictionPointLabel(topComparison);
    highlights.push(`${currentTop.symbol} stayed in front but conviction is fading${pointLabel ? ` (${pointLabel})` : ''}.`);
  } else if (topComparison.mode === 'too-far-apart') {
    highlights.push(`${currentTop.symbol} stayed in front, but the prior conviction read is too far apart for a clean point comparison.`);
  }

  if (previousTop?.signalLabel && currentTop?.signalLabel && previousTop.signalLabel !== currentTop.signalLabel) {
    highlights.push(`${currentTop.symbol} posture shifted from ${previousTop.signalLabel} to ${currentTop.signalLabel}.`);
  }

  if (previousSnapshot.regime && currentSnapshot.regime && previousSnapshot.regime !== currentSnapshot.regime) {
    highlights.push(`Market tone moved from ${previousSnapshot.regime} to ${currentSnapshot.regime}.`);
  }

  const previousWatchMap = new Map((previousSnapshot.watchlist || []).map((asset) => [asset.symbol, asset]));
  const currentWatchlist = currentSnapshot.watchlist || [];
  const deltas = currentWatchlist
    .map((asset) => {
      const previous = previousWatchMap.get(asset.symbol);
      const comparison = getConvictionComparison({
        currentSymbol: asset.symbol,
        previousSymbol: previous?.symbol,
        currentScore: asset.conviction,
        previousScore: previous?.conviction,
        currentCapturedAt: currentSnapshot?.capturedAt,
        previousCapturedAt: previousSnapshot?.capturedAt,
      });
      return { asset, previous, delta: comparison.delta, comparison };
    })
    .filter((entry) => entry.previous);

  deltas
    .filter((entry) => entry.comparison.mode === 'improving')
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 2)
    .forEach((entry) => {
      const pointLabel = getConvictionPointLabel(entry.comparison);
      improved.push(`${entry.asset.symbol} is improving${pointLabel ? ` (${pointLabel})` : ''}.`);
    });

  deltas
    .filter((entry) => entry.comparison.mode === 'fading')
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 2)
    .forEach((entry) => {
      const pointLabel = getConvictionPointLabel(entry.comparison);
      weakened.push(`${entry.asset.symbol} is fading${pointLabel ? ` (${pointLabel})` : ''}.`);
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
    takeaway = `${strongestImprover.asset.symbol} is building while ${biggestDrop.asset.symbol} is fading, so anchor tonight around the cleaner read.`;
  } else if (strongestImprover) {
    takeaway = `${strongestImprover.asset.symbol} is building fastest since your last visit, so it deserves the first look tonight.`;
  } else if (biggestDrop) {
    takeaway = `${biggestDrop.asset.symbol} has faded since your last visit, so treat rallies there with more patience tonight.`;
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

function buildFocusedAssetMemory(previousSnapshot, currentSnapshot, selectedAsset = 'BTC') {
  const symbol = String(selectedAsset || currentSnapshot?.focusedAsset?.symbol || currentSnapshot?.topSignal?.symbol || 'BTC').toUpperCase();
  const currentFocus = currentSnapshot?.focusedAsset?.symbol === symbol
    ? currentSnapshot.focusedAsset
    : (currentSnapshot?.watchlist || []).find((asset) => asset.symbol === symbol) || currentSnapshot?.topSignal || null;
  const previousFocus = previousSnapshot?.focusedAsset?.symbol === symbol
    ? previousSnapshot.focusedAsset
    : (previousSnapshot?.watchlist || []).find((asset) => asset.symbol === symbol) || (previousSnapshot?.topSignal?.symbol === symbol ? previousSnapshot.topSignal : null);

  if (!currentFocus) {
    return {
      symbol,
      chips: ['No stored focus yet'],
      bullets: ['Select an asset a few times and Midnight Signal will start comparing it across visits.'],
      takeaway: 'Open a watchlist name or board card to make that asset your personal reference point.'
    };
  }

  if (!previousFocus) {
    return {
      symbol,
      chips: [`Watching ${symbol}`],
      bullets: [`${symbol} is now your reference asset for future visits.`],
      takeaway: `Check ${symbol} again later and this panel will show what strengthened, softened, or changed.`
    };
  }

  const bullets = [];
  const chips = [`Last checked ${symbol}`];
  const currentConviction = Number(currentFocus.conviction || 0);
  const previousConviction = Number(previousFocus.conviction || 0);
  const focusComparison = getConvictionComparison({
    currentSymbol: currentFocus?.symbol,
    previousSymbol: previousFocus?.symbol,
    currentScore: currentConviction,
    previousScore: previousConviction,
    currentCapturedAt: currentSnapshot?.capturedAt,
    previousCapturedAt: previousSnapshot?.capturedAt,
  });
  const convictionDiff = focusComparison.delta;

  if (focusComparison.mode === 'improving') {
    bullets.push(`Confidence is improving on ${symbol}.`);
    const pointLabel = getConvictionPointLabel(focusComparison);
    if (pointLabel) chips.push(pointLabel);
  } else if (focusComparison.mode === 'fading') {
    bullets.push(`Confidence is fading on ${symbol}.`);
    const pointLabel = getConvictionPointLabel(focusComparison);
    if (pointLabel) chips.push(pointLabel);
  } else if (focusComparison.mode === 'too-far-apart') {
    bullets.push(`Confidence is still comparable in tone, but the prior read is too far apart for a clean point comparison.`);
  } else {
    bullets.push(`Confidence is holding near ${currentConviction}% with no major swing since your last check.`);
  }

  if (previousFocus.signalLabel && currentFocus.signalLabel && previousFocus.signalLabel !== currentFocus.signalLabel) {
    bullets.push(`Posture shifted from ${previousFocus.signalLabel} to ${currentFocus.signalLabel}.`);
  }

  const currentFrames = currentFocus.timeframe || {};
  const previousFrames = previousFocus.timeframe || {};
  const strengthened = [];
  const softened = [];
  [['5m', currentFrames.tf5m, previousFrames.tf5m], ['15m', currentFrames.tf15m, previousFrames.tf15m], ['1h', currentFrames.tf1h, previousFrames.tf1h]].forEach(([label, now, prev]) => {
    const n = Number(now);
    const p = Number(prev);
    if (!Number.isFinite(n) || !Number.isFinite(p)) return;
    if (n - p >= 4) strengthened.push(label);
    if (p - n >= 4) softened.push(label);
  });

  if (strengthened.length) bullets.push(`${strengthened.join(' + ')} momentum strengthened.`);
  else if (softened.length) bullets.push(`${softened.join(' + ')} momentum faded.`);

  const changeDiff = Number(currentFocus.change24h || 0) - Number(previousFocus.change24h || 0);
  if (Math.abs(changeDiff) >= 1.5) {
    bullets.push(`24h move ${changeDiff > 0 ? 'improved' : 'cooled'} by ${Math.abs(changeDiff).toFixed(1)} pts.`);
  }

  const takeaway = focusComparison.mode === 'improving'
    ? `${symbol} is building conviction faster than your last clean read, so it deserves an earlier check tonight.`
    : focusComparison.mode === 'fading'
      ? `${symbol} has softened since your last clean read, so treat it with more patience tonight.`
      : `${symbol} is relatively steady, so use the broader board for the next change worth acting on.`;

  return {
    symbol,
    chips: chips.slice(0, 3),
    bullets: bullets.slice(0, 3),
    takeaway,
  };
}

function buildWatchlistFirstHighlights(currentSnapshot, previousSnapshot) {
  const previousMap = new Map((previousSnapshot?.watchlist || []).map((asset) => [asset.symbol, asset]));
  return (currentSnapshot?.watchlist || [])
    .map((asset) => {
      const prev = previousMap.get(asset.symbol);
      if (!prev) return { symbol: asset.symbol, text: `${asset.symbol} is newly being tracked in your watchlist.` , score: 2};
      const comparison = getConvictionComparison({
        currentSymbol: asset.symbol,
        previousSymbol: prev.symbol,
        currentScore: asset.conviction,
        previousScore: prev.conviction,
        currentCapturedAt: currentSnapshot?.capturedAt,
        previousCapturedAt: previousSnapshot?.capturedAt,
      });
      if (comparison.mode === 'steady' && asset.signalLabel === prev.signalLabel) return null;
      if (comparison.mode === 'improving' || comparison.mode === 'fading') {
        const pointLabel = getConvictionPointLabel(comparison);
        return { symbol: asset.symbol, text: `${asset.symbol} is ${comparison.mode}${pointLabel ? ` (${pointLabel})` : ''}.`, score: comparison.absDelta || 3 };
      }
      return { symbol: asset.symbol, text: `${asset.symbol} moved from ${prev.signalLabel} to ${asset.signalLabel}.`, score: 3 };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
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

function buildFirstSessionGuide(experience, user) {
  const targetId = experience.intent === 'alerts'
    ? 'alert-center'
    : experience.contextFirst
      ? 'signal-context'
      : 'market-scan';

  const title = experience.intent === 'alerts'
    ? 'Your alert-aware setup is active'
    : experience.intent === 'track'
      ? 'Your board-first setup is active'
      : 'Your guided setup is active';

  const intro = experience.intent === 'alerts'
    ? 'Start by checking Alert Center, then use your watchlist as the shortlist for what deserves a trigger.'
    : experience.intent === 'track'
      ? 'Start with Tonight’s Top Signal, then move straight into the board and keep your watchlist close while you compare names.'
      : 'Start with the signal explanation first, then move into the smaller board and your watchlist when you want more context.';

  const bullets = [
    experience.intent === 'alerts'
      ? 'Alert Center is now your first stop for rules, delivery mode, and recent events.'
      : experience.contextFirst
        ? 'Signal Context is surfaced earlier so the “why” is visible before the wider board.'
        : 'The market board is the main workspace for this setup, with denser scanning up front.',
    user
      ? 'Your setup and watchlist can sync across devices with this account.'
      : 'Your watchlist and setup are saved locally on this device until you sign in.',
    'You can change user type, goal, and defaults anytime in Controls.',
  ];

  const primaryLabel = experience.intent === 'alerts'
    ? 'Open Alert Center'
    : experience.contextFirst
      ? 'Open Signal Context'
      : 'Open Market Board';

  return { targetId, title, intro, bullets, primaryLabel };
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
  const [panelState, setPanelState] = useState(DEFAULT_PANEL_STATE);
  const [learningAsset, setLearningAsset] = useState(null);
  const [alertAsset, setAlertAsset] = useState(null);
  const [upgradeNotice, setUpgradeNotice] = useState('');
  const [liveItems, setLiveItems] = useState([]);
  const [marketSource, setMarketSource] = useState('fallback');
  const [marketUpdatedAt, setMarketUpdatedAt] = useState(null);
  const [showStickyWatchlist, setShowStickyWatchlist] = useState(false);
  const watchlistTriggerRef = useRef(null);
  const [marketReady, setMarketReady] = useState(false);
  const [signalHistory, setSignalHistory] = useState([]);
  const [forwardValidation, setForwardValidation] = useState([]);
  const [adaptiveWeights, setAdaptiveWeights] = useState({});
  const [lastVisitAt, setLastVisitAt] = useState(null);
  const [previousSessionSnapshot, setPreviousSessionSnapshot] = useState(null);
  const [priorityAlerts, setPriorityAlerts] = useState([]);
  const [contextItems, setContextItems] = useState([]);
  const [gateReady, setGateReady] = useState(false);
  const [showDisclaimerGate, setShowDisclaimerGate] = useState(false);
  const [showOnboardingGate, setShowOnboardingGate] = useState(false);
  const [firstSessionGuide, setFirstSessionGuide] = useState(null);
  const [pendingHandoffTarget, setPendingHandoffTarget] = useState('');
  const [contextMeta, setContextMeta] = useState({ live: false, sourceTypes: { article: 0, x: 0, note: 0 }, updatedAt: null });
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
        setUpgradeNotice('Checkout canceled — Free access remains active.');
        url.searchParams.delete('checkout');
        window.history.replaceState({}, '', url.toString());
      } else if (billing === 'unavailable') {
        setUpgradeNotice('Stripe checkout is not configured yet. Free access stays fully available until billing is live.');
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

  const experience = useMemo(
    () => deriveExperienceProfile(state),
    [state]
  );

  const watchlistHighlights = useMemo(() => {
    const watchSymbols = Array.isArray(state?.watchlist) ? state.watchlist : [];
    return rankedAssets
      .filter((item) => watchSymbols.includes(item.symbol))
      .sort((a, b) => Math.abs(b.change24h || 0) - Math.abs(a.change24h || 0))
      .slice(0, 2);
  }, [rankedAssets, state?.watchlist]);

  const sessionSnapshotStorageKey = useMemo(() => getSessionSnapshotStorageKey(state), [state?.timeframe, state?.strategy, state?.mode]);
  const lastVisitStorageKey = useMemo(() => getLastVisitStorageKey(state), [state?.timeframe, state?.strategy, state?.mode]);

  const currentSessionSnapshot = useMemo(
  () => createSessionSnapshot({
    topSignal,
    rankedAssets,
    watchlist: state?.watchlist || [],
    selectedAsset: state?.selectedAsset || topSignal?.symbol || 'BTC',
    regimeSummary,
    marketUpdatedAt,
  }),
  [topSignal, rankedAssets, state?.watchlist, state?.selectedAsset, regimeSummary, marketUpdatedAt]
);

const visitIntelligence = useMemo(
  () => buildVisitIntelligence(previousSessionSnapshot, currentSessionSnapshot),
  [previousSessionSnapshot, currentSessionSnapshot]
);

const focusedAssetMemory = useMemo(
  () => buildFocusedAssetMemory(previousSessionSnapshot, currentSessionSnapshot, state?.selectedAsset || topSignal?.symbol || 'BTC'),
  [previousSessionSnapshot, currentSessionSnapshot, state?.selectedAsset, topSignal?.symbol]
);

const watchlistFirstHighlights = useMemo(
  () => buildWatchlistFirstHighlights(currentSessionSnapshot, previousSessionSnapshot),
  [currentSessionSnapshot, previousSessionSnapshot]
);


const sinceLastVisitSummary = useMemo(() => {
  const fallbackBits = [];
  const previous = previousSignalEntry;
  const improvedCount = visitIntelligence.improved?.length || 0;
  const weakenedCount = visitIntelligence.weakened?.length || 0;

  const leadComparison = getConvictionComparison({
    currentSymbol: topSignal?.symbol,
    previousSymbol: previous?.symbol,
    currentScore: topSignal?.conviction,
    previousScore: previous?.conviction,
    currentCapturedAt: currentSessionSnapshot?.capturedAt,
    previousCapturedAt: previousSessionSnapshot?.capturedAt,
  });

  if (leadComparison.mode === 'rotation') {
    fallbackBits.push(`${topSignal.symbol} replaced ${previous.symbol} at the top`);
  } else if (leadComparison.mode === 'improving') {
    const pointLabel = getConvictionPointLabel(leadComparison);
    fallbackBits.push(`${topSignal.symbol} conviction is improving${pointLabel ? ` (${pointLabel})` : ''}`);
  } else if (leadComparison.mode === 'fading') {
    const pointLabel = getConvictionPointLabel(leadComparison);
    fallbackBits.push(`${topSignal.symbol} conviction is fading${pointLabel ? ` (${pointLabel})` : ''}`);
  }

  if (improvedCount || weakenedCount) {
    fallbackBits.push(`${improvedCount} strengthened · ${weakenedCount} faded`);
  }

  if (watchlistHighlights[0]) {
    const mover = watchlistHighlights[0];
    const direction = (mover.change24h || 0) >= 0 ? 'up' : 'down';
    fallbackBits.push(`${mover.symbol} led your watchlist ${direction} ${Math.abs(mover.change24h || 0).toFixed(1)}%`);
  }

  if (regimeSummary?.regime) {
    fallbackBits.push(`Market tone: ${String(regimeSummary.regime).replace(/-/g, ' ')}`);
  }

  return visitIntelligence.highlights?.length
    ? [...focusedAssetMemory.chips.slice(0, 1), ...visitIntelligence.highlights.slice(0, 1), `${improvedCount} strengthened · ${weakenedCount} faded`].slice(0, 3)
    : fallbackBits.length
      ? fallbackBits.slice(0, 3)
      : [`${topSignal?.symbol || 'Lead signal'} stayed steady at ${topSignal?.conviction ?? '--'}% conviction`];
}, [previousSignalEntry, topSignal, watchlistHighlights, regimeSummary, visitIntelligence, focusedAssetMemory, currentSessionSnapshot, previousSessionSnapshot]);


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

        const allAlerts = [...configured.events, ...systemAlerts]
          .filter((item) => !dismissed.includes(item.id))
          .sort((a, b) => b.priority - a.priority);

        if (!cancelled) {
          setPriorityAlerts(allAlerts.slice(0, 4));
        }

        if (configured.events.length) {
          const recent = [
            ...configured.events,
            ...(state?.recentAlertEvents || []),
          ].slice(0, 12);
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
              let payloadAlerts = configured.events;
              let shouldSend = Boolean(configured.events.length);

              if (digestMode === 'digest') {
                const queuedDigestMemory = queueDigestEvents(configured.events);
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
                setState((previous) => ({
                  ...previous,
                  alertLastDeliveryAt: data?.sentAt || new Date().toISOString(),
                  alertLastDeliveryStatus: data?.ok
                    ? data?.mode === 'mock'
                      ? 'Delivery route ready in mock mode'
                      : digestMode === 'digest'
                        ? 'Digest sent'
                        : 'Instant alert sent'
                    : data?.message || 'Delivery failed',
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
      setLastVisitAt(window.localStorage.getItem(lastVisitStorageKey) || window.localStorage.getItem('midnight-signal-last-visit-at'));
      const snapshotRaw = window.localStorage.getItem(sessionSnapshotStorageKey) || window.localStorage.getItem(SESSION_SNAPSHOT_KEY) || window.localStorage.getItem('midnight-signal-session-snapshot-v1');
      if (snapshotRaw) setPreviousSessionSnapshot(JSON.parse(snapshotRaw));
    } catch {
      setLastVisitAt(null);
      setPreviousSessionSnapshot(null);
    }
  }, [lastVisitStorageKey, sessionSnapshotStorageKey]);

  useEffect(() => {
    if (!marketReady || typeof window === 'undefined' || !currentSessionSnapshot) return;
    try {
      const stamp = new Date().toISOString();
      window.localStorage.setItem(lastVisitStorageKey, stamp);
      window.localStorage.setItem('midnight-signal-last-visit-at', stamp);
      const nextSnapshot = JSON.stringify({
        ...currentSessionSnapshot,
        capturedAt: stamp,
      });
      window.localStorage.setItem(sessionSnapshotStorageKey, nextSnapshot);
      window.localStorage.setItem(SESSION_SNAPSHOT_KEY, nextSnapshot);
    } catch {
      // no-op
    }
  }, [marketReady, currentSessionSnapshot, topSignal?.symbol, topSignal?.conviction, lastVisitStorageKey, sessionSnapshotStorageKey]);


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
    setState((previous) => ({ ...previous, selectedAsset: symbol, watchlist: previous.watchlist.includes(symbol) ? [symbol, ...previous.watchlist.filter((item) => item !== symbol)] : previous.watchlist }));
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

  function jumpTo(id) {
    if (typeof document === 'undefined') return;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const signalContext = useMemo(() => buildSignalContext(topSignal, rankedAssets, state.watchlist, regimeSummary, { items: contextItems, meta: contextMeta }), [topSignal, rankedAssets, state.watchlist, regimeSummary, contextItems, contextMeta]);
  const sessionGuide = useMemo(() => buildFirstSessionGuide(experience, user), [experience, user]);

useEffect(() => {
  if (typeof window === 'undefined') return;
  try {
    const rawProfile = window.localStorage.getItem('ms_onboarding_profile');
    if (!rawProfile) return;
    const parsed = JSON.parse(rawProfile);
    const localUserType = normalizeUserType(parsed?.userType || state.userType || state.mode);
    const localIntent = normalizeIntent(parsed?.goal || state.intent || state.onboardingGoal);
    if (state.userType === localUserType && state.intent === localIntent && state.modeEngineVersion === '11.81') return;
    setState((previous) => applyModePreset({
      ...previous,
      userType: localUserType,
      intent: localIntent,
      onboardingGoal: localIntent,
      onboardingCompletedAt: previous.onboardingCompletedAt || parsed?.completedAt || new Date().toISOString(),
    }));
  } catch {
    // no-op
  }
}, [setState, state.intent, state.mode, state.modeEngineVersion, state.onboardingGoal, state.onboardingCompletedAt, state.userType]);

useEffect(() => {
  if (typeof window === 'undefined') return;
  try {
    const hasAcceptedDisclaimer = window.localStorage.getItem('ms_disclaimer') === 'true';
    const hasOnboarded = window.localStorage.getItem('ms_onboarded') === 'true';
    setShowDisclaimerGate(!hasAcceptedDisclaimer);
    setShowOnboardingGate(hasAcceptedDisclaimer && !hasOnboarded);
    if (hasAcceptedDisclaimer && state.acceptedDisclaimer !== true) {
      setState((previous) => ({ ...previous, acceptedDisclaimer: true }));
    }
  } catch {
    setShowDisclaimerGate(true);
    setShowOnboardingGate(false);
  } finally {
    setGateReady(true);
  }
}, [setState, state.acceptedDisclaimer]);

function handleDisclaimerAccept() {
  try {
    window.localStorage.setItem('ms_disclaimer', 'true');
  } catch {
    // no-op
  }
  setState((previous) => ({ ...previous, acceptedDisclaimer: true }));
  setShowDisclaimerGate(false);
  setShowOnboardingGate(true);
}

function handleOnboardingComplete(payload) {
  const userType = normalizeUserType(payload?.userType || 'Beginner');
  const intent = normalizeIntent(payload?.goal || 'learn');
  const completedAt = new Date().toISOString();
  const preset = applyModePreset(state, {
    userType,
    intent,
    onboardingGoal: intent,
    onboardingCompletedAt: completedAt,
  });
  const nextExperience = deriveExperienceProfile({
    ...state,
    ...preset,
    userType,
    intent,
    onboardingGoal: intent,
    onboardingCompletedAt: completedAt,
  });
  const nextGuide = buildFirstSessionGuide(nextExperience, user);

  try {
    window.localStorage.setItem('ms_onboarded', 'true');
    window.localStorage.setItem('ms_onboarding_profile', JSON.stringify({
      userType,
      goal: intent,
      dashboardFocus: preset.dashboardFocus,
      completedAt,
    }));
    window.localStorage.setItem('ms_first_session_handoff', JSON.stringify({
      targetId: nextGuide.targetId,
      completedAt,
    }));
  } catch {
    // no-op
  }

  setState((previous) => applyModePreset({
    ...previous,
    userType,
    intent,
    onboardingGoal: intent,
    onboardingCompletedAt: completedAt,
  }));
  setFirstSessionGuide(nextGuide);
  setPendingHandoffTarget(nextGuide.targetId);
  setShowOnboardingGate(false);
}

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('ms_first_session_handoff');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const completedAt = parsed?.completedAt ? new Date(parsed.completedAt).getTime() : 0;
      if (!completedAt || Date.now() - completedAt > 1000 * 60 * 30) {
        window.localStorage.removeItem('ms_first_session_handoff');
        return;
      }
      if (!firstSessionGuide) {
        setFirstSessionGuide(sessionGuide);
      }
      if (!pendingHandoffTarget && parsed?.targetId) {
        setPendingHandoffTarget(parsed.targetId);
      }
    } catch {
      // no-op
    }
  }, [firstSessionGuide, pendingHandoffTarget, sessionGuide]);

  useEffect(() => {
    if (typeof document === 'undefined' || !pendingHandoffTarget || showOnboardingGate) return;
    const timer = window.setTimeout(() => {
      document.getElementById(pendingHandoffTarget)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [pendingHandoffTarget, showOnboardingGate]);


  useEffect(() => {
    if (typeof window === 'undefined' || !watchlistTriggerRef.current) return;

    const node = watchlistTriggerRef.current;
    const updateSticky = (isIntersecting) => {
      setShowStickyWatchlist(!isIntersecting && window.innerWidth > 1080 && (state.watchlist?.length || 0) > 0);
    };

    const observer = new IntersectionObserver(
      ([entry]) => updateSticky(entry.isIntersecting),
      { rootMargin: '-96px 0px 0px 0px', threshold: 0 }
    );

    observer.observe(node);

    const onResize = () => {
      if (window.innerWidth <= 1080) {
        setShowStickyWatchlist(false);
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [state.watchlist]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(COLLAPSIBLE_PANELS_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      setPanelState((previous) => ({ ...previous, ...parsed }));
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(COLLAPSIBLE_PANELS_KEY, JSON.stringify(panelState)); } catch {}
  }, [panelState]);

  function togglePanel(panelKey) {
    setPanelState((previous) => ({ ...previous, [panelKey]: !previous[panelKey] }));
  }

  return (
    <main className={`page ${experience.modeClass} ${experience.intentClass}`}>
      {gateReady && showDisclaimerGate ? (
        <DisclaimerModal onAccept={handleDisclaimerAccept} />
      ) : null}
      {gateReady && !showDisclaimerGate && showOnboardingGate ? (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      ) : null}
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
          onOpenControls={() => {
            setAlertAsset(null);
            setControlOpen(true);
          }}
        />

        {firstSessionGuide ? (
          <section className={`first-session-guide card ${experience.modeClass} ${experience.intentClass}`} aria-label="First session guidance">
            <div className="first-session-guide-copy">
              <div className="eyebrow">Setup active</div>
              <h2 className="section-title">{firstSessionGuide.title}</h2>
              <p className="muted small">{firstSessionGuide.intro}</p>
              <div className="first-session-guide-list">
                {firstSessionGuide.bullets.map((item) => (
                  <div key={item} className="first-session-guide-item">{item}</div>
                ))}
              </div>
            </div>
            <div className="first-session-guide-actions">
              <button
                type="button"
                className="button"
                onClick={() => {
                  setPendingHandoffTarget(firstSessionGuide.targetId);
                  jumpTo(firstSessionGuide.targetId);
                }}
              >
                {firstSessionGuide.primaryLabel}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setAlertAsset(null);
                  setControlOpen(true);
                }}
              >
                Adjust setup
              </button>
              <button
                type="button"
                className="ghost-button small"
                onClick={() => {
                  setFirstSessionGuide(null);
                  setPendingHandoffTarget('');
                  try {
                    window.localStorage.removeItem('ms_first_session_handoff');
                  } catch {}
                }}
              >
                Dismiss
              </button>
            </div>
          </section>
        ) : null}

        <section className={`flow-section flow-section-tonight ${experience.modeClass} ${experience.intentClass}`} aria-label="Tonight">
          <div className="flow-section-head">
            <div className="section-kicker">Tonight</div>
            <p className="flow-section-sub muted small">Read the lead signal first, then move through what changed and why it matters.</p>
          </div>

          <div className="tonight-stack">
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
                onOpenSessionSettings={() => setControlOpen(true)}
              />
            </section>

            {experience.showContextPanel && experience.contextFirst ? (
              <section id="signal-context" className="signal-context-anchor">
                <SignalContextPanel
                  context={signalContext}
                  asset={topSignal}
                  experience={experience}
                  collapsed={!panelState.signalContext}
                  onToggleCollapse={() => togglePanel('signalContext')}
                />
              </section>
            ) : null}

            {experience.showSinceLastVisit ? (
            <section className={`since-panel card ${experience.modeClass} ${experience.intentClass} ${panelState.sinceLastVisit ? '' : 'since-panel-collapsed'}`} id="since-last-visit">
              {panelState.sinceLastVisit ? (<> 
              <div className="since-panel-head">
                <div>
                  <div className="eyebrow">{experience.sinceEyebrow}</div>
                  <h2 className="section-title">{experience.sinceTitle}</h2>
                </div>
                <div className="section-collapse-actions">
                  <span className="badge since-badge">{lastVisitLabel}</span>
                  <button type="button" className="ghost-button small section-collapse-toggle is-open" onClick={() => togglePanel('sinceLastVisit')} aria-expanded={true} aria-label="Collapse since last visit panel">Collapse</button>
                </div>
              </div>

              <div className="since-chip-row">
                {sinceLastVisitSummary.map((item) => (
                  <div key={item} className="since-chip">{item}</div>
                ))}
              </div>

              <div className="since-intel-grid">
                <div className="since-intel-card">
                  <div className="since-intel-label">Last time you checked {focusedAssetMemory.symbol}</div>
                  <div className="since-intel-list">
                    {focusedAssetMemory.bullets.map((item) => (
                      <div key={item} className="since-intel-item">{item}</div>
                    ))}
                  </div>
                </div>

                <div className="since-intel-card">
                  <div className="since-intel-label">Watchlist first</div>
                  <div className="since-intel-list">
                    {watchlistFirstHighlights.length ? watchlistFirstHighlights.map((item) => (
                      <div key={item.text} className="since-intel-item">{item.text}</div>
                    )) : <div className="since-intel-item muted">No major watchlist changes yet.</div>}
                  </div>
                </div>

                <div className="since-intel-card">
                  <div className="since-intel-label">Broader shift</div>
                  <div className="since-intel-list">
                    {visitIntelligence.highlights.length ? visitIntelligence.highlights.map((item) => (
                      <div key={item} className="since-intel-item">{item}</div>
                    )) : <div className="since-intel-item muted">No major board-wide changes yet.</div>}
                  </div>
                </div>
              </div>

              <div className="since-takeaway">
                <div className="since-intel-label">Tonight&apos;s takeaway</div>
                <div className="since-takeaway-copy">{focusedAssetMemory.takeaway}</div>
              </div>
              </>) : (
                <div className="section-collapse-compact-shell">
                  <div className="section-collapse-compact-top">
                    <div className="section-collapse-compact-titleblock">
                      <div className="eyebrow">{experience.sinceEyebrow}</div>
                      <h2 className="section-title">{experience.sinceTitle}</h2>
                    </div>
                    <div className="section-collapse-actions">
                      <span className="badge since-badge">{lastVisitLabel}</span>
                      <button type="button" className="ghost-button small section-collapse-toggle is-collapsed" onClick={() => togglePanel('sinceLastVisit')} aria-expanded={false} aria-label="Expand since last visit panel">Expand</button>
                    </div>
                  </div>
                  <div className="section-collapse-summary muted small">Personal memory hidden. Expand to compare your last checked asset, watchlist shifts, and tonight&apos;s takeaway.</div>
                </div>
              )}
            </section>
            ) : null}

            <div className="secondary-stack">
              <TrustDashboardPanel
                mode={state.mode}
                forwardValidation={forwardValidation}
                recentAlertEvents={state?.recentAlertEvents || []}
              />

              {experience.highlightAlerts ? (
                <section id="alert-center" className="alert-center-anchor">
                  <AlertCenterScaffold
                    state={state}
                    setState={setState}
                    experience={experience}
                    topSignal={topSignal}
                    watchlistHighlights={watchlistHighlights}
                    onOpenControls={() => {
                      setAlertAsset(null);
                      setControlOpen(true);
                    }}
                    onOpenAsset={(symbol) => openAlertAsset(symbol)}
                    user={user}
                    syncing={syncing}
                    status={status}
                    lastSyncedAt={lastSyncedAt}
                  />
                </section>
              ) : null}
            </div>
          </div>
        </section>

        <section className={`flow-section flow-section-board ${experience.modeClass} ${experience.intentClass}`} id="market-scan">
          <div className="flow-section-head">
            <div className="section-kicker">Market Board</div>
            <div className="flow-section-title-row">
              <h2 className="section-title">{experience.boardTitle}</h2>
              <div className="muted small">
                {experience.boardSubtitle}
              </div>
            </div>
          </div>

          <div className="board-section-shell">
            <Top20Grid
              state={state}
              setState={setState}
              onAssetOpen={setDetailAsset}
              assets={rankedAssets}
              collapsed={!panelState.marketScan}
              onToggleCollapse={() => togglePanel('marketScan')}
            />
          </div>
        </section>

        <section className={`flow-section flow-section-view ${experience.modeClass} ${experience.intentClass}`} aria-label="Your View">
          <div className="flow-section-head">
            <div className="section-kicker">Your View</div>
            <p className="flow-section-sub muted small">Keep your tracked names close and compare them after you read tonight&apos;s lead.</p>
          </div>

          <div ref={watchlistTriggerRef} className="watchlist-section-shell">
            <WatchlistPanel
              state={state}
              setState={setState}
              onAssetOpen={setDetailAsset}
              assets={rankedAssets}
              user={user}
              status={status}
              syncing={syncing}
              lastSyncedAt={lastSyncedAt}
              experience={experience}
            />
          </div>
        </section>

        {experience.showContextPanel && !experience.contextFirst ? (
          <section id="signal-context" className="signal-context-anchor">
            <SignalContextPanel
              context={signalContext}
              asset={topSignal}
              experience={experience}
              collapsed={!panelState.signalContext}
              onToggleCollapse={() => togglePanel('signalContext')}
            />
          </section>
        ) : null}

        <section className={`card compact-upgrade-strip ${experience.modeClass} ${experience.intentClass}`} aria-label="Midnight Signal Pro">
          <div className="compact-upgrade-copy">
            <div className="eyebrow">Midnight Signal Pro</div>
            <h2 className="section-title">Keep the page clean. Open the deeper Pro details only when you want them.</h2>
            <p className="muted small">Free stays focused on the nightly read. The full Pro breakdown lives behind the existing modal instead of taking over the main page.</p>
          </div>
          <div className="compact-upgrade-actions">
            <a className="ghost-button" href="#top-signal">See what Pro adds</a>
          </div>
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
          Build v12.3.2 · session controls clarity + memory accuracy · source: {marketSource}
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