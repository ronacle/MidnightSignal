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
  forwardScorecard = null
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
    />
  );
}
