'use client';

import TopSignal from '@/components/TopSignal';

export default function TopSignalCard({ asset, mode, strategy, source, updatedAt, liveReady }) {
  return (
    <TopSignal
      asset={asset}
      mode={mode}
      strategy={strategy}
      source={source}
      updatedAt={updatedAt}
      liveReady={liveReady}
    />
  );
}
