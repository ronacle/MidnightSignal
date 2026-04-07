'use client';

import { formatTime, getConvictionTier } from '@/lib/utils';

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
  decisionLayer = null
}) {
  if (!asset) return null;

  const beginner = (state?.mode || 'Beginner') === 'Beginner';
  const factorRows = [
    ['Momentum', asset?.factors?.momentum],
    ['Trend', asset?.factors?.trend],
    ['Volume', asset?.factors?.volume],
    ['Relative Strength', asset?.factors?.relativeStrength],
    ['Volatility', asset?.factors?.volatility],
  ].filter(([, value]) => typeof value === 'number');

  const recent = signalHistory.slice(0, 4);
  const forwardRecent = forwardValidation.slice(0, 5);
  const tf = asset?.timeframe || {};
  const currentAdaptive = adaptiveSummary.find((entry) => entry.regime === (regimeSummary?.regime || asset?.marketRegime));
  const topSignalMotion = Boolean(state?.livePulseEnabled);

  return (
    <div className={`panel stack ${topSignalMotion ? "top-signal-motion" : ""}`}>
      <div className="row space-between">
        <h2 className="section-title">Tonight&apos;s Top Signal <span className="signal-dot" aria-hidden="true" /></h2>
        <span className={`sentiment ${asset.sentiment}`}>{asset.sentiment}</span>
      </div>

      <div className="list-item stack">
        <div>
          <div className="eyebrow">System-selected lead asset</div>
          <div className="value">{asset.symbol} · {asset.name}</div>
        </div>
        <div className="muted">{asset.story}</div>
        <div className="row">
          <span className="badge">{asset.signalScore ?? asset.conviction}% score</span>
          <span className="badge">{getConvictionTier(asset.signalScore ?? asset.conviction)}</span>
          <span className="badge">{state.mode} mode</span>
          <span className="badge">{state.strategy}</span>
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

      <div className="factor-block">
        <div className="eyebrow">Multi-timeframe read</div>
        <div className="factor-grid">
          <div className="factor-chip"><span>5m</span><strong>{tf.tf5m ?? '—'}</strong></div>
          <div className="factor-chip"><span>15m</span><strong>{tf.tf15m ?? '—'}</strong></div>
          <div className="factor-chip"><span>1h</span><strong>{tf.tf1h ?? '—'}</strong></div>
          <div className="factor-chip"><span>MTF Momentum</span><strong>{tf.mtfMomentum ?? '—'}</strong></div>
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
              <span>1h {entry.checkpoints?.['1h']?.returnPct ?? '—'}% · 4h {entry.checkpoints?.['4h']?.returnPct ?? '—'}% · 24h {entry.checkpoints?.['24h']?.returnPct ?? '—'}%</span>
            </div>
          )) : <div className="muted small">No forward validation signals tracked yet.</div>}
        </div>
      </div>

      <div className="row">
        <div className="muted small">
          {marketReady ? `Source: ${marketSource} · Updated ${formatTime(marketUpdatedAt)}` : 'Loading signal engine…'}
        </div>
      </div>
    </div>
  );
}
