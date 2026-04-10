'use client';

function getConfidence(asset) {
  return Number(asset?.confidenceScore ?? asset?.signalScore ?? asset?.conviction ?? 0);
}

function getSummaryBits(asset) {
  return [
    asset?.momentumState || 'Momentum stabilizing',
    asset?.timeframeAgreement || asset?.alignmentState || 'Mixed timeframe alignment',
    asset?.volatilityState || 'Volatility stable',
  ].filter(Boolean);
}

export default function LeadSignalPanel({ asset }) {
  if (!asset) return null;

  const confidence = getConfidence(asset);
  const summaryBits = getSummaryBits(asset);

  return (
    <section className="panel top-signal-shell" aria-label="Tonight's top signal">
      <div className="top-signal-shell-head row space-between">
        <div>
          <div className="eyebrow">Tonight&apos;s Top Signal</div>
          <h2 className="section-title top-signal-shell-title">{asset.symbol}</h2>
        </div>
        <div className="top-signal-score-pill">{confidence}%</div>
      </div>

      <div className="top-signal-main-card">
        <div className="top-signal-main-row">
          <div>
            <div className="top-signal-posture">{asset.signalLabel || 'Balanced signal posture'}</div>
            <div className="top-signal-story">{asset.story || 'Momentum and structure are defining the current posture.'}</div>
          </div>
          <div className="top-signal-meta-stack">
            <span className={`sentiment ${asset.sentiment || 'neutral'}`}>{asset.sentiment || 'neutral'}</span>
            <span className="badge">{asset.name || asset.symbol}</span>
          </div>
        </div>

        <div className="top-signal-detail-grid">
          <div className="top-signal-detail-card">
            <div className="top-signal-detail-label">Why now</div>
            <div className="top-signal-detail-copy">{asset.whyNow || asset.postureSummary || 'Momentum and structure are defining the current posture.'}</div>
          </div>
          <div className="top-signal-detail-card top-signal-detail-card--accent">
            <div className="top-signal-detail-label">Watch next</div>
            <div className="top-signal-detail-copy">{asset.watchNext || 'Watch whether short-term momentum stabilizes before chasing strength.'}</div>
          </div>
        </div>
      </div>

      <div className="signal-summary-strip">
        {summaryBits.map((item) => (
          <span key={item} className="signal-summary-pill">{item}</span>
        ))}
      </div>
    </section>
  );
}
