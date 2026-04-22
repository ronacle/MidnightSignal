'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import TonightBrief from '@/components/signals/TonightBrief';
import TopSignalCard from '@/components/signals/TopSignalCard';

const VISIT_STORAGE_KEY = 'midnight-signal-last-visit';
const SNAPSHOT_STORAGE_KEY = 'midnight-signal-last-top-signal';
const USER_BIAS_STORAGE_KEY = 'midnight-signal-user-bias';
const PLAN_STORAGE_KEY = 'midnight-signal-plan';

function UpgradeModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="upgrade-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="upgrade-modal-title">
      <div className="upgrade-modal-card">
        <div className="upgrade-modal-header">
          <div>
            <div className="eyebrow">Midnight Signal Pro</div>
            <h2 id="upgrade-modal-title" className="section-title">Go deeper with Midnight Signal Pro</h2>
          </div>
          <button type="button" className="ghost-button upgrade-close" onClick={onClose} aria-label="Close upgrade dialog">
            ✕
          </button>
        </div>

        <div className="upgrade-modal-price">Early access · $9/month · cancel anytime</div>

        <div className="upgrade-modal-list">
          <div className="upgrade-modal-item">Deeper validation context when a setup deserves a closer read</div>
          <div className="upgrade-modal-item">Signal follow-through and regime insights that build trust over time</div>
          <div className="upgrade-modal-item">More detailed multi-timeframe and forward signal context</div>
          <div className="upgrade-modal-item">More alert depth and premium monitoring tools as they roll out</div>
        </div>

        <div className="upgrade-modal-note">
          Free stays genuinely useful. Pro simply unlocks deeper context, stronger validation, and more advanced follow-through tools. Midnight Signal is educational, not financial advice.
        </div>

        <div className="upgrade-modal-actions">
          <a className="primary-button upgrade-link-button" href="/api/stripe/checkout">
            Continue to secure checkout
          </a>
          <button type="button" className="ghost-button" onClick={onClose}>Maybe later</button>
        </div>
      </div>
    </div>
  );
}

export default function LeadSignalPanel({
  asset,
  state,
  setState,
  marketSource,
  marketUpdatedAt,
  marketReady,
  signalHistory = [],
  validationSummary = null,
  regimeSummary = null,
  forwardValidation = [],
  forwardScorecard = null,
  adaptiveSummary = [],
  decisionLayer = null,
}) {
  const [expanded, setExpanded] = useState(false);
  const [sessionState, setSessionState] = useState(state || {});
  const [persistedSnapshot, setPersistedSnapshot] = useState(null);
  const [userBias, setUserBias] = useState(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [planTier, setPlanTier] = useState(state?.planTier || 'basic');
  const breakdownRef = useRef(null);

  const awarenessState = useMemo(() => {
    return {
      ...(sessionState || {}),
      lastTopSignalSnapshot: persistedSnapshot,
      userBias,
      planTier,
    };
  }, [sessionState, persistedSnapshot, userBias, planTier]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedVisit = window.localStorage.getItem(VISIT_STORAGE_KEY);
      const storedSnapshot = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
      const storedBias = window.localStorage.getItem(USER_BIAS_STORAGE_KEY);
      const storedPlan = window.localStorage.getItem(PLAN_STORAGE_KEY);
      const resolvedPlan = state?.planTier || storedPlan || 'basic';

      setSessionState((current) => ({
        ...(current || {}),
        ...(state || {}),
        lastViewedAt: storedVisit || current?.lastViewedAt || null,
      }));

      if (storedSnapshot) setPersistedSnapshot(JSON.parse(storedSnapshot));
      if (storedBias) setUserBias(JSON.parse(storedBias));
      setPlanTier(resolvedPlan);
    } catch {
      setSessionState((current) => ({ ...(current || {}), ...(state || {}) }));
    }
  }, [state]);

  useEffect(() => {
    setPlanTier(state?.planTier || 'basic');
  }, [state?.planTier]);

  useEffect(() => {
    if (!asset || typeof window === 'undefined') return;

    const now = Date.now();
    const snapshot = {
      symbol: asset.symbol,
      signalScore: Number(asset.signalScore ?? asset.conviction ?? 0),
      sentiment: asset.sentiment,
      regime: regimeSummary?.regime || asset.marketRegime || null,
      timestamp: new Date(now).toISOString(),
    };

    try {
      const existingVisit = window.localStorage.getItem(VISIT_STORAGE_KEY);
      const existingSnapshotRaw = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
      const existingSnapshot = existingSnapshotRaw ? JSON.parse(existingSnapshotRaw) : null;
      const existingAgeMs = existingSnapshot?.timestamp ? now - new Date(existingSnapshot.timestamp).getTime() : null;
      const canRollForwardSnapshot = !Number.isFinite(existingAgeMs) || existingAgeMs > 1000 * 60 * 2;

      if (canRollForwardSnapshot) {
        window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
      }

      if (!existingVisit || canRollForwardSnapshot) {
        window.localStorage.setItem(VISIT_STORAGE_KEY, new Date(now).toISOString());
      }

      window.localStorage.setItem(PLAN_STORAGE_KEY, planTier);
    } catch {
      // no-op
    }
  }, [asset, regimeSummary, planTier]);

  useEffect(() => {
    if (!expanded || !breakdownRef.current || typeof window === 'undefined') return;

    const timer = window.setTimeout(() => {
      breakdownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 140);

    return () => window.clearTimeout(timer);
  }, [expanded]);



  function handleExpand() {
    if (planTier !== 'pro') {
      setUpgradeOpen(true);
      return;
    }
    setExpanded((value) => !value);
  }

  if (!asset) return null;

  return (
    <>
      <section className="lead-signal-panel" id="top-signal">
        <div className="plan-status-row">
          <div className="eyebrow">Access</div>
          <span className={`badge plan-status-badge tier-${planTier}`}>{planTier === 'pro' ? 'Pro' : 'Basic'}</span>
        </div>

        <TonightBrief
          asset={asset}
          timeframe={state?.timeframe}
          signalHistory={signalHistory}
          validationSummary={validationSummary}
          regimeSummary={regimeSummary}
          decisionLayer={decisionLayer}
          state={awarenessState}
          forwardScorecard={forwardScorecard}
        />

        <div className="lead-signal-actions">
          <button
            type="button"
            className={`ghost-button lead-signal-toggle ${expanded ? 'is-open' : ''} ${planTier !== 'pro' ? 'is-gated' : ''}`}
            onClick={handleExpand}
            aria-expanded={expanded}
            aria-controls="lead-signal-breakdown"
          >
            <span>{planTier === 'pro' ? (expanded ? 'Hide full signal breakdown' : 'View full signal breakdown') : 'See what Pro adds'}</span>
            <span className="lead-signal-toggle-icon" aria-hidden="true">{planTier === 'pro' ? '⌄' : '🔒'}</span>
          </button>
        </div>

        {planTier !== 'pro' ? (
          <div className="compact-pro-callout">
            <div className="compact-pro-copy">
              <div className="eyebrow">Optional deeper view</div>
              <div className="muted">Your free nightly read stays on the page. Pro details open only when you choose them.</div>
            </div>
            <button type="button" className="ghost-button" onClick={() => setUpgradeOpen(true)}>See what Pro adds</button>
          </div>
        ) : null}

        <div
          ref={breakdownRef}
          className={`lead-signal-breakdown-shell ${expanded ? 'is-open' : ''}`}
          aria-hidden={!expanded}
        >
          <div className="lead-signal-breakdown" id="lead-signal-breakdown">
            <TopSignalCard
              asset={asset}
              state={{ ...(state || {}), planTier }}
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
              title="Full Signal Breakdown"
              embedded
            />
          </div>
        </div>

      </section>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </>
  );
}
