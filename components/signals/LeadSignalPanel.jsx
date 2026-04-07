'use client';

import { useMemo, useState } from 'react';
import TopSignal from '@/components/TopSignal';
import { getConvictionTier } from '@/lib/utils';

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

export default function LeadSignalPanel({
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
}) {
  const [expanded, setExpanded] = useState(false);

  const topDrivers = useMemo(() => {
    const factorPairs = [
      ['momentum', asset?.factors?.momentum],
      ['trend', asset?.factors?.trend],
      ['volume', asset?.factors?.volume],
      ['relative strength', asset?.factors?.relativeStrength],
      ['volatility', asset?.factors?.volatility],
    ].filter(([, value]) => typeof value === 'number');

    return factorPairs
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([label]) => label);
  }, [asset]);

  if (!asset) return null;

  const tonightRead = getTonightRead(asset, decisionLayer, regimeSummary, validationSummary);
  const whyItMatters = getWhyItMatters(asset, regimeSummary, topDrivers);
  const whatChanged = getWhatChanged(asset, signalHistory);
  const whatToWatch = getWhatToWatch(asset, validationSummary, regimeSummary);

  return (
    <section className="panel lead-signal-panel stack" id="top-signal">
      <div className="row space-between lead-signal-header">
        <div>
          <h2 className="section-title lead-signal-title">Tonight&apos;s Top Signal <span className="signal-dot" aria-hidden="true" /></h2>
          <div className="eyebrow">Start with the brief, then open the full system breakdown if you want more depth.</div>
        </div>
        <span className={`sentiment ${asset.sentiment}`}>{asset.sentiment}</span>
      </div>

      <div className="lead-identity-card">
        <div>
          <div className="eyebrow">Lead asset</div>
          <div className="value">{asset.symbol} · {asset.name}</div>
        </div>
        <div className="muted">{asset.story}</div>
        <div className="row lead-badge-row">
          <span className="badge">{asset.signalScore ?? asset.conviction}% score</span>
          <span className="badge">{getConvictionTier(asset.signalScore ?? asset.conviction)}</span>
          <span className="badge">{state?.mode} mode</span>
          <span className="badge">{state?.strategy}</span>
          {state?.timeframe ? <span className="badge">{state.timeframe}</span> : null}
        </div>
      </div>

      <div className="compact-brief-rows lead-brief-rows">
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

      <div className="lead-signal-actions row">
        <button
          type="button"
          className={expanded ? 'ghost-button' : 'button'}
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls="lead-signal-breakdown"
        >
          {expanded ? 'Hide full signal breakdown' : 'View full signal breakdown'}
        </button>
      </div>

      {expanded ? (
        <div id="lead-signal-breakdown" className="lead-signal-detail-wrap">
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
            embedded
            title="Full signal breakdown"
          />
        </div>
      ) : null}
    </section>
  );
}
