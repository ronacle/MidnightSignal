'use client';

export default function TonightBrief({ asset, timeframe, signalHistory = [], validationSummary = null, regimeSummary = null }) {
  if (!asset) return null;

  const factorPairs = [
    ['Momentum', asset?.factors?.momentum],
    ['Trend', asset?.factors?.trend],
    ['Volume', asset?.factors?.volume],
    ['Relative Strength', asset?.factors?.relativeStrength],
    ['Volatility', asset?.factors?.volatility],
  ].filter(([, value]) => typeof value === 'number');

  const topDrivers = factorPairs
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([label]) => label);

  const previous = signalHistory[1];
  const changeLine = previous
    ? previous.symbol === asset.symbol
      ? `Top signal unchanged (${asset.symbol}).`
      : `Signal rotated from ${previous.symbol} to ${asset.symbol}.`
    : 'First stored snapshot.';

  const regimeLine = regimeSummary
    ? `Regime: ${regimeSummary.regime}.`
    : 'Regime loading.';

  return (
    <div className="panel compact-brief-panel" id="brief">
      <div className="row space-between">
        <div>
          <h2 className="section-title">Tonight&apos;s Brief</h2>
          <div className="eyebrow compact-brief-subtitle">Why the top signal matters</div>
        </div>
        <span className="badge">{timeframe}</span>
      </div>

      <div className="compact-brief-grid">
        <div className="compact-brief-main">
          <div className="value brief-value">{asset.symbol} · {asset.sentiment}</div>
          <div className="muted">{asset.story}</div>
        </div>

        <div className="compact-brief-side">
          {topDrivers.length ? <div className="compact-brief-chip">Drivers: {topDrivers.join(' · ')}</div> : null}
          <div className="compact-brief-chip">{regimeLine}</div>
          <div className="compact-brief-chip">{changeLine}</div>
          {validationSummary ? <div className="compact-brief-chip">Validation: {validationSummary.scoreTrend}</div> : null}
        </div>
      </div>
    </div>
  );
}
