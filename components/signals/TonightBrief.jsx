'use client';

function toSentence(value) {
  if (!value) return '';
  const text = String(value).replace(/[_-]+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getTonightRead(asset, decisionLayer, regimeSummary, validationSummary) {
  const sentiment = String(asset?.sentiment || '').toLowerCase();
  const regime = String(regimeSummary?.regime || '').toLowerCase();
  const validation = String(validationSummary?.scoreTrend || '').toLowerCase();
  const stance = String(decisionLayer?.stance || decisionLayer?.posture || '').toLowerCase();

  if (sentiment === 'bullish') {
    if (validation.includes('strong') || stance.includes('aggressive')) {
      return 'Constructive bullish posture — strength is present and the setup is carrying real support.';
    }
    if (regime.includes('risk-on') || regime.includes('trend')) {
      return 'Cautiously bullish — the setup is leaning higher, but still wants confirmation.';
    }
    return 'Measured bullish posture — upside is favored, though conviction is not fully expanded.';
  }

  if (sentiment === 'bearish') {
    if (validation.includes('strong') || stance.includes('defensive')) {
      return 'Defensive posture — downside pressure is meaningful and risk control matters here.';
    }
    return 'Cautiously bearish — weakness is showing, but follow-through still needs to prove itself.';
  }

  return 'Neutral posture — the signal is informative, but the edge is still mixed tonight.';
}

function getWhyItMatters(asset, regimeSummary, topDrivers) {
  const symbol = asset?.symbol || 'This asset';
  const regime = regimeSummary?.regime ? toSentence(regimeSummary.regime) : 'a mixed regime';
  const driverText = topDrivers.length
    ? `${topDrivers.join(' and ')} are doing the heaviest lifting`
    : 'the current signal stack is doing the heavy lifting';

  return `${symbol} is leading tonight because ${driverText}, while the broader backdrop still reflects ${regime.toLowerCase()}.`;
}

function getWhatChanged(asset, signalHistory) {
  const current = asset?.symbol;
  const previous = signalHistory?.[1];

  if (!previous?.symbol || !current) {
    return 'This is the first stored snapshot, so there is no prior leader to compare yet.';
  }

  if (previous.symbol === current) {
    return `${current} remains the lead signal, which points to continuity rather than rotation.`;
  }

  return `Leadership rotated from ${previous.symbol} to ${current}, suggesting the market is rewarding a different setup tonight.`;
}

function getWhatToWatch(asset, validationSummary, regimeSummary) {
  const sentiment = String(asset?.sentiment || '').toLowerCase();
  const validation = String(validationSummary?.scoreTrend || '').toLowerCase();
  const regime = String(regimeSummary?.regime || '').toLowerCase();

  if (sentiment === 'bullish') {
    if (validation.includes('weak') || regime.includes('chop') || regime.includes('range')) {
      return 'Watch for stronger follow-through and cleaner confirmation before treating this as a full-conviction move.';
    }
    return 'Watch for trend continuation and volume support — that is what would keep this setup in control.';
  }

  if (sentiment === 'bearish') {
    return 'Watch for failed bounces and renewed weakness — that would confirm the downside posture is still in charge.';
  }

  return 'Watch for a cleaner break in either direction — that is the next clue that this neutral read is resolving.';
}

export default function TonightBrief({
  asset,
  timeframe,
  signalHistory = [],
  validationSummary = null,
  regimeSummary = null,
  decisionLayer = null,
}) {
  if (!asset) return null;

  const factorPairs = [
    ['momentum', asset?.factors?.momentum],
    ['trend', asset?.factors?.trend],
    ['volume', asset?.factors?.volume],
    ['relative strength', asset?.factors?.relativeStrength],
    ['volatility', asset?.factors?.volatility],
  ].filter(([, value]) => typeof value === 'number');

  const topDrivers = factorPairs
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([label]) => label);

  const tonightRead = getTonightRead(asset, decisionLayer, regimeSummary, validationSummary);
  const whyItMatters = getWhyItMatters(asset, regimeSummary, topDrivers);
  const whatChanged = getWhatChanged(asset, signalHistory);
  const whatToWatch = getWhatToWatch(asset, validationSummary, regimeSummary);

  return (
    <section className="panel compact-brief-panel" id="brief">
      <div className="compact-brief-header">
        <div>
          <h2 className="section-title compact-brief-title">Tonight&apos;s Brief</h2>
          <div className="eyebrow compact-brief-subtitle">Human translation of the lead setup</div>
        </div>
        <span className="badge compact-brief-badge">{timeframe}</span>
      </div>

      <div className="compact-brief-main">
        <div className="value brief-value">
          {asset.symbol} · {asset.sentiment}
        </div>
        <p className="muted compact-brief-story">
          {asset.story}
        </p>
      </div>

      <div className="compact-brief-rows">
        <div className="compact-brief-row">
          <span className="compact-brief-label">Tonight&apos;s Read</span>
          <span className="compact-brief-text">{tonightRead}</span>
        </div>

        <div className="compact-brief-row">
          <span className="compact-brief-label">Why It Matters</span>
          <span className="compact-brief-text">{whyItMatters}</span>
        </div>

        <div className="compact-brief-row">
          <span className="compact-brief-label">What Changed</span>
          <span className="compact-brief-text">{whatChanged}</span>
        </div>

        <div className="compact-brief-row">
          <span className="compact-brief-label">What to Watch</span>
          <span className="compact-brief-text">{whatToWatch}</span>
        </div>
      </div>
    </section>
  );
}
