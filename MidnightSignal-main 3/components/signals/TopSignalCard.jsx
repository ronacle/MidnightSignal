'use client';

import TopSignal from '@/components/TopSignal';

export default function TopSignalCard({
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
  title,
  embedded = false,
}) {
  return (
    <TopSignal
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
      title={title}
      embedded={embedded}
    />
  );
}
