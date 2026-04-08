'use client';

import { useEffect, useMemo } from 'react';
import { formatPct, formatPrice } from '@/lib/utils';

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

function getSessionLabel() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning scan';
  if (hour < 17) return 'Midday check';
  return 'Evening scan';
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

function getConfidenceState(asset, validationSummary, state) {
  const snapshot = state?.lastTopSignalSnapshot;
  const currentScore = Number(asset?.signalScore ?? asset?.conviction ?? 0);
  const previousScore = Number(snapshot?.signalScore ?? currentScore);
  const validation = String(validationSummary?.scoreTrend || '').toLowerCase();

  if (validation.includes('improv') || currentScore - previousScore >= 4) return 'Rising';
  if (validation.includes('weak') || previousScore - currentScore >= 4) return 'Weakening';
  return 'Stable';
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
  const currentScore = Number(asset?.signalScore ?? asset?.conviction ?? 0);
  const previousScore = Number(snapshot?.signalScore ?? 0);

  if (!snapshot?.symbol || !current) {
    return `Since your last visit · first snapshot on this device · viewed ${lastViewed}`;
  }

  if (snapshot.symbol !== current) {
    return `Since your last visit · leadership rotated ${snapshot.symbol} → ${current} · viewed ${lastViewed}`;
  }

  if (Number.isFinite(currentScore) && Number.isFinite(previousScore) && Math.abs(currentScore - previousScore) >= 3) {
    const direction = currentScore > previousScore ? 'conviction increased' : 'conviction softened';
    return `Since your last visit · ${current} stayed in front and ${direction} by ${Math.abs(currentScore - previousScore)} pts · viewed ${lastViewed}`;
  }

  return `Since your last visit · ${current} remains in front with a steady read · viewed ${lastViewed}`;
}

function getSignalAlerts(asset, regimeSummary, state) {
  const alerts = [];
  const snapshot = state?.lastTopSignalSnapshot;
  const currentScore = Number(asset?.signalScore ?? asset?.conviction ?? 0);
  const previousScore = Number(snapshot?.signalScore ?? 0);
  const currentRegime = regimeSummary?.regime || asset?.marketRegime || null;
  const previousRegime = snapshot?.regime || null;

  if (snapshot?.symbol && snapshot.symbol !== asset?.symbol) {
    alerts.push(`🔔 ${asset.symbol} replaced ${snapshot.symbol} as the top signal`);
  }

  if (snapshot?.symbol === asset?.symbol && Number.isFinite(currentScore) && Number.isFinite(previousScore) && Math.abs(currentScore - previousScore) >= 4) {
    const delta = currentScore - previousScore;
    alerts.push(`🔔 Conviction ${delta > 0 ? 'increased' : 'softened'} by ${Math.abs(delta)} pts`);
  }

  if (previousRegime && currentRegime && previousRegime !== currentRegime) {
    alerts.push(`🔔 Regime shifted to ${toSentence(currentRegime)}`);
  }

  return alerts.slice(0, 2);
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
  const signalAlerts = getSignalAlerts(asset, regimeSummary, state);
  const tonightPlan = getTonightPlan(asset, validationSummary, regimeSummary, decisionLayer, topDrivers, profile);
  const confidenceState = getConfidenceState(asset, validationSummary, state);
  const performanceInsight = getPerformanceInsight(forwardScorecard, state);
  const pulseEnabled = Boolean(state?.livePulseEnabled);
  const sessionLabel = getSessionLabel();

  const briefRows = useMemo(() => {
    const rows = [
      {
        key: 'read',
        label: "Tonight's Read",
        content: tonightRead,
      },
      {
        key: 'why',
        label: 'Why It Matters',
        content: whyItMatters,
      },
      {
        key: 'changed',
        label: 'What Changed',
        content: whatChanged,
      },
      {
        key: 'trigger',
        label: watchTrigger.label,
        trigger: true,
        text: watchTrigger.text,
        note: watchTrigger.note,
      },
    ];

    if (profile.isPro) {
      return [rows[0], rows[3], rows[1], rows[2]];
    }

    return rows;
  }, [tonightRead, whyItMatters, whatChanged, watchTrigger, profile.isPro]);

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
        <span className="compact-brief-session-value">{sessionLabel}</span>
        <span className="compact-brief-session-divider">•</span>
        <span className="compact-brief-session-value">{toSentence(profile.strategy)} style</span>
      </div>

      <div className="compact-brief-since">
        <span className="signal-dot brief-signal-dot" aria-hidden="true" />
        <span>{sinceLastVisit}</span>
      </div>

      {signalAlerts.length ? (
        <div className="signal-alerts">
          {signalAlerts.map((alert) => (
            <div className="signal-alert-chip" key={alert}>{alert}</div>
          ))}
        </div>
      ) : null}

      <div className="compact-brief-plan">
        <div className="compact-brief-plan-header">
          <div className="eyebrow">Tonight&apos;s Plan</div>
          <span className={`badge compact-brief-plan-badge mode-${tonightPlan.actionMode.toLowerCase()}`}>{tonightPlan.actionMode}</span>
        </div>
        <div className="compact-brief-plan-grid">
          <div className="compact-brief-plan-item">
            <span className="compact-brief-plan-label">Posture</span>
            <span className="compact-brief-plan-text">{tonightPlan.posture}</span>
          </div>
          <div className="compact-brief-plan-item">
            <span className="compact-brief-plan-label">Approach</span>
            <span className="compact-brief-plan-text">{tonightPlan.approach}</span>
          </div>
          <div className="compact-brief-plan-item">
            <span className="compact-brief-plan-label">Focus</span>
            <span className="compact-brief-plan-text">{tonightPlan.focus}</span>
          </div>
        </div>
      </div>

      <div className="compact-brief-main">
        <div className={`value brief-value ${pulseEnabled ? 'live-signal-value' : ''}`}>
          {asset.symbol} · {asset.sentiment}
        </div>
        <div className="compact-brief-price-row">
          <span className="badge compact-brief-price-badge">{formatPrice(asset.price)}</span>
          <span className={`badge compact-brief-change-badge ${(asset.change24h || 0) >= 0 ? 'is-up' : 'is-down'}`}>
            24h {formatPct(asset.change24h || 0)}
          </span>
          <span className={`badge compact-confidence-badge state-${confidenceState.toLowerCase()} ${(confidenceState === 'Rising' || confidenceState === 'Weakening') ? 'is-pulsing' : ''}`}>
            Confidence: {confidenceState}
          </span>
        </div>
        <p className="muted compact-brief-story">
          {profile.isPro ? asset.story : asset.story}
        </p>
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

      <div className="compact-brief-rows">
        {briefRows.map((row) => row.trigger ? (
          <div className="compact-brief-row compact-brief-watch-row" key={row.key}>
            <span className="compact-brief-label compact-brief-watch-label">{row.label}</span>
            <span className="compact-brief-text compact-brief-watch-text">
              <strong>{row.text}</strong>
              <span className="compact-brief-watch-note">{row.note}</span>
            </span>
          </div>
        ) : (
          <div className="compact-brief-row" key={row.key}>
            <span className="compact-brief-label">{row.label}</span>
            <span className="compact-brief-text">{row.content}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
