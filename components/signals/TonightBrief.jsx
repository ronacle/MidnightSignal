'use client';

function toSentence(value) {
  if (!value) return '';
  const text = String(value).replace(/[_-]+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatRelative(dateString) {
  if (!dateString) return 'this session';
  const diffMs = Date.now() - new Date(dateString).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'recently';

  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  return `${days}d ago`;
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

function getSinceLastVisit(asset, signalHistory, state) {
  const previous = signalHistory?.[1];
  const current = asset?.symbol;
  const currentScore = Number(asset?.signalScore ?? asset?.conviction ?? 0);
  const previousScore = Number(previous?.signalScore ?? 0);
  const lastViewed = state?.lastViewedAt ? formatRelative(state.lastViewedAt) : 'this session';

  if (!previous?.symbol || !current) {
    return `Since your last visit · first snapshot on this device · viewed ${lastViewed}`;
  }

  if (previous.symbol !== current) {
    return `Since your last visit · leadership rotated ${previous.symbol} → ${current} · viewed ${lastViewed}`;
  }

  if (Number.isFinite(currentScore) && Number.isFinite(previousScore) && Math.abs(currentScore - previousScore) >= 3) {
    const direction = currentScore > previousScore ? 'conviction increased' : 'conviction softened';
    return `Since your last visit · ${current} stayed in front and ${direction} by ${Math.abs(currentScore - previousScore)} pts · viewed ${lastViewed}`;
  }

  return `Since your last visit · ${current} remains in front with a steady read · viewed ${lastViewed}`;
}

function getWatchTrigger(asset, validationSummary, regimeSummary, topDrivers) {
  const sentiment = String(asset?.sentiment || '').toLowerCase();
  const validation = String(validationSummary?.scoreTrend || '').toLowerCase();
  const regime = String(regimeSummary?.regime || '').toLowerCase();

  if (sentiment === 'bullish') {
    if (topDrivers.includes('volume')) {
      return {
        label: 'Trigger',
        text: 'Volume expands and holds on the next push higher.',
        note: 'That would upgrade this from a promising read to stronger conviction.'
      };
    }
    if (topDrivers.includes('trend')) {
      return {
        label: 'Trigger',
        text: 'Trend structure keeps holding through the next continuation attempt.',
        note: 'That would confirm the leader is still earning its spot.'
      };
    }
    if (validation.includes('weak') || regime.includes('chop') || regime.includes('range')) {
      return {
        label: 'Trigger',
        text: 'Price breaks cleanly out of the current range with follow-through.',
        note: 'That is the clearest sign this setup is escaping noisy conditions.'
      };
    }
    return {
      label: 'Trigger',
      text: 'The next push higher shows cleaner follow-through than the last one.',
      note: 'That would turn a constructive read into a more decisive one.'
    };
  }

  if (sentiment === 'bearish') {
    if (topDrivers.includes('volatility')) {
      return {
        label: 'Trigger',
        text: 'Bounce attempts fail quickly and downside expansion returns.',
        note: 'That would confirm sellers are still in control.'
      };
    }
    return {
      label: 'Trigger',
      text: 'Support weakens and rebounds lose strength.',
      note: 'That would keep the defensive posture intact.'
    };
  }

  if (topDrivers.includes('momentum')) {
    return {
      label: 'Trigger',
      text: 'Momentum resolves with a cleaner directional push.',
      note: 'The next move matters more than the current snapshot.'
    };
  }

  return {
    label: 'Trigger',
    text: 'Price breaks clearly in either direction.',
    note: 'That is the next clue that this neutral read is resolving.'
  };
}

export default function TonightBrief({
  asset,
  timeframe,
  signalHistory = [],
  validationSummary = null,
  regimeSummary = null,
  decisionLayer = null,
  state = null,
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
  const watchTrigger = getWatchTrigger(asset, validationSummary, regimeSummary, topDrivers);
  const sinceLastVisit = getSinceLastVisit(asset, signalHistory, state);
  const pulseEnabled = Boolean(state?.livePulseEnabled);

  return (
    <section className="panel compact-brief-panel" id="brief">
      <div className="compact-brief-header">
        <div>
          <div className="eyebrow compact-brief-kicker lead-brief-eyebrow">Tonight</div>
          <h2 className="section-title compact-brief-title lead-brief-title">Top Signal Brief</h2>
          <div className="eyebrow compact-brief-subtitle">Human translation of the lead setup</div>
        </div>
        <span className="badge compact-brief-badge">{timeframe}</span>
      </div>

      <div className="compact-brief-since">
        <span className="signal-dot brief-signal-dot" aria-hidden="true" />
        <span>{sinceLastVisit}</span>
      </div>

      <div className="compact-brief-main">
        <div className={`value brief-value ${pulseEnabled ? 'live-signal-value' : ''}`}>
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

        <div className="compact-brief-row compact-brief-watch-row">
          <span className="compact-brief-label compact-brief-watch-label">{watchTrigger.label}</span>
          <span className="compact-brief-text compact-brief-watch-text">
            <strong>{watchTrigger.text}</strong>
            <span className="compact-brief-watch-note">{watchTrigger.note}</span>
          </span>
        </div>
      </div>
    </section>
  );
}
