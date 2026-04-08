'use client';

import { useEffect, useMemo, useState } from 'react';
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
  const motionKey = useMemo(() => {
    if (!asset) return 'empty';
    return `${asset.symbol}:${asset.signalScore ?? asset.conviction ?? 0}:${asset.sentiment ?? 'neutral'}`;
  }, [asset]);

  const [flash, setFlash] = useState(false);
  const conviction = Number(asset?.signalScore ?? asset?.conviction ?? 0);
  const pulseTone = conviction >= 70 ? 'pulse-strong' : conviction < 45 ? 'pulse-cautious' : 'pulse-steady';

  useEffect(() => {
    if (!asset || typeof window === 'undefined') return;
    setFlash(true);
    const timer = window.setTimeout(() => setFlash(false), 650);
    return () => window.clearTimeout(timer);
  }, [motionKey, asset]);

  return (
    <div className={`top-signal-shell ${pulseTone} ${flash ? 'signal-flash-shell' : ''}`}>
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
    </div>
  );
}
