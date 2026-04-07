'use client';

export default function TonightBrief({
  asset,
  timeframe,
  signalHistory = [],
  validationSummary = null,
  regimeSummary = null,
}) {
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
      ? `${asset.symbol} remains the top signal.`
      : `Top signal rotated from ${previous.symbol} to ${asset.symbol}.`
    : 'First stored snapshot.';

  const regimeLine = regimeSummary?.regime
    ? regimeSummary.regime
    : 'Loading';

  const validationLine = validationSummary?.scoreTrend
    ? validationSummary.scoreTrend
    : null;

  return (
    <section className="panel compact-brief-panel" id="brief">
      <div className="compact-brief-header">
        <div>
          <h2 className="section-title compact-brief-title">Tonight's Brief</h2>
          <div className="eyebrow compact-brief-subtitle">Why the top signal matters</div>
        </div>
        <span className="badge compact-brief-badge">{timeframe}</span>
      </div>

      <div className="compact-brief-main">
        <div className="value brief-value">
          {asset.symbol} · {asset.sentiment}
        </div>
        <p className="muted compact-brief-story">{asset.story}</p>
      </div>

      <div className="compact-brief-rows">
        {topDrivers.length ? (
          <div className="compact-brief-row">
            <span className="compact-brief-label">Drivers</span>
            <span className="compact-brief-text">{topDrivers.join(' · ')}</span>
          </div>
        ) : null}

        <div className="compact-brief-row">
          <span className="compact-brief-label">Regime</span>
          <span className="compact-brief-text">{regimeLine}</span>
        </div>

        <div className="compact-brief-row">
          <span className="compact-brief-label">Shift</span>
          <span className="compact-brief-text">{changeLine}</span>
        </div>

        {validationLine ? (
          <div className="compact-brief-row">
            <span className="compact-brief-label">Validation</span>
            <span className="compact-brief-text">{validationLine}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
