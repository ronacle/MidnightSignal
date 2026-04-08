'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import TopNav from '@/components/layout/TopNav';
import HeroSection from '@/components/layout/HeroSection';
import Top20Grid from '@/components/signals/Top20Grid';
import LeadSignalPanel from '@/components/signals/LeadSignalPanel';
import ControlDrawer from '@/components/panels/ControlDrawer';
import LearningDrawer from '@/components/panels/LearningDrawer';
import AssetDetailSheet from '@/components/panels/AssetDetailSheet';
import { MARKET_FIXTURES } from '@/lib/default-state';
import { useAccountSync } from '@/hooks/useAccountSync';
import { shouldRefreshEntitlement } from '@/lib/entitlements';
import { rankAssets, buildSignalSnapshot, detectMarketRegime } from '@/lib/signal-engine';
import { appendSignalSnapshot, buildValidationSummary, readSignalHistory } from '@/lib/signal-history';
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
  const [priorityAlerts, setPriorityAlerts] = useState([]);
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

  const sinceLastVisitSummary = useMemo(() => {
    const previous = previousSignalEntry;
    const bits = [];

    if (previous?.symbol && previous.symbol !== topSignal?.symbol) {
      bits.push(`Top signal flipped from ${previous.symbol} to ${topSignal.symbol}`);
    } else if (typeof previous?.conviction === 'number' && typeof topSignal?.conviction === 'number') {
      const delta = Math.round(topSignal.conviction - previous.conviction);
      if (delta > 0) bits.push(`${topSignal.symbol} conviction is up ${delta} pts`);
      else if (delta < 0) bits.push(`${topSignal.symbol} conviction cooled ${Math.abs(delta)} pts`);
    }

    if (watchlistHighlights[0]) {
      const mover = watchlistHighlights[0];
      const direction = (mover.change24h || 0) >= 0 ? 'up' : 'down';
      bits.push(`Watchlist: ${mover.symbol} ${direction} ${Math.abs(mover.change24h || 0).toFixed(1)}%`);
    }

    if (regimeSummary?.regime) {
      bits.push(`Market tone: ${String(regimeSummary.regime).replace(/-/g, ' ')}`);
    }

    if (!bits.length) bits.push(`Top signal remains ${topSignal?.symbol || 'the same'} with ${topSignal?.conviction ?? '--'}% conviction`);

    return bits.slice(0, 3);
  }, [previousSignalEntry, topSignal, watchlistHighlights, regimeSummary]);

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
      setLastVisitAt(window.localStorage.getItem('midnight-signal-last-visit-at'));
    } catch {
      setLastVisitAt(null);
    }
  }, []);

  useEffect(() => {
    if (!marketReady || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('midnight-signal-last-visit-at', new Date().toISOString());
    } catch {
      // no-op
    }
  }, [marketReady, topSignal?.symbol, topSignal?.conviction]);


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

          <Top20Grid
            state={state}
            setState={setState}
            onAssetOpen={setDetailAsset}
            assets={rankedAssets}
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
          Build v11.49 · Plan-aware dashboard polish + locked/unlocked cleanup · source: {marketSource}
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