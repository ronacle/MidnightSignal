'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import TonightBrief from '@/components/signals/TonightBrief';
import TopSignalCard from '@/components/signals/TopSignalCard';

const VISIT_STORAGE_KEY = 'midnight-signal-last-visit';
const SNAPSHOT_STORAGE_KEY = 'midnight-signal-last-top-signal';

export default function LeadSignalPanel({
  asset,
  state,
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
  const breakdownRef = useRef(null);

  const awarenessState = useMemo(() => {
    return {
      ...(sessionState || {}),
      lastTopSignalSnapshot: persistedSnapshot,
    };
  }, [sessionState, persistedSnapshot]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedVisit = window.localStorage.getItem(VISIT_STORAGE_KEY);
      const storedSnapshot = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);

      setSessionState((current) => ({
        ...(current || {}),
        ...(state || {}),
        lastViewedAt: storedVisit || current?.lastViewedAt || null,
      }));

      if (storedSnapshot) {
        setPersistedSnapshot(JSON.parse(storedSnapshot));
      }
    } catch {
      setSessionState((current) => ({ ...(current || {}), ...(state || {}) }));
    }
  }, [state]);

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
    } catch {
      // no-op
    }
  }, [asset, regimeSummary]);

  useEffect(() => {
    if (!expanded || !breakdownRef.current || typeof window === 'undefined') return;

    const timer = window.setTimeout(() => {
      breakdownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 140);

    return () => window.clearTimeout(timer);
  }, [expanded]);

  if (!asset) return null;

  return (
    <section className="lead-signal-panel" id="top-signal">
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
          className={`ghost-button lead-signal-toggle ${expanded ? 'is-open' : ''}`}
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls="lead-signal-breakdown"
        >
          <span>{expanded ? 'Hide full signal breakdown' : 'View full signal breakdown'}</span>
          <span className="lead-signal-toggle-icon" aria-hidden="true">⌄</span>
        </button>
      </div>

      <div
        ref={breakdownRef}
        className={`lead-signal-breakdown-shell ${expanded ? 'is-open' : ''}`}
        aria-hidden={!expanded}
      >
        <div className="lead-signal-breakdown" id="lead-signal-breakdown">
          <TopSignalCard
            asset={asset}
            state={state}
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
  );
}
