export default function LeadSignalPanel({ asset }) {
  const confidence = asset?.confidence ?? asset?.score ?? 0;
  const posture = asset?.signalLabel || asset?.posture || 'Balanced signal posture';
  const whyNow = asset?.whyNow || 'Momentum and structure are defining the current posture.';
  const watchNext = asset?.watchNext || 'Watch next cycle for confirmation.';
  const momentum = asset?.momentumState || 'Momentum stabilizing';
  const alignment = asset?.alignmentState || 'Mixed timeframe alignment';
  const volatility = asset?.volatilityState || 'Volatility stable';

  return (
    <div className="lead-signal-shell card">
      <div className="lead-signal-core">
        <div className="lead-signal-kicker eyebrow">Tonight's top signal</div>
        <div className="lead-signal-asset-row">
          <div>
            <div className="lead-signal-asset">{asset?.symbol || '—'}</div>
            <div className="lead-signal-posture">{posture}</div>
          </div>
          <div className="lead-signal-confidence-pill">{confidence}%</div>
        </div>
        <div className="lead-signal-copy-grid">
          <div className="lead-signal-copy-card">
            <div className="lead-signal-copy-label">Why now</div>
            <div className="lead-signal-copy">{whyNow}</div>
          </div>
          <div className="lead-signal-copy-card">
            <div className="lead-signal-copy-label">Watch next</div>
            <div className="lead-signal-copy">{watchNext}</div>
          </div>
        </div>
      </div>

      <div className="signal-summary lead-signal-summary muted small">
        <span>{momentum}</span>
        <span className="signal-summary-dot">•</span>
        <span>{alignment}</span>
        <span className="signal-summary-dot">•</span>
        <span>{volatility}</span>
      </div>
    </div>
  );
}
