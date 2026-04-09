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


const GROWTH_LOOP_STORAGE_KEY = 'midnight-signal-growth-loop-v1';
const INTRO_HINTS_STORAGE_KEY = 'midnight-signal-intro-hints-v1';

function buildAlertSoundKey(alerts = []) {
  return (alerts || []).map((item) => item?.id).filter(Boolean).slice(0, 4).join('|');
}


function safeText(value, fallback = '') {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    const first = value.find((item) => item !== null && item !== undefined);
    return safeText(first, fallback);
  }
  if (value && typeof value === 'object') {
    return safeText(value.headline ?? value.title ?? value.label ?? value.detail ?? value.body ?? value.summary ?? value.text, fallback);
  }
  return fallback;
}

function safeList(value) {
  return Array.isArray(value) ? value : [];
}

function createReferralCode() {
  return `MS${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function sanitizeGrowthLoopState(value) {
  const base = {
    referralCode: createReferralCode(),
    visits: 0,
    signups: 0,
    shares: 0,
    downloads: 0,
    unlockedTrial: false,
    activeReferral: null,
    activeReferralHandled: false,
    lastSharedAt: null,
  };

  if (!value || typeof value !== 'object') return base;

  return {
    referralCode: String(value.referralCode || base.referralCode).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || base.referralCode,
    visits: Number.isFinite(Number(value.visits)) ? Math.max(0, Number(value.visits)) : 0,
    signups: Number.isFinite(Number(value.signups)) ? Math.max(0, Number(value.signups)) : 0,
    shares: Number.isFinite(Number(value.shares)) ? Math.max(0, Number(value.shares)) : 0,
    downloads: Number.isFinite(Number(value.downloads)) ? Math.max(0, Number(value.downloads)) : 0,
    unlockedTrial: Boolean(value.unlockedTrial),
    activeReferral: value.activeReferral && typeof value.activeReferral === 'object'
      ? {
          code: String(value.activeReferral.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12),
          firstSeenAt: value.activeReferral.firstSeenAt || null,
        }
      : null,
    activeReferralHandled: Boolean(value.activeReferralHandled),
    lastSharedAt: value.lastSharedAt || null,
  };
}


function sanitizeOnboardingProfile(value) {
  const base = {
    userType: 'Beginner',
    goal: 'Learn',
    completedAt: null,
    hintsDismissed: false,
  };

  if (!value || typeof value !== 'object') return base;

  const userType = ['Beginner', 'Active trader', 'Long-term'].includes(value.userType) ? value.userType : base.userType;
  const goal = ['Learn', 'Track signals', 'Get alerts'].includes(value.goal) ? value.goal : base.goal;

  return {
    userType,
    goal,
    completedAt: value.completedAt || null,
    hintsDismissed: Boolean(value.hintsDismissed),
  };
}

function readGrowthLoopState() {
  if (typeof window === 'undefined') return sanitizeGrowthLoopState(null);
  try {
    return sanitizeGrowthLoopState(JSON.parse(window.localStorage.getItem(GROWTH_LOOP_STORAGE_KEY) || 'null'));
  } catch {
    return sanitizeGrowthLoopState(null);
  }
}

function writeGrowthLoopState(value) {
  if (typeof window === 'undefined') return sanitizeGrowthLoopState(value);
  const next = sanitizeGrowthLoopState(value);
  try {
    window.localStorage.setItem(GROWTH_LOOP_STORAGE_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

function buildSharePayload(asset, context, referralCode) {
  const symbol = asset?.symbol || 'BTC';
  const conviction = Math.round(asset?.conviction || asset?.signalScore || 0);
  const posture = asset?.signalLabel || asset?.sentiment || 'Mixed posture';
  const why = safeText(asset?.watchNext, '') || safeText(asset?.postureSummary, '') || safeText(context?.whyThisIsHappening, 'Watch for the next confirmation cycle.');
  const catalyst = safeText(safeList(context?.relatedCatalysts)[0]?.headline, '') || safeText(context?.catalystTitle, '') || safeText(context?.marketContext?.headline, 'No clear catalyst detected');
  const referralSuffix = referralCode ? `?ref=${encodeURIComponent(referralCode)}` : '';
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${baseUrl}/signal/${symbol.toLowerCase()}${referralSuffix}`;
  const title = `Tonight's Signal: ${symbol}`;
  const text = [
    `🌙 Tonight's Signal: ${symbol} — ${posture} (${conviction}%)`,
    `Why it matters tonight: ${why}`,
    `Catalyst watch: ${catalyst}`,
    `Open the full signal: ${shareUrl}`,
  ].join('\n\n');
  return { title, text, shareUrl, why, catalyst, posture, conviction };
}

function downloadSignalCard(asset, context, referralCode) {
  if (typeof window === 'undefined' || !asset) return false;
  const { shareUrl, why, catalyst, posture, conviction } = buildSharePayload(asset, context, referralCode);
  const safeWhy = String(why || '').replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]));
  const safeCatalyst = String(catalyst || '').replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]));
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#07111f" />
        <stop offset="50%" stop-color="#0f1c33" />
        <stop offset="100%" stop-color="#16284a" />
      </linearGradient>
      <linearGradient id="accent" x1="0" x2="1">
        <stop offset="0%" stop-color="#5b7cfa" />
        <stop offset="100%" stop-color="#8ba8ff" />
      </linearGradient>
    </defs>
    <rect width="1200" height="675" rx="36" fill="url(#bg)" />
    <circle cx="150" cy="130" r="58" fill="rgba(139,168,255,.12)" />
    <circle cx="150" cy="130" r="34" fill="rgba(139,168,255,.22)" />
    <text x="220" y="110" fill="#9fb4ff" font-family="Arial, Helvetica, sans-serif" font-size="28">MIDNIGHT SIGNAL</text>
    <text x="220" y="165" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="700">${asset.symbol}</text>
    <text x="220" y="225" fill="#d8e2ff" font-family="Arial, Helvetica, sans-serif" font-size="34">${posture} • ${conviction}% conviction</text>
    <rect x="72" y="286" width="1056" height="132" rx="28" fill="rgba(9,17,32,.6)" stroke="rgba(139,168,255,.18)" />
    <text x="108" y="330" fill="#8ba8ff" font-family="Arial, Helvetica, sans-serif" font-size="24">Why it matters tonight</text>
    <text x="108" y="372" fill="#f8fbff" font-family="Arial, Helvetica, sans-serif" font-size="34">${safeWhy}</text>
    <rect x="72" y="446" width="1056" height="104" rx="28" fill="rgba(9,17,32,.48)" stroke="rgba(139,168,255,.14)" />
    <text x="108" y="490" fill="#8ba8ff" font-family="Arial, Helvetica, sans-serif" font-size="24">Catalyst watch</text>
    <text x="108" y="530" fill="#f8fbff" font-family="Arial, Helvetica, sans-serif" font-size="30">${safeCatalyst}</text>
    <text x="72" y="616" fill="#9fb4ff" font-family="Arial, Helvetica, sans-serif" font-size="24">${shareUrl}</text>
    <text x="1042" y="616" text-anchor="end" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="26">What's the signal tonight?</text>
  </svg>`;
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `midnight-signal-${asset.symbol.toLowerCase()}-v11.75.svg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
  return true;
}

function normalizeSignalLabel(label = '') {
  return String(label || '')
    .replace(/\s+/g, ' ')
    .trim() || 'Mixed posture';
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
  const [growthLoop, setGrowthLoop] = useState(() => sanitizeGrowthLoopState(null));
  const [inviteBanner, setInviteBanner] = useState('');
  const [shareStatus, setShareStatus] = useState('');
  const [onboardingProfile, setOnboardingProfile] = useState(() => sanitizeOnboardingProfile({
    userType: state?.onboardingUserType || 'Beginner',
    goal: state?.onboardingGoal || 'Learn',
    completedAt: state?.onboardingCompletedAt || null,
    hintsDismissed: false,
  }));
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const entitlementRefreshRef = useRef(false);

  useEffect(() => {
    setSignalHistory(readSignalHistory());
    setForwardValidation(readForwardValidation());
    setAdaptiveWeights(readAdaptiveWeights());
  }, []);

  useEffect(() => {
    const next = sanitizeOnboardingProfile({
      userType: state?.onboardingUserType || 'Beginner',
      goal: state?.onboardingGoal || 'Learn',
      completedAt: state?.onboardingCompletedAt || null,
      hintsDismissed: typeof window !== 'undefined' ? window.localStorage.getItem(INTRO_HINTS_STORAGE_KEY) === 'dismissed' : false,
    });
    setOnboardingProfile(next);
    if (!next.completedAt) {
      setOnboardingOpen(true);
      setOnboardingStep(1);
    }
  }, [state?.onboardingCompletedAt, state?.onboardingGoal, state?.onboardingUserType]);

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
    if (typeof window === 'undefined') return;

    try {
      const url = new URL(window.location.href);
      const ref = String(url.searchParams.get('ref') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
      const current = readGrowthLoopState();
      let next = current;

      if (ref && ref !== current.referralCode) {
        next = writeGrowthLoopState({
          ...current,
          visits: (current.visits || 0) + (current.activeReferralHandled && current.activeReferral?.code === ref ? 0 : 1),
          activeReferral: { code: ref, firstSeenAt: current.activeReferral?.code === ref ? current.activeReferral.firstSeenAt : new Date().toISOString() },
          activeReferralHandled: true,
        });
        setInviteBanner(`You were invited by ${ref} to check tonight's signal.`);
      }

      setGrowthLoop(next);
    } catch {
      setGrowthLoop(sanitizeGrowthLoopState(null));
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

  const audioContextRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const lastPlayedAlertKeyRef = useRef('');

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return undefined;

    let disposed = false;

    const unlockAudio = async () => {
      if (disposed) return;
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContextClass();
        }
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        audioUnlockedRef.current = audioContextRef.current?.state === 'running';
      } catch {
        audioUnlockedRef.current = false;
      }
    };

    const onGesture = () => {
      void unlockAudio();
    };

    window.addEventListener('pointerdown', onGesture, { passive: true });
    window.addEventListener('keydown', onGesture);
    window.addEventListener('touchstart', onGesture, { passive: true });

    return () => {
      disposed = true;
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
      window.removeEventListener('touchstart', onGesture);
    };
  }, []);

  const priorityAlertCountSinceVisit = useMemo(() => (state?.recentAlertEvents || []).filter((alert) => {
    const ts = alert?.triggeredAt ? new Date(alert.triggeredAt).getTime() : 0;
    const visitTs = lastVisitAt ? new Date(lastVisitAt).getTime() : 0;
    return ts && ts >= visitTs && (alert?.severity === 'Priority' || Number(alert?.priority || 0) >= 6);
  }).length, [state?.recentAlertEvents, lastVisitAt]);

  const alertSummary = useMemo(() => ({
    title: priorityAlertCountSinceVisit
      ? `${priorityAlertCountSinceVisit} priority alert${priorityAlertCountSinceVisit === 1 ? '' : 's'} tonight`
      : newAlertCountSinceVisit
        ? `${newAlertCountSinceVisit} meaningful change${newAlertCountSinceVisit === 1 ? '' : 's'} since your last check`
        : 'No major changes tonight',
    detail: priorityAlertCountSinceVisit
      ? 'The sharpest posture flips, alignment shifts, and catalyst-backed moves are being surfaced first.'
      : newAlertCountSinceVisit
        ? 'Watchlist assets and bigger signal shifts are being tracked so return visits feel instantly useful.'
        : 'The board is calm right now. Smaller moves are being suppressed until they become meaningful.',
    badge: priorityAlertCountSinceVisit
      ? `${priorityAlertCountSinceVisit} priority`
      : newAlertCountSinceVisit
        ? `${newAlertCountSinceVisit} new alerts`
        : 'Calm session',
    watchlistLabel: `${state?.watchlist?.length || 0} watchlist names tracked`,
  }), [newAlertCountSinceVisit, priorityAlertCountSinceVisit, state?.watchlist]);


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

          if (state?.signalSoundsEnabled) {
            const nextSoundKey = buildAlertSoundKey(allAlerts);
            const context = audioContextRef.current;
            if (
              nextSoundKey
              && nextSoundKey !== lastPlayedAlertKeyRef.current
              && audioUnlockedRef.current
              && context
              && context.state === 'running'
            ) {
              try {
                const oscillator = context.createOscillator();
                const gain = context.createGain();
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(880, context.currentTime);
                gain.gain.setValueAtTime(0.0001, context.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.03, context.currentTime + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.14);
                oscillator.connect(gain);
                gain.connect(context.destination);
                oscillator.start(context.currentTime);
                oscillator.stop(context.currentTime + 0.14);
                lastPlayedAlertKeyRef.current = nextSoundKey;
              } catch {}
            }
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
    writeGrowthLoopState(growthLoop);
  }, [growthLoop]);

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


  const growthSummary = useMemo(() => {
    const referred = Boolean(growthLoop?.activeReferral?.code);
    const rewardReady = Number(growthLoop?.signups || 0) >= 3;
    return {
      inviteCode: growthLoop?.referralCode || 'MSCODE',
      visits: Number(growthLoop?.visits || 0),
      signups: Number(growthLoop?.signups || 0),
      shares: Number(growthLoop?.shares || 0),
      downloads: Number(growthLoop?.downloads || 0),
      rewardLabel: rewardReady ? 'Invite reward unlocked' : `Invite ${Math.max(0, 3 - Number(growthLoop?.signups || 0))} more to unlock 7 days Pro`,
      referralLabel: referred ? `Active invite: ${growthLoop.activeReferral.code}` : 'No referral attached yet',
    };
  }, [growthLoop]);

  async function shareSignalCard(asset = topSignal) {
    if (typeof window === 'undefined' || !asset) return;
    const payload = buildSharePayload(asset, signalContext, growthLoop?.referralCode);
    try {
      if (navigator.share) {
        await navigator.share({ title: payload.title, text: payload.text, url: payload.shareUrl });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload.text);
      }
      setGrowthLoop((previous) => ({ ...previous, shares: Number(previous.shares || 0) + 1, lastSharedAt: new Date().toISOString() }));
      setShareStatus(`Share ready for ${asset.symbol}.`);
    } catch {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(payload.text);
          setGrowthLoop((previous) => ({ ...previous, shares: Number(previous.shares || 0) + 1, lastSharedAt: new Date().toISOString() }));
          setShareStatus(`Copied ${asset.symbol} share text.`);
        } catch {
          setShareStatus('Unable to share right now.');
        }
      } else {
        setShareStatus('Unable to share right now.');
      }
    }
  }

  async function copyReferralLink() {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/?ref=${encodeURIComponent(growthSummary.inviteCode)}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus('Referral link copied.');
    } catch {
      setShareStatus(url);
    }
  }

  function downloadTopSignalCard(asset = topSignal) {
    if (!asset) return;
    const ok = downloadSignalCard(asset, signalContext, growthLoop?.referralCode);
    if (ok) {
      setGrowthLoop((previous) => ({ ...previous, downloads: Number(previous.downloads || 0) + 1 }));
      setShareStatus(`${asset.symbol} signal card downloaded.`);
    }
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
      setGrowthLoop((previous) => {
        const nextSignups = Number(previous.signups || 0) + 1;
        return {
          ...previous,
          signups: nextSignups,
          unlockedTrial: previous.unlockedTrial || nextSignups >= 3,
        };
      });
      setWaitlistEmail('');
    } catch (error) {
      setWaitlistStatus(error?.message || 'Could not start email sign-in.');
    }
  }


  function applyOnboardingChoice(patch = {}) {
    const next = sanitizeOnboardingProfile({ ...onboardingProfile, ...patch });
    setOnboardingProfile(next);
    return next;
  }

  function completeOnboarding() {
    const completedAt = new Date().toISOString();
    const profile = sanitizeOnboardingProfile({ ...onboardingProfile, completedAt });
    setOnboardingProfile(profile);
    setState((previous) => ({
      ...previous,
      mode: profile.userType === 'Beginner' ? 'Beginner' : 'Pro',
      strategy: profile.userType === 'Long-term' ? 'Position' : profile.userType === 'Active trader' ? 'Scalp' : 'Swing',
      timeframe: profile.userType === 'Active trader' ? '15M' : profile.userType === 'Long-term' ? '4H' : '1H',
      preferredDashboardFocus: profile.goal === 'Get alerts' ? 'alerts' : profile.goal === 'Track signals' ? 'board' : 'top-signal',
      onboardingCompletedAt: completedAt,
      onboardingUserType: profile.userType,
      onboardingGoal: profile.goal,
    }));
    setOnboardingOpen(false);
    setOnboardingStep(1);
  }

  function dismissIntroHints() {
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem(INTRO_HINTS_STORAGE_KEY, 'dismissed'); } catch {}
    }
    setOnboardingProfile((previous) => ({ ...previous, hintsDismissed: true }));
  }

  function jumpTo(id) {
    if (typeof document === 'undefined') return;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const signalContext = useMemo(() => buildSignalContext(topSignal, rankedAssets, state.watchlist, regimeSummary, { items: contextItems, meta: contextMeta }), [topSignal, rankedAssets, state.watchlist, regimeSummary, contextItems, contextMeta]);
  const ritualStatus = useMemo(() => buildDailyRitualStatus(lastVisitAt, marketUpdatedAt, topSignal, visitIntelligence), [lastVisitAt, marketUpdatedAt, topSignal, visitIntelligence]);

  const onboardingSummary = useMemo(() => ({
    title: onboardingProfile.goal === 'Get alerts' ? 'Track high-signal changes fast' : onboardingProfile.goal === 'Track signals' ? 'Scan the board with more confidence' : "Learn tonight's signal without the clutter",
    detail: onboardingProfile.userType === 'Active trader' ? 'Faster timeframes and a tighter scan path are now favored.' : onboardingProfile.userType === 'Long-term' ? 'The app leans into calmer posture and bigger timeframe context.' : 'Beginner mode keeps the learning layer visible while you build rhythm.',
  }), [onboardingProfile]);

  const showIntroHints = Boolean(onboardingProfile.completedAt) && !onboardingProfile.hintsDismissed;

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
          growthSummary={growthSummary}
          inviteBanner={inviteBanner}
          onShareSignal={() => shareSignalCard(topSignal)}
          onCopyReferral={copyReferralLink}
          onOpenControls={() => {
            setAlertAsset(null);
            setControlOpen(true);
          }}
        />

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

        />

        {onboardingOpen ? (
          <section className="onboarding-shell card" aria-label="First-time onboarding">
            <div className="onboarding-head">
              <div>
                <div className="eyebrow">First-time setup</div>
                <h2 className="section-title">Make Midnight Signal click in under a minute</h2>
              </div>
              <span className="badge glow-badge">Step {onboardingStep} of 2</span>
            </div>
            {onboardingStep === 1 ? (
              <>
                <p className="muted small">Choose the path that feels closest to how you actually use the market.</p>
                <div className="onboarding-option-grid">
                  {['Beginner', 'Active trader', 'Long-term'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`onboarding-option ${onboardingProfile.userType === option ? 'is-active' : ''}`}
                      onClick={() => applyOnboardingChoice({ userType: option })}
                    >
                      <strong>{option}</strong>
                      <span>{option === 'Beginner' ? 'Keep explanations visible and the flow calmer.' : option === 'Active trader' ? 'Prioritize quicker reads and tighter reaction loops.' : 'Bias toward steadier posture and bigger timeframe context.'}</span>
                    </button>
                  ))}
                </div>
                <div className="onboarding-actions">
                  <button type="button" className="primary-button" onClick={() => setOnboardingStep(2)}>Continue</button>
                </div>
              </>
            ) : (
              <>
                <p className="muted small">Now choose what you want Midnight Signal to do for you first.</p>
                <div className="onboarding-option-grid compact">
                  {['Learn', 'Track signals', 'Get alerts'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`onboarding-option ${onboardingProfile.goal === option ? 'is-active' : ''}`}
                      onClick={() => applyOnboardingChoice({ goal: option })}
                    >
                      <strong>{option}</strong>
                      <span>{option === 'Learn' ? 'Lead with plain-English guidance and why it matters.' : option === 'Track signals' ? 'Center the board, watchlist, and posture shifts.' : 'Surface the most meaningful changes and notification-ready moves.'}</span>
                    </button>
                  ))}
                </div>
                <div className="onboarding-summary">
                  <div className="onboarding-summary-title">{onboardingSummary.title}</div>
                  <div className="muted small">{onboardingSummary.detail}</div>
                </div>
                <div className="onboarding-actions">
                  <button type="button" className="ghost-button" onClick={() => setOnboardingStep(1)}>Back</button>
                  <button type="button" className="primary-button" onClick={completeOnboarding}>Start tonight&apos;s signal</button>
                </div>
              </>
            )}
          </section>
        ) : null}

        {showIntroHints ? (
          <section className="guided-session card" aria-label="Guided first session">
            <div className="guided-session-head">
              <div>
                <div className="eyebrow">Guided first session</div>
                <h2 className="section-title">Start here, then let the deeper layers earn their place</h2>
              </div>
              <button type="button" className="ghost-button small" onClick={dismissIntroHints}>Hide tips</button>
            </div>
            <div className="guided-session-grid">
              <div className="guided-tip"><strong>1. Tonight&apos;s Top Signal</strong><span>Use this as your anchor before scanning the rest of the board.</span></div>
              <div className="guided-tip"><strong>2. Why it matters</strong><span>Open the context layer to see what may be driving the signal tonight.</span></div>
              <div className="guided-tip"><strong>3. Since your last visit</strong><span>This is your habit loop — come back and compare what strengthened, weakened, or flipped.</span></div>
            </div>
          </section>
        ) : null}


        <section className="growth-loop-grid" aria-label="Growth loop">
          <div className="growth-loop-card card">
            <div className="growth-loop-head">
              <div>
                <div className="eyebrow">Share tonight&apos;s signal</div>
                <h2 className="section-title">Turn a strong read into a shareable signal card</h2>
              </div>
              <span className="badge glow-badge">v11.75 X bridge armed</span>
            </div>
            <div className="growth-loop-actions">
              <button type="button" className="primary-button" onClick={() => shareSignalCard(topSignal)}>Share Tonight&apos;s Signal 🌙</button>
              <button type="button" className="ghost-button" onClick={() => downloadTopSignalCard(topSignal)}>Download signal card</button>
              <button type="button" className="ghost-button" onClick={copyReferralLink}>Copy referral link</button>
            </div>
            <div className="growth-share-preview">
              <div className="growth-preview-symbol">{topSignal?.symbol || '--'} <span>{Math.round(topSignal?.conviction || 0)}%</span></div>
              <div className="growth-preview-copy">{topSignal?.signalLabel || 'Mixed posture'} • {safeText(topSignal?.watchNext, '') || safeText(signalContext?.whyThisIsHappening, 'Watch for the next confirmation cycle.')}</div>
              <div className="growth-preview-meta">{safeText(safeList(signalContext?.relatedCatalysts)[0]?.headline, '') || safeText(signalContext?.catalystTitle, '') || safeText(signalContext?.marketContext?.headline, 'No clear catalyst detected')} </div>
            </div>
            <div className="capture-status muted small">{shareStatus || "Share text includes your referral code so interested users land on tonight's signal with your invite attached."}</div>
          </div>

          <div className="growth-loop-card card growth-loop-stats-card">
            <div className="eyebrow">Referral engine</div>
            <h3 className="section-title">Growth without a spammy loop</h3>
            <div className="growth-stats-grid">
              <div className="growth-stat"><span>Code</span><strong>{growthSummary.inviteCode}</strong></div>
              <div className="growth-stat"><span>Visits</span><strong>{growthSummary.visits}</strong></div>
              <div className="growth-stat"><span>Signups</span><strong>{growthSummary.signups}</strong></div>
              <div className="growth-stat"><span>Shares</span><strong>{growthSummary.shares}</strong></div>
            </div>
            <div className="growth-referral-note">{growthSummary.rewardLabel}</div>
            <div className="muted small">{growthSummary.referralLabel}. Invite 3 and unlock a 7-day Pro reward path for founding users.</div>
          </div>
        </section>

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
            {inviteBanner ? <div className="invite-banner">{inviteBanner}</div> : null}
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
              <div className="landing-mini-copy">{safeText(decisionLayer?.statusLabel, '') || safeText(topSignal?.signalLabel, 'Top signal ready')} • {safeText(signalContext?.marketContext?.headline, 'Context loading')}</div>
            </div>
            <div className="landing-mini-grid">
              <div className="landing-mini-stat"><span>Context</span><strong>{safeText(signalContext?.catalystTitle, 'Catalyst watch armed')}</strong></div>
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
                  <div className="preview-sub-copy">{safeText(signalContext?.whyThisIsHappening, 'Momentum, trend, and volatility are fused into one plain-English read.')}</div>
                </div>
                <div className="preview-subcard">
                  <div className="preview-sub-label">Catalyst</div>
                  <div className="preview-sub-copy">{safeText(signalContext?.catalystSummary, 'Possible catalyst matching now sits next to the signal instead of in a noisy feed.')}</div>
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
          Build v11.75.1 · Top Signal First / scroll compression hotfix · source: {marketSource} · updated {marketUpdatedAt ? new Date(marketUpdatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'pending'}
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
        onShare={(asset) => shareSignalCard(asset)}
      />
    </main>
  );
}