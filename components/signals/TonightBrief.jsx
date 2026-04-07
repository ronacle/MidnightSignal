'use client';

export default function TonightBrief({ asset, timeframe }) {
  if (!asset) return null;

  const factors = asset.factors || {};
  const factorPairs = [
    ['Momentum', factors.momentum],
    ['Trend', factors.trend],
    ['Volume', factors.volume],
    ['Relative Strength', factors.relativeStrength],
    ['Volatility', factors.volatility],
  ].filter(([, value]) => typeof value === 'number');

  const topDrivers = factorPairs
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label]) => label);

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
            Strongest factors tonight: {topDrivers.join(' · ')}.
          </div>
        ) : null}
      </div>
      <div className="notice small">
        The brief now follows the system-selected top signal, not the asset opened in the detail sheet.
      </div>
    </div>
  );
}
