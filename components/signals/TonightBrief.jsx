'use client';

import { useEffect } from 'react';
import { formatPct, formatPrice } from '@/lib/utils';
import { buildLeadLiveIntelligence } from '@/lib/live-intelligence';
import { getConvictionComparison, getConvictionPointLabel } from '@/lib/conviction-intelligence';

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

function formatUpdateStamp(dateString) {
  if (!dateString) return 'Awaiting refresh';
  return `Updated ${formatRelative(dateString)}`;
}

function getConfidenceDirectionLabel(confidenceState = 'Stable') {
  if (confidenceState === 'Rising') return '↑ Rising';
  if (confidenceState === 'Weakening') return '↓ Fading';
  return '→ Steady';
}

function getSessionLabel() {
  return 'Current session';
}

function getUserProfile(state) {
  const mode = String(state?.mode || 'Beginner');
  const strategy = String(state?.strategy || 'swing').toLowerCase();
  const preference = state?.uiPreference || 'brief-first';

  return {
    mode,
    strategy,
    isPro: mode.toLowerCase() === 'pro',
    preference,
  };
}

function getStrategyFlavor(strategy) {
  if (strategy === 'scalp') {
    return {
      triggerFocus: 'immediate follow-through',
      focusPriority: ['momentum', 'volatility', 'volume', 'trend'],
      approach: 'Stay quick, stay selective, and only act on clean confirmation.',
    };
  }
  if (strategy === 'position') {
    return {
      triggerFocus: 'structural confirmation',
      focusPriority: ['trend', 'relative strength', 'volume', 'momentum'],
      approach: 'Think in structure first and let the market earn longer holding time.',
    };
  }
  return {
    triggerFocus: 'balanced confirmation',
    focusPriority: ['trend', 'volume', 'momentum', 'relative strength'],
    approach: 'Balance confirmation with patience and avoid forcing early conviction.',
  };
}

function sortDriversByStrategy(drivers, strategy) {
  const order = getStrategyFlavor(strategy).focusPriority;
  return [...drivers].sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

function formatFactorName(label = '') {
  return String(label || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (value) => value.toUpperCase());
}

function describeTimeframeShift(current = {}, previous = {}) {
  const frames = [
    ['5m', Number(current?.tf5m ?? 0), Number(previous?.tf5m ?? 0)],
    ['15m', Number(current?.tf15m ?? 0), Number(previous?.tf15m ?? 0)],
    ['1h', Number(current?.tf1h ?? 0), Number(previous?.tf1h ?? 0)],
  ].filter(([, now, prev]) => Number.isFinite(now) && Number.isFinite(prev));

  const strengthened = frames.filter(([, now, prev]) => now - prev >= 4).map(([label]) => label);
  const softened = frames.filter(([, now, prev]) => prev - now >= 4).map(([label]) => label);

  if (strengthened.length) {
    return `${strengthened.join(' and ')} momentum strengthened.`;
  }

  if (softened.length) {
    return `${softened.join(' and ')} momentum softened.`;
  }

  return null;
}

function describeFactorShift(asset, previousEntry = null) {
  const currentFactors = asset?.factors || {};
  const previousFactors = previousEntry?.factors || {};

  const changes = Object.entries(currentFactors)
    .map(([label, value]) => ({
      label,
      diff: Number(value || 0) - Number(previousFactors?.[label] || 0),
    }))
    .filter((entry) => Math.abs(entry.diff) >= 4)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  if (!changes.length) return null;

  const lead = changes[0];
  return `${formatFactorName(lead.label)} ${lead.diff > 0 ? 'improved' : 'cooled'} most.`;
}

function buildSignalIntelligence(asset, signalHistory = [], state = null, decisionLayer = null, watchTrigger = null) {
  const previousEntry = signalHistory?.[1] || state?.lastTopSignalSnapshot || null;
  const currentScore = Number(asset?.signalScore ?? asset?.conviction ?? 0);
  const previousScore = Number(previousEntry?.signalScore ?? currentScore);
  const bullets = [];

  if (previousEntry?.symbol && previousEntry.symbol !== asset?.symbol) {
    bullets.push(`Leadership rotated ${previousEntry.symbol} → ${asset.symbol}.`);
  } else if (Number.isFinite(currentScore) && Number.isFinite(previousScore) && Math.abs(currentScore - previousScore) >= 3) {
    bullets.push(`${asset.symbol} conviction ${currentScore > previousScore ? 'strengthened' : 'softened'} by ${Math.abs(currentScore - previousScore)} pts.`);
  } else {
    bullets.push(`${asset.symbol} is still leading with a steadier read.`);
  }

  const timeframeShift = describeTimeframeShift(asset?.timeframe || {}, previousEntry?.timeframe || {});
  if (timeframeShift) bullets.push(timeframeShift);

  const factorShift = describeFactorShift(asset, previousEntry);
  if (factorShift && !bullets.includes(factorShift)) bullets.push(factorShift);

  if ((!timeframeShift && !factorShift) && Array.isArray(decisionLayer?.changeSummary)) {
    const nextChange = decisionLayer.changeSummary.find((item) => !String(item || '').toLowerCase().includes('no major'));
    if (nextChange) bullets.push(`${nextChange}.`);
  }

  if (watchTrigger?.text) {
    bullets.push(`Watch next: ${watchTrigger.text}`);
  }

  return bullets.slice(0, 3);
}


function getConfidenceState(asset, validationSummary, state) {
  const snapshot = state?.lastTopSignalSnapshot;
  const currentScore = Number(asset?.signalScore ?? asset?.conviction ?? 0);
  const previousScore = Number(snapshot?.signalScore ?? currentScore);
  const validation = String(validationSummary?.scoreTrend || '').toLowerCase();

  if (validation.includes('improv') || currentScore - previousScore >= 4) return 'Rising';
  if (validation.includes('weak') || previousScore - currentScore >= 4) return 'Weakening';
  return 'Stable';
}

function getConvictionRow(asset, state, confidenceState) {
  const snapshot = state?.lastTopSignalSnapshot;
  const comparison = getConvictionComparison({
    currentSymbol: asset?.symbol,
    previousSymbol: snapshot?.symbol,
    currentScore: asset?.signalScore ?? asset?.conviction,
    previousScore: snapshot?.signalScore ?? snapshot?.conviction,
    currentCapturedAt: asset?.lastUpdated,
    previousCapturedAt: snapshot?.timestamp,
  });

  const points = getConvictionPointLabel(comparison);

  if (comparison.mode === 'rotation') {
    return {
      tone: 'shift',
      label: 'Conviction rotated',
      note: `${asset?.symbol || 'This asset'} took over from ${snapshot?.symbol || 'the prior leader'}, so treat this as a fresh read instead of a clean point comparison.`,
    };
  }

  if (comparison.mode === 'improving') {
    return {
      tone: 'rising',
      label: `Conviction building${points ? ` ${points}` : ''}`,
      note: 'The read is gaining support without needing exaggerated point jumps.',
    };
  }

  if (comparison.mode === 'fading') {
    return {
      tone: 'softening',
      label: `Conviction easing${points ? ` ${points}` : ''}`,
      note: 'The leader is still intact, but the setup needs fresh confirmation before leaning harder.',
    };
  }

  if (comparison.mode === 'too-far-apart') {
    return {
      tone: 'steady',
      label: 'Conviction reset',
      note: 'The prior read is too far apart for a clean point comparison, so the app is favoring signal language over fake precision.',
    };
  }

  if (confidenceState === 'Rising') {
    return {
      tone: 'rising',
      label: 'Conviction improving',
      note: 'The setup is leaning better, but it still wants the next move to confirm the read.',
    };
  }

  if (confidenceState === 'Weakening') {
    return {
      tone: 'softening',
      label: 'Conviction softening',
      note: 'The posture is still usable, but the read is losing urgency rather than expanding.',
    };
  }

  return {
    tone: 'steady',
    label: 'Conviction steady',
    note: 'Nothing is breaking here, but the next move still matters more than the current print.',
  };
}

function getNarrativePlanSummary(tonightPlan, profile) {
  const mode = String(tonightPlan?.actionMode || 'Wait');
  if (mode === 'Attack') return profile.isPro ? 'Lean with strength only while confirmation stays intact.' : 'Lean in only while strength stays confirmed.';
  if (mode === 'Probe') return profile.isPro ? 'Treat this as a test position until conviction expands.' : 'Stay small until the market proves the setup deserves more trust.';
  if (mode === 'Defend') return profile.isPro ? 'Protect capital first and let failed bounces prove otherwise.' : 'Risk control matters more than forcing a reversal here.';
  return profile.isPro ? 'Stay patient and let the next move sharpen the read.' : 'Wait for clearer confirmation before committing harder.';
}

function getTonightRead(asset, decisionLayer, regimeSummary, validationSummary, profile) {
  const sentiment = String(asset?.sentiment || '').toLowerCase();
  const regime = String(regimeSummary?.regime || '').toLowerCase();
  const validation = String(validationSummary?.scoreTrend || '').toLowerCase();
  const stance = String(decisionLayer?.stance || decisionLayer?.posture || '').toLowerCase();

  if (profile.isPro) {
    if (sentiment === 'bullish') {
      if (validation.includes('strong') || stance.includes('aggressive')) return 'Bullish with support expanding.';
      if (regime.includes('risk-on') || regime.includes('trend')) return 'Bullish lean, confirmation still matters.';
      return 'Bullish bias, conviction still maturing.';
    }
    if (sentiment === 'bearish') {
      if (validation.includes('strong') || stance.includes('defensive')) return 'Bearish pressure is in control.';
      return 'Bearish lean, follow-through still needs proof.';
    }
    return 'Neutral read, edge still mixed.';
  }

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

function getWhyItMatters(asset, regimeSummary, topDrivers, profile) {
  const symbol = asset?.symbol || 'This asset';
  const regime = regimeSummary?.regime ? toSentence(regimeSummary.regime) : 'a mixed regime';
  const driverText = topDrivers.length
    ? `${topDrivers.join(' and ')} are doing the heaviest lifting`
    : 'the current signal stack is doing the heavy lifting';

  if (profile.isPro) {
    return `${symbol} is on top because ${driverText}, with the broader tape still reflecting ${regime.toLowerCase()}.`;
  }

  return `${symbol} is leading tonight because ${driverText}, while the broader backdrop still reflects ${regime.toLowerCase()}.`;
}

function getWhatChanged(asset, signalHistory, snapshot, profile) {
  const current = asset?.symbol;
  const previous = snapshot?.symbol ? snapshot : signalHistory?.[1];

  if (!previous?.symbol || !current) {
    return profile.isPro
      ? 'No prior lead snapshot yet.'
      : 'This is the first stored snapshot, so there is no prior leader to compare yet.';
  }

  if (previous.symbol === current) {
    return profile.isPro
      ? `${current} stayed in front.`
      : `${current} remains the lead signal, which points to continuity rather than rotation.`;
  }

  return profile.isPro
    ? `Lead rotated ${previous.symbol} → ${current}.`
    : `Leadership rotated from ${previous.symbol} to ${current}, suggesting the market is rewarding a different setup tonight.`;
}

function getSinceLastVisit(asset, state) {
  const snapshot = state?.lastTopSignalSnapshot;
  const lastViewed = state?.lastViewedAt ? formatRelative(state.lastViewedAt) : 'this session';
  const current = asset?.symbol;
  const comparison = getConvictionComparison({
    currentSymbol: current,
    previousSymbol: snapshot?.symbol,
    currentScore: asset?.signalScore ?? asset?.conviction,
    previousScore: snapshot?.signalScore ?? snapshot?.conviction,
    currentCapturedAt: asset?.lastUpdated,
    previousCapturedAt: snapshot?.timestamp,
  });

  if (!snapshot?.symbol || !current) {
    return `Since your last visit · first tracked session on this device · viewed ${lastViewed}`;
  }

  if (comparison.mode === 'rotation') {
    return `Since your last visit · leadership rotated ${snapshot.symbol} → ${current} · viewed ${lastViewed}`;
  }

  if (comparison.mode === 'improving') {
    const pointLabel = getConvictionPointLabel(comparison);
    return `Since your last visit · ${current} stayed in front and conviction is improving${pointLabel ? ` (${pointLabel})` : ''} · viewed ${lastViewed}`;
  }

  if (comparison.mode === 'fading') {
    const pointLabel = getConvictionPointLabel(comparison);
    return `Since your last visit · ${current} stayed in front but conviction is softening${pointLabel ? ` (${pointLabel})` : ''} · viewed ${lastViewed}`;
  }

  if (comparison.mode === 'too-far-apart') {
    return `Since your last visit · ${current} stayed in front, but the prior read is too far apart for a clean point comparison · viewed ${lastViewed}`;
  }

  return `Since your last visit · ${current} remains in front with a steady read · viewed ${lastViewed}`;
}


function getWatchTrigger(asset, validationSummary, regimeSummary, topDrivers, profile) {
  const sentiment = String(asset?.sentiment || '').toLowerCase();
  const validation = String(validationSummary?.scoreTrend || '').toLowerCase();
  const regime = String(regimeSummary?.regime || '').toLowerCase();
  const strategyFlavor = getStrategyFlavor(profile.strategy);
  const prioritizedDrivers = sortDriversByStrategy(topDrivers, profile.strategy);

  if (sentiment === 'bullish') {
    if (prioritizedDrivers.includes('volume')) {
      return {
        label: profile.isPro ? 'Trigger' : 'Trigger',
        text: profile.strategy === 'scalp'
          ? 'Volume hits immediately on the next push higher.'
          : 'Volume expands and holds on the next push higher.',
        note: profile.isPro
          ? `That is your cleanest ${strategyFlavor.triggerFocus} cue.`
          : 'That would upgrade this from a promising read to stronger conviction.'
      };
    }
    if (prioritizedDrivers.includes('trend')) {
      return {
        label: 'Trigger',
        text: profile.strategy === 'position'
          ? 'Structure keeps holding through the next higher-low test.'
          : 'Trend structure keeps holding through the next continuation attempt.',
        note: profile.isPro
          ? 'That keeps the leader structurally valid.'
          : 'That would confirm the leader is still earning its spot.'
      };
    }
    if (validation.includes('weak') || regime.includes('chop') || regime.includes('range')) {
      return {
        label: 'Trigger',
        text: 'Price breaks cleanly out of the current range with follow-through.',
        note: profile.isPro
          ? 'You need cleaner resolution before leaning harder.'
          : 'That is the clearest sign this setup is escaping noisy conditions.'
      };
    }
    return {
      label: 'Trigger',
      text: 'The next push higher shows cleaner follow-through than the last one.',
      note: profile.isPro
        ? 'That turns the bias into a more actionable read.'
        : 'That would turn a constructive read into a more decisive one.'
    };
  }

  if (sentiment === 'bearish') {
    if (prioritizedDrivers.includes('volatility')) {
      return {
        label: 'Trigger',
        text: 'Bounce attempts fail quickly and downside expansion returns.',
        note: profile.isPro
          ? 'That keeps downside control intact.'
          : 'That would confirm sellers are still in control.'
      };
    }
    return {
      label: 'Trigger',
      text: 'Support weakens and rebounds lose strength.',
      note: profile.isPro
        ? 'That preserves the defensive posture.'
        : 'That would keep the defensive posture intact.'
    };
  }

  if (prioritizedDrivers.includes('momentum')) {
    return {
      label: 'Trigger',
      text: 'Momentum resolves with a cleaner directional push.',
      note: profile.isPro
        ? 'The next impulse matters more than the current print.'
        : 'The next move matters more than the current snapshot.'
    };
  }

  return {
    label: 'Trigger',
    text: 'Price breaks clearly in either direction.',
    note: profile.isPro
      ? 'That is the next usable clue.'
      : 'That is the next clue that this neutral read is resolving.'
  };
}

function getTonightPlan(asset, validationSummary, regimeSummary, decisionLayer, topDrivers, profile) {
  const sentiment = String(asset?.sentiment || '').toLowerCase();
  const validation = String(validationSummary?.scoreTrend || '').toLowerCase();
  const regime = String(regimeSummary?.regime || '').toLowerCase();
  const posture = decisionLayer?.posture || (sentiment === 'bullish' ? 'Constructive' : sentiment === 'bearish' ? 'Defensive' : 'Neutral');
  const strategyFlavor = getStrategyFlavor(profile.strategy);
  const prioritizedDrivers = sortDriversByStrategy(topDrivers, profile.strategy);

  let actionMode = 'Wait';
  if (sentiment === 'bullish' && (validation.includes('strong') || regime.includes('trend') || regime.includes('risk-on'))) {
    actionMode = 'Attack';
  } else if (sentiment === 'bullish') {
    actionMode = 'Probe';
  } else if (sentiment === 'bearish') {
    actionMode = 'Defend';
  }

  let approach = 'Stay patient and let the setup clarify before committing harder.';
  if (actionMode === 'Attack') {
    approach = profile.strategy === 'position'
      ? 'Lean into strength only if structure keeps holding rather than reacting to every uptick.'
      : 'Lean into continuation only if strength stays confirmed instead of chasing a weak push.';
  } else if (actionMode === 'Probe') {
    approach = profile.strategy === 'scalp'
      ? 'Treat this as a quick test and stay small until the tape confirms immediately.'
      : 'Treat this as an early setup and size cautiously until confirmation improves.';
  } else if (actionMode === 'Defend') {
    approach = profile.strategy === 'position'
      ? 'Prioritize preservation and only re-engage when structure proves it deserves more trust.'
      : 'Favor risk control and let weak bounces prove otherwise before getting aggressive.';
  }

  let focus = strategyFlavor.approach;
  if (prioritizedDrivers.includes('volume')) {
    focus = profile.strategy === 'scalp' ? 'Fast volume confirmation.' : 'Volume support on the next move.';
  } else if (prioritizedDrivers.includes('trend')) {
    focus = profile.strategy === 'position' ? 'Structure holding across the higher-timeframe read.' : 'Trend structure holding cleanly.';
  } else if (prioritizedDrivers.includes('momentum')) {
    focus = 'Momentum resolving with direction.';
  } else if (prioritizedDrivers.includes('volatility')) {
    focus = 'Whether expansion is controlled or chaotic.';
  }

  return { posture, actionMode, approach, focus };
}

function getPerformanceInsight(forwardScorecard, state) {
  if (!forwardScorecard) {
    return 'Advanced performance insights coming soon.';
  }

  const regimeRows = Array.isArray(forwardScorecard.regimePerformance) ? forwardScorecard.regimePerformance : [];
  const bestRegime = regimeRows
    .filter((row) => typeof row?.avgReturn === 'number')
    .sort((a, b) => b.avgReturn - a.avgReturn)[0];

  if (bestRegime?.regime) {
    return `Signals have recently performed best in ${String(bestRegime.regime).toLowerCase()} conditions.`;
  }

  if (typeof forwardScorecard.hitRate === 'number' && forwardScorecard.hitRate < 45) {
    return 'Recent conditions have been less reliable, so patience matters more than frequency.';
  }

  const userBias = state?.userBias;
  if (userBias?.preferredDriver) {
    return `You tend to spend more time on ${userBias.preferredDriver} driven setups.`;
  }

  return 'Performance insight will sharpen as more scored signals accumulate.';
}

function getBestRegime(forwardScorecard) {
  const rows = Array.isArray(forwardScorecard?.regimePerformance) ? forwardScorecard.regimePerformance : [];
  const best = rows
    .filter((row) => typeof row?.avgReturn === 'number')
    .sort((a, b) => b.avgReturn - a.avgReturn)[0];
  return best?.regime || '—';
}

function getUserBias(state, topDrivers, profile) {
  const stored = state?.userBias || {};
  const preferredDriver = stored.preferredDriver || topDrivers[0] || 'trend';
  const tone = profile.isPro ? 'tight' : 'guided';
  return {
    preferredDriver,
    tone,
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
  forwardScorecard = null,
}) {
  if (!asset) return null;

  const profile = getUserProfile(state);
  const planTier = state?.planTier || 'basic';

  const factorPairs = [
    ['momentum', asset?.factors?.momentum],
    ['trend', asset?.factors?.trend],
    ['volume', asset?.factors?.volume],
    ['relative strength', asset?.factors?.relativeStrength],
    ['volatility', asset?.factors?.volatility],
  ].filter(([, value]) => typeof value === 'number');

  const rawDrivers = factorPairs
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([label]) => label);

  const topDrivers = sortDriversByStrategy(rawDrivers, profile.strategy);
  const userBias = getUserBias(state, topDrivers, profile);

  const tonightRead = getTonightRead(asset, decisionLayer, regimeSummary, validationSummary, profile);
  const whyItMatters = getWhyItMatters(asset, regimeSummary, topDrivers, profile);
  const whatChanged = getWhatChanged(asset, signalHistory, state?.lastTopSignalSnapshot, profile);
  const watchTrigger = getWatchTrigger(asset, validationSummary, regimeSummary, topDrivers, profile);
  const sinceLastVisit = getSinceLastVisit(asset, state);
  const tonightPlan = getTonightPlan(asset, validationSummary, regimeSummary, decisionLayer, topDrivers, profile);
  const confidenceState = getConfidenceState(asset, validationSummary, state);
  const signalIntelligence = buildSignalIntelligence(asset, signalHistory, state, decisionLayer, watchTrigger);
  const liveStatus = buildLeadLiveIntelligence({
    asset,
    snapshot: state?.lastTopSignalSnapshot,
    validationSummary,
    regimeSummary,
    decisionLayer,
  });
  const performanceInsight = getPerformanceInsight(forwardScorecard, state);
  const pulseEnabled = Boolean(state?.livePulseEnabled);
  const sessionLabel = getSessionLabel();
  const updateStamp = formatUpdateStamp(asset?.lastUpdated || state?.marketUpdatedAt || null);
  const convictionRow = getConvictionRow(asset, state, confidenceState);
  const planSummary = getNarrativePlanSummary(tonightPlan, profile);




  useEffect(() => {
    if (typeof window === 'undefined' || !asset?.symbol) return;

    try {
      const nextBias = {
        preferredDriver: userBias.preferredDriver,
        lastViewedSymbol: asset.symbol,
        tone: userBias.tone,
      };
      window.localStorage.setItem('midnight-signal-user-bias', JSON.stringify(nextBias));
    } catch {
      // no-op
    }
  }, [asset?.symbol, userBias]);

  return (
    <section className={`panel compact-brief-panel ${profile.isPro ? 'is-pro-brief' : 'is-beginner-brief'}`} id="brief">
      <div className="compact-brief-header">
        <div>
          <div className="eyebrow compact-brief-kicker lead-brief-eyebrow">Tonight</div>
          <h2 className="section-title compact-brief-title lead-brief-title">Top Signal Brief</h2>
          <div className="eyebrow compact-brief-subtitle">
            {profile.isPro ? 'Compressed read of the lead setup' : 'Human translation of the lead setup'}
          </div>
        </div>
        <span className="badge compact-brief-badge">{timeframe}</span>
      </div>

      <div className="compact-brief-session">
        <span className="compact-brief-session-label">Session</span>
        <span className="compact-brief-session-value" suppressHydrationWarning>{sessionLabel}</span>
        <span className="compact-brief-session-divider">•</span>
        <span className="compact-brief-session-value" suppressHydrationWarning>{updateStamp}</span>
        <span className="compact-brief-session-divider">•</span>
        <span className="compact-brief-session-value">{toSentence(profile.strategy)} style</span>
      </div>

      <div className="compact-brief-since">
        <span className="signal-dot brief-signal-dot" aria-hidden="true" />
        <span suppressHydrationWarning>{sinceLastVisit}</span>
      </div>


      <div className="top-signal-hero">
        <div className="top-signal-hero-header">
          <div className="eyebrow top-signal-hero-kicker">Tonight&apos;s top signal</div>
          <div className={`top-signal-hero-symbol ${pulseEnabled ? 'live-signal-value' : ''}`}>
            {asset.symbol} — {toSentence(asset.sentiment)}
          </div>
        </div>
        <div className="compact-brief-price-row top-signal-hero-price-row">
          <span className="badge compact-brief-price-badge">{formatPrice(asset.price)}</span>
          <span className={`badge compact-brief-change-badge ${(asset.change24h || 0) >= 0 ? 'is-up' : 'is-down'}`}>
            24h {formatPct(asset.change24h || 0)}
          </span>
          <span className={`badge compact-confidence-badge state-${confidenceState.toLowerCase()} ${(confidenceState === 'Rising' || confidenceState === 'Weakening') ? 'is-pulsing' : ''}`}>
            Confidence: {getConfidenceDirectionLabel(confidenceState)}
          </span>
        </div>
        <p className="muted compact-brief-story top-signal-hero-story">
          {asset.story}
        </p>
      </div>


      <div className={`signal-narrative-shell tone-${convictionRow.tone} ${pulseEnabled ? 'is-live' : ''}`}>
        <div className="signal-narrative-header">
          <div>
            <div className="eyebrow">Tonight&apos;s Read</div>
            <div className="signal-narrative-title">{liveStatus.status}</div>
          </div>
          <span className={`badge signal-narrative-status tone-${liveStatus.tone}`}>{liveStatus.freshness}</span>
        </div>

        <div className="signal-narrative-lead">{tonightRead}</div>
        <div className="signal-narrative-support">{liveStatus.explanation}</div>

        <div className={`signal-conviction-row tone-${convictionRow.tone}`}>
          <div className="signal-conviction-copy">
            <span className="signal-conviction-icon" aria-hidden="true">🔔</span>
            <div>
              <div className="signal-conviction-label">{convictionRow.label}</div>
              <div className="signal-conviction-note">{convictionRow.note}</div>
            </div>
          </div>
          <div className="signal-conviction-cue">{liveStatus.cue}</div>
        </div>

        <div className="signal-narrative-grid">
          <div className="signal-narrative-card signal-narrative-card-watch">
            <div className="eyebrow">What we&apos;re watching</div>
            <div className="signal-narrative-card-title">{watchTrigger.text}</div>
            <div className="signal-narrative-card-text">{watchTrigger.note}</div>
          </div>
          <div className="signal-narrative-card signal-narrative-card-plan">
            <div className="signal-narrative-card-headline">
              <div className="eyebrow">Plan</div>
              <span className={`badge compact-brief-plan-badge mode-${tonightPlan.actionMode.toLowerCase()}`}>{tonightPlan.actionMode}</span>
            </div>
            <div className="signal-narrative-card-title">{planSummary}</div>
            <div className="signal-narrative-plan-pills">
              <span className="signal-narrative-pill"><strong>Posture</strong>{tonightPlan.posture}</span>
              <span className="signal-narrative-pill"><strong>Approach</strong>{tonightPlan.approach}</span>
              <span className="signal-narrative-pill"><strong>Focus</strong>{tonightPlan.focus}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="signal-drawer-stack">
        <details className="signal-drawer" open>
          <summary>
            <span>Why this signal is leading</span>
            <span className="signal-drawer-meta">{asset.symbol} · {toSentence(asset.sentiment)}</span>
          </summary>
          <div className="signal-drawer-body">
            <p>{whyItMatters}</p>
            <div className="compact-intelligence-list">
              {signalIntelligence.map((item) => (
                <div className="compact-intelligence-item" key={item}>
                  <span className="compact-intelligence-dot" aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </details>

        <details className="signal-drawer">
          <summary>
            <span>What changed</span>
            <span className="signal-drawer-meta">Since your last visit</span>
          </summary>
          <div className="signal-drawer-body">
            <p>{whatChanged}</p>
            <p>{sinceLastVisit}</p>
          </div>
        </details>

        <details className="signal-drawer">
          <summary>
            <span>What matters next</span>
            <span className="signal-drawer-meta">Execution cue</span>
          </summary>
          <div className="signal-drawer-body">
            <p>{watchTrigger.text}</p>
            <p>{watchTrigger.note}</p>
          </div>
        </details>
      </div>
      <div className="compact-performance-panel">
        <div className="compact-performance-header">
          <div className="eyebrow">Your Signal Performance</div>
          <span className="compact-performance-coming-soon">{planTier === 'pro' ? 'Pro insight active' : 'Advanced insights coming soon'}</span>
        </div>
        <div className="compact-performance-grid">
          <div className="compact-performance-item">
            <span className="compact-performance-label">Last signals</span>
            <strong>{forwardScorecard?.trackedSignals ?? 0}</strong>
          </div>
          <div className="compact-performance-item">
            <span className="compact-performance-label">Hit rate</span>
            <strong>{typeof forwardScorecard?.hitRate === 'number' ? `${forwardScorecard.hitRate}%` : '—'}</strong>
          </div>
          <div className="compact-performance-item">
            <span className="compact-performance-label">Avg 4h</span>
            <strong>{typeof forwardScorecard?.avg4h === 'number' ? `${forwardScorecard.avg4h}%` : '—'}</strong>
          </div>
          <div className="compact-performance-item">
            <span className="compact-performance-label">Best regime</span>
            <strong>{getBestRegime(forwardScorecard)}</strong>
          </div>
        </div>
        {planTier === 'pro' ? (
          <>
            <div className="compact-performance-insight">{performanceInsight}</div>
            <div className="compact-user-bias">
              <span className="compact-user-bias-label">Your bias</span>
              <span className="compact-user-bias-text">
                {profile.isPro ? 'You prefer a tighter read' : 'You respond best to guided context'} · focus tends toward {userBias.preferredDriver}
              </span>
            </div>
          </>
        ) : (
          <div className="compact-performance-locked">
            <div className="compact-performance-locked-blur" />
            <div className="compact-performance-locked-content">
              <div className="compact-performance-insight">Unlock Pro to see deeper performance edge tracking, regime insights, and personalized behavior patterns.</div>
            </div>
          </div>
        )}
      </div>

    </section>
  );
}
