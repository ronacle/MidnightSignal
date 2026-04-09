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
      <div className="upgrade-modal-card upgrade-modal-card-wide">
        <div className="upgrade-modal-header">
          <div>
            <div className="eyebrow">Midnight Signal Pro</div>
            <h2 id="upgrade-modal-title" className="section-title">Unlock the deeper midnight layer</h2>
          </div>
          <button type="button" className="ghost-button upgrade-close" onClick={onClose} aria-label="Close upgrade dialog">
            ✕
          </button>
        </div>

        <div className="upgrade-launch-strip">
          <div>
            <strong>Founding access</strong>
            <div className="muted small">Early access pricing · secure Stripe checkout · cancel anytime</div>
          </div>
          <div className="upgrade-modal-price">$9/month</div>
        </div>

        <div className="upgrade-comparison-grid">
          <div className="upgrade-compare-card">
            <div className="eyebrow">Free</div>
            <div className="value">Nightly signal quick read</div>
            <div className="upgrade-compare-list">
              <div>Tonight&apos;s Top Signal</div>
              <div>Tonight&apos;s Brief</div>
              <div>Watchlist + alert setup</div>
              <div>Top board preview</div>
            </div>
          </div>

          <div className="upgrade-compare-card upgrade-compare-card-pro">
            <div className="eyebrow">Pro</div>
            <div className="value">Full signal intelligence</div>
            <div className="upgrade-compare-list">
              <div>Full signal breakdown + validation layer</div>
              <div>Forward tracking + regime context</div>
              <div>Premium board access and deeper revisit history</div>
              <div>Email alert delivery + synced Pro access</div>
            </div>
          </div>
        </div>

        <div className="upgrade-modal-note">
          Midnight Signal stays educational first. Pro is for users who want more context, stronger tracking, and a cleaner nightly workflow — not louder hype.
        </div>

        <div className="upgrade-modal-actions">
          <a className="primary-button upgrade-link-button" href="/api/stripe/checkout?plan=pro-founder&billing_cycle=monthly">
            Start secure checkout
          </a>
          <button type="button" className="ghost-button" onClick={onClose}>Keep exploring free</button>
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

    const snapshot = {
      symbol: asset.symbol,
      signalScore: Number(asset.signalScore ?? asset.conviction ?? 0),
      sentiment: asset.sentiment,
      regime: regimeSummary?.regime || asset.marketRegime || null,
      timestamp: new Date().toISOString(),
    };

    try {
      window.localStorage.setItem(VISIT_STORAGE_KEY, new Date().toISOString());
      window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
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
          title="Tonight's Top Signal"
        />

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
            <span>{planTier === 'pro' ? (expanded ? 'Hide full signal breakdown' : 'View full signal breakdown') : 'Unlock full signal breakdown'}</span>
            <span className="lead-signal-toggle-icon" aria-hidden="true">{planTier === 'pro' ? '⌄' : '🔒'}</span>
          </button>
        </div>

        {planTier !== 'pro' ? (
          <div className="pro-teaser-stack">
            <div className="pro-teaser-card">
              <div className="pro-teaser-blur" />
              <div className="pro-teaser-content">
                <div className="eyebrow">Launch pricing</div>
                <div className="value">Keep the quick read free. Unlock the deeper midnight lab for $9/month.</div>
                <div className="muted">Full validation, forward tracking, synced Pro access, and richer revisit history all sit behind one clean Stripe-backed plan.</div>
                <div className="row wrap-gap">
                  <button type="button" className="primary-button" onClick={() => setUpgradeOpen(true)}>See Pro plan</button>
                  <a className="ghost-button" href="/api/stripe/checkout?plan=pro-founder&billing_cycle=monthly">Upgrade now</a>
                </div>
              </div>
            </div>

            <div className="pro-preview-grid" aria-hidden="true">
              <div className="pro-preview-card">
                <div className="eyebrow">Free now</div>
                <div className="value">Fast nightly read</div>
                <div className="muted">Top signal, brief, watchlist, and alerts</div>
              </div>
              <div className="pro-preview-card">
                <div className="eyebrow">Pro unlock</div>
                <div className="value">Full validation</div>
                <div className="muted">Deeper confidence context and follow-through tracking</div>
              </div>
              <div className="pro-preview-card">
                <div className="eyebrow">Pro unlock</div>
                <div className="value">Premium revisit flow</div>
                <div className="muted">Richer context, stronger retention, cleaner nightly workflow</div>
              </div>
            </div>
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
              title="Expanded Signal Breakdown"
              embedded
            />
          </div>
        </div>

        {planTier !== 'pro' ? (
          <div className="upgrade-strip-inline">
            <div className="upgrade-strip-copy">
              <strong>Free keeps the nightly pulse. Pro adds the deeper proof.</strong>
              <span>Upgrade only when you want the full validation layer, richer revisit context, and synced premium access.</span>
            </div>
            <button type="button" className="primary-button" onClick={() => setUpgradeOpen(true)}>
              View Pro
            </button>
          </div>
        ) : null}
      </section>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </>
  );
}
