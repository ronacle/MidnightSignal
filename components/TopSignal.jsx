'use client';

import { formatCompactNumber, formatPct, formatPrice, formatTime, getConvictionTier } from '@/lib/utils';

function deriveSignalStatus(asset, previousEntry) {
  const currentScore = Number(asset?.signalScore ?? asset?.conviction ?? 0);
  const previousScore = Number(previousEntry?.signalScore ?? previousEntry?.conviction ?? NaN);
  const scoreDelta = Number.isFinite(previousScore) ? Math.round(currentScore - previousScore) : 0;
  const sameLeader = previousEntry?.symbol ? previousEntry.symbol === asset?.symbol : true;

  let label = 'Unchanged';
  let tone = 'steady';

  if (!sameLeader && previousEntry?.symbol) {
    label = 'New tonight';
    tone = 'fresh';
  } else if (scoreDelta >= 3) {
    label = 'Strengthening';
    tone = 'up';
  } else if (scoreDelta <= -3) {
    label = 'Weakening';
    tone = 'down';
  }

  return {
    label,
    tone,
    scoreDelta,
    summary: !sameLeader && previousEntry?.symbol
      ? `Leadership rotated from ${previousEntry.symbol} to ${asset?.symbol}.`
      : scoreDelta >= 3
        ? `${asset?.symbol} improved by ${scoreDelta} points since the last snapshot.`
        : scoreDelta <= -3
          ? `${asset?.symbol} cooled by ${Math.abs(scoreDelta)} points since the last snapshot.`
          : `${asset?.symbol} is holding a similar read to the last snapshot.`,
  };
}

function deriveAlignment(tf = {}) {
  const rows = [
    ['5m', Number(tf?.tf5m)],
    ['15m', Number(tf?.tf15m)],
    ['1h', Number(tf?.tf1h)],
  ].filter(([, value]) => Number.isFinite(value));

  if (!rows.length) {
    return {
      label: 'Alignment building',
      summary: 'Timeframe alignment becomes more useful once more live reads come through.',
      chips: [],
    };
  }

  const strong = rows.filter(([, value]) => value >= 60).length;
  const weak = rows.filter(([, value]) => value <= 40).length;

  let label = 'Mixed alignment';
  let summary = 'Timeframes are split, so confirmation matters more than speed tonight.';

  if (strong === rows.length) {
    label = 'Aligned bullish';
    summary = '5m, 15m, and 1h are all leaning the same way, so the signal has cleaner support.';
  } else if (weak === rows.length) {
    label = 'Aligned cautious';
    summary = 'All tracked windows are soft, so rallies still need stronger proof.';
  } else if (strong >= 2) {
    label = 'Mostly aligned';
    summary = 'Most tracked windows agree, so the setup has better follow-through potential.';
  }

  return {
    label,
    summary,
    chips: rows.map(([label, value]) => ({ label, value })),
  };
}

function deriveContextHint(asset, alignment, status) {
  const volatility = Number(asset?.factors?.volatility ?? 50);
  const momentum = Number(asset?.factors?.momentum ?? 50);
  const trend = Number(asset?.factors?.trend ?? 50);

  if (status.tone === 'fresh') {
    return 'Leadership changed tonight, so let the new top signal prove itself before assuming full trend continuation.';
  }
  if (alignment.label === 'Mixed alignment') {
    return 'Trend conflict across timeframes means patience matters more than speed right now.';
  }
  if (momentum >= 65 && volatility <= 55) {
    return 'Momentum is improving after volatility cooled, which is usually a cleaner confirmation mix.';
  }
  if (trend >= 65 && momentum < 55) {
    return 'Trend is holding, but short-term momentum still needs to catch up.';
  }
  if (volatility >= 65) {
    return 'Volatility is still elevated, so confirmation beats chasing tonight.';
  }
  return 'Watch for confirmation instead of reacting to one metric in isolation.';
}

export default function TopSignal({
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
  title = "Tonight's Top Signal",
  embedded = false,
}) {
  if (!asset) return null;

  const beginner = (state?.mode || 'Beginner') === 'Beginner';
  const planTier = state?.planTier || 'basic';
  const showAdvanced = planTier === 'pro';
  const factorRows = [
    ['Momentum', asset?.factors?.momentum],
    ['Trend', asset?.factors?.trend],
    ['Volume', asset?.factors?.volume],
    ['Relative Strength', asset?.factors?.relativeStrength],
    ['Volatility', asset?.factors?.volatility],
    ['Liquidity', asset?.factors?.liquidity],
    ['Structure', asset?.factors?.structure],
  ].filter(([, value]) => typeof value === 'number');

  const recent = signalHistory.slice(0, 4);
  const forwardRecent = forwardValidation.slice(0, 5);
  const previousEntry = signalHistory[1] || null;
  const tf = asset?.timeframe || {};
  const currentAdaptive = adaptiveSummary.find((entry) => entry.regime === (regimeSummary?.regime || asset?.marketRegime));
  const topSignalMotion = Boolean(state?.livePulseEnabled);

  const confidenceBreakdown = [
    ['Trend alignment', asset?.factors?.trend],
    ['Momentum', asset?.factors?.momentum],
    ['Volatility posture', asset?.factors?.volatility],
    ['Structure', asset?.factors?.structure],
  ]
    .filter(([, value]) => typeof value === 'number')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const conviction = asset.signalScore ?? asset.conviction ?? 0;
  const convictionTone = conviction >= 70 ? 'top-signal-strong' : conviction < 45 ? 'top-signal-cautious' : '';
  const signalStatus = deriveSignalStatus(asset, previousEntry);
  const alignment = deriveAlignment(tf);
  const contextHint = deriveContextHint(asset, alignment, signalStatus);

  return (
    <div className={`panel stack ${topSignalMotion ? 'top-signal-motion' : ''} ${embedded ? 'embedded-top-signal' : ''} ${convictionTone}`}>
      <div className="row space-between">
        <h2 className="section-title">{title} <span className="signal-dot" aria-hidden="true" /></h2>
        <span className={`sentiment ${asset.sentiment}`}>{asset.sentiment}</span>
      </div>

      <div className="list-item stack">
        <div>
          <div className="eyebrow">{embedded ? 'Expanded system view' : 'System-selected lead asset'}</div>
          <div className="value">{asset.symbol} · {asset.name}</div>
          <div className="muted small">{asset.signalLabel || 'Balanced signal posture'}</div>
        </div>
        <div className="top-signal-price-row">
          <span className="signal-price">{formatPrice(asset.price)}</span>
          <span className={`signal-change ${(asset.change24h || 0) >= 0 ? 'is-up' : 'is-down'}`}>
            {formatPct(asset.change24h || 0)} 24h
          </span>
        </div>
        <div className="row wrap">
          <span className="badge">{asset.signalScore ?? asset.conviction}% score</span>
          <span className="badge">{getConvictionTier(asset.signalScore ?? asset.conviction)}</span>
          <span className={`badge signal-status-badge signal-status-${signalStatus.tone}`}>{signalStatus.label}</span>
          <span className="badge">Rank #{asset.rank ?? '—'}</span>
          <span className="badge">Vol {formatCompactNumber(asset.volumeNum)}</span>
          <span className="badge">{asset.volumeToMarketCap ?? '—'}% turnover</span>
        </div>
        <div className="muted">{asset.story}</div>

        <div className="factor-block signal-intel-block">
          <div className="eyebrow">Why this is the top signal</div>
          <div className="signal-intel-grid">
            <div className="signal-intel-card">
              <span className="signal-intel-label">Status</span>
              <strong>{signalStatus.label}</strong>
              <div className="muted small">{signalStatus.summary}</div>
            </div>
            <div className="signal-intel-card">
              <span className="signal-intel-label">Timeframe alignment</span>
              <strong>{alignment.label}</strong>
              <div className="muted small">{alignment.summary}</div>
            </div>
            <div className="signal-intel-card">
              <span className="signal-intel-label">Watch for</span>
              <strong>{confidenceBreakdown[0]?.[0] || 'Confirmation'}</strong>
              <div className="muted small">{contextHint}</div>
            </div>
          </div>
        </div>

        {confidenceBreakdown.length ? (
          <div className="factor-block confidence-breakdown-block">
            <div className="eyebrow">Confidence breakdown</div>
            <div className="confidence-breakdown-grid">
              {confidenceBreakdown.map(([label, value]) => (
                <div className="confidence-chip" key={label}>
                  <span>{label}</span>
                  <strong>{value}%</strong>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {asset.signalReasons?.length ? (
          <div className="factor-block">
            <div className="eyebrow">Why this appears tonight</div>
            <div className="history-stack">
              {asset.signalReasons.slice(0, 3).map((reason) => (
                <div className="history-row" key={reason}>
                  <span>Reason</span>
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="row wrap">
          <span className="badge">{state.mode} mode</span>
          <span className="badge">{state.strategy}</span>
          <span className="badge">{marketSource === 'coingecko' ? 'Live market' : 'Fallback market'}</span>
          <span className="badge">{marketReady ? 'Engine live' : 'Engine loading'}</span>
          <span className="badge">{marketUpdatedAt ? `Updated ${formatTime(marketUpdatedAt)}` : 'Awaiting refresh'}</span>
        </div>
      </div>

      {decisionLayer ? (
        <div className="decision-card">
          <div className="row space-between">
            <div>
              <div className="eyebrow">Decision layer</div>
              <div className="value">{decisionLayer.posture}</div>
            </div>
            <span className="badge">{asset.marketRegime || 'Mixed'} regime</span>
          </div>
          <div className="muted">{beginner ? `This posture helps translate the signal into a simpler read: ${decisionLayer.posture}.` : decisionLayer.riskContext}</div>
          <div className="notice small">{decisionLayer.bestFor}</div>
          <div className="history-stack">
            {decisionLayer.changeSummary.map((item, index) => (
              <div className="history-row" key={`${item}-${index}`}>
                <span>Change</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="notice small">
        This signal is chosen automatically from the ranked factor model and stays separate from the asset you click for details.
      </div>

      {regimeSummary ? (
        <div className="factor-block">
          <div className="eyebrow">Market regime</div>
          <div className="regime-row">
            <span className="badge">{regimeSummary.regime}</span>
            <span className="muted small">Avg move: {Number(regimeSummary.avgChange24h || 0).toFixed(2)}%</span>
            <span className="muted small">Breadth: {Math.round((regimeSummary.bullishBreadth || 0) * 100)}% bullish</span>
          </div>
          {beginner ? <div className="muted small">Regime tells you what kind of market environment the engine thinks it is operating in.</div> : null}
        </div>
      ) : null}

      {showAdvanced ? (
      <div className="factor-block">
        <div className="eyebrow">Adaptive weights</div>
        <div className="history-stack">
          {currentAdaptive ? (
            <>
              <div className="history-row"><span>Regime</span><span>{currentAdaptive.regime}</span></div>
              <div className="history-row"><span>Top drivers</span><span>{currentAdaptive.topDrivers.join(' · ')}</span></div>
              <div className="muted small">{beginner ? 'The engine is slightly increasing or decreasing factor importance based on recent results.' : 'Weights are adapting based on recent forward performance in this regime.'}</div>
            </>
          ) : (
            <div className="muted small">Adaptive weights will become more informative as more forward results accumulate.</div>
          )}
        </div>
      </div>
      ) : (
      <div className="factor-block factor-block-gated">
        <div className="eyebrow">Pro Insight</div>
        <div className="muted small">Free covers the live read above. Pro adds adaptive weights and deeper regime edge context.</div>
      </div>
      )}

      <div className="factor-block">
        <div className="eyebrow">Multi-timeframe read</div>
        <div className="factor-grid">
          <div className="factor-chip"><span>5m</span><strong>{tf.tf5m ?? '—'}</strong></div>
          <div className="factor-chip"><span>15m</span><strong>{tf.tf15m ?? '—'}</strong></div>
          <div className="factor-chip"><span>1h</span><strong>{tf.tf1h ?? '—'}</strong></div>
          <div className="factor-chip"><span>MTF Momentum</span><strong>{tf.mtfMomentum ?? '—'}</strong></div>
        </div>
        <div className="history-stack compact-history-stack">
          {alignment.chips.map((chip) => (
            <div className="history-row" key={chip.label}>
              <span>{chip.label}</span>
              <span>{chip.value}%</span>
            </div>
          ))}
        </div>
        {beginner ? <div className="muted small">This blends short and medium views together so the app is not overreacting to only one moment.</div> : null}
      </div>

      <div className="factor-block">
        <div className="eyebrow">Factor breakdown</div>
        <div className="factor-grid">
          {factorRows.map(([label, value]) => (
            <div className="factor-chip" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        {beginner ? <div className="muted small">These are the main ingredients driving the current signal score.</div> : null}
      </div>

      <div className="factor-block">
        <div className="eyebrow">Signal history</div>
        <div className="history-stack">
          {recent.length ? recent.map((entry, index) => (
            <div className="history-row" key={`${entry.symbol}-${entry.timestamp}-${index}`}>
              <span>{entry.symbol}</span>
              <span>{entry.signalScore}%</span>
              <span>{entry.regime || 'Mixed'}</span>
              <span>{formatTime(entry.timestamp)}</span>
            </div>
          )) : <div className="muted small">No snapshots yet.</div>}
        </div>
      </div>

      {showAdvanced ? (
        <>
        {validationSummary ? (
          <div className="factor-block">
            <div className="eyebrow">Validation scaffolding</div>
            <div className="history-stack">
              <div className="history-row"><span>Tracked</span><span>{validationSummary.trackedSignals}</span></div>
              <div className="history-row"><span>Score trend</span><span>{validationSummary.scoreTrend}</span></div>
              <div className="history-row"><span>Signal change</span><span>{validationSummary.lastChange}</span></div>
              <div className="muted small">{validationSummary.directionalRead}</div>
            </div>
          </div>
        ) : null}

        {forwardScorecard ? (
          <div className="factor-block">
            <div className="eyebrow">Forward scorecard</div>
            <div className="factor-grid">
              <div className="factor-chip"><span>Tracked signals</span><strong>{forwardScorecard.trackedSignals}</strong></div>
              <div className="factor-chip"><span>Scored signals</span><strong>{forwardScorecard.scoredSignals}</strong></div>
              <div className="factor-chip"><span>Hit rate</span><strong>{forwardScorecard.hitRate ?? '—'}{forwardScorecard.hitRate !== null ? '%' : ''}</strong></div>
              <div className="factor-chip"><span>Avg 1h</span><strong>{forwardScorecard.avg1h ?? '—'}{forwardScorecard.avg1h !== null ? '%' : ''}</strong></div>
              <div className="factor-chip"><span>Avg 4h</span><strong>{forwardScorecard.avg4h ?? '—'}{forwardScorecard.avg4h !== null ? '%' : ''}</strong></div>
              <div className="factor-chip"><span>Avg 24h</span><strong>{forwardScorecard.avg24h ?? '—'}{forwardScorecard.avg24h !== null ? '%' : ''}</strong></div>
            </div>

            {forwardScorecard.regimePerformance?.length ? (
              <div className="history-stack">
                {forwardScorecard.regimePerformance.map((entry) => (
                  <div className="history-row" key={entry.regime}>
                    <span>{entry.regime}</span>
                    <span>{entry.avgReturn ?? '—'}{entry.avgReturn !== null ? '%' : ''}</span>
                    <span>{entry.samples} samples</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="factor-block">
          <div className="eyebrow">Forward signal log</div>
          <div className="history-stack">
            {forwardRecent.length ? forwardRecent.map((entry) => (
              <div className="history-row" key={entry.id}>
                <span>{entry.symbol}</span>
                <span>{entry.score}%</span>
                <span>{entry.regime}</span>
                <span>{formatTime(entry.timestamp)}</span>
              </div>
            )) : <div className="muted small">Forward tracking begins after the first live snapshots are stored.</div>}
          </div>
        </div>
        </>
      ) : null}
    </div>
  );
}
