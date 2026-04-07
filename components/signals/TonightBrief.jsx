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
    .slice(0, 3)
    .map(([label]) => label);

  const previous = signalHistory[1];
  const changeLine = previous
    ? previous.symbol === asset.symbol
      ? `The top signal remains ${asset.symbol}, which suggests continuity rather than a regime shift.`
      : `The lead asset changed from ${previous.symbol} to ${asset.symbol}, so market leadership is rotating.`
    : 'This is the first stored snapshot for the current signal history.';

  const regimeLine = regimeSummary
    ? `Current regime: ${regimeSummary.regime}. This engine adapts factor weighting to fit the broader market character.`
    : 'Current regime data is still loading.';

  return (
    <div className="panel stack" id="brief">
      <div className="row space-between">
        <h2 className="section-title">Tonight&apos;s Brief</h2>
        <span className="badge">{timeframe}</span>
      </div>
      <div className="list-item stack">
        <div className="eyebrow">Why the top signal matters</div>
        <div className="value brief-value">{asset.symbol} · {asset.sentiment}</div>
        <div className="muted">{asset.story}</div>

        {topDrivers.length ? (
          <div className="notice small">
            Strongest factor drivers: {topDrivers.join(' · ')}.
          </div>
        ) : null}

        <div className="notice small">{regimeLine}</div>
        <div className="notice small">{changeLine}</div>

        {validationSummary ? (
          <div className="notice small">
            Validation status: {validationSummary.scoreTrend}. {validationSummary.directionalRead}
          </div>
        ) : null}
      </div>
      <div className="notice small">
        The brief follows the system-selected top signal, not the asset opened in the detail sheet.
      </div>
    </div>
  );
}
