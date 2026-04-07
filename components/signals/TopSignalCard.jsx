'use client';

import TopSignal from '@/components/TopSignal';

export default function TopSignalCard({ asset, state, marketSource, marketUpdatedAt, marketReady }) {
  return (
    <TopSignal
      asset={asset}
      state={state}
      marketSource={marketSource}
      marketUpdatedAt={marketUpdatedAt}
      marketReady={marketReady}
    />
  );
}
