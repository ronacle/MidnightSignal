'use client';

import { useState } from 'react';
import TonightBrief from '@/components/signals/TonightBrief';
import TopSignalCard from '@/components/signals/TopSignalCard';

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
