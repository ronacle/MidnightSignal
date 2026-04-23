'use client';

import { buildTrustDashboard } from '@/lib/trust-dashboard';

function formatPct(value) {
  return typeof value === 'number' ? `${value}%` : '—';
}

function formatSignedPct(value) {
  if (typeof value !== 'number') return 'Early read';
  return `${value > 0 ? '+' : ''}${value}%`;
}

function impactToneClass(impact) {
  if (!impact) return 'developing';
  return impact.tone || 'developing';
}

export default function TrustDashboardPanel({ mode = 'Beginner', forwardValidation = [], recentAlertEvents = [] }) {
  const dashboard = buildTrustDashboard({ mode, forwardValidation, recentAlertEvents });
  const progressValue = typeof dashboard.hitRate === 'number' ? Math.max(0, Math.min(100, dashboard.hitRate)) : 0;
  const progressStyle = {
    background: `conic-gradient(rgba(92, 228, 161, 0.95) ${progressValue}%, rgba(93, 119, 171, 0.34) ${progressValue}% 100%)`
  };

  return (
    <section className="card trust-dashboard-panel trust-dashboard-redesign trust-dashboard-premium" id="trust-dashboard">
      <div className="row space-between trust-header-row">
        <div>
          <div className="eyebrow">Signal reliability</div>
          <h2 className="section-title">{dashboard.title}</h2>
        </div>
        <span className="badge trust-resolved-badge">{dashboard.resolvedSignals}/{dashboard.trackedSignals} resolved</span>
      </div>

      <div className="trust-hero-shell">
        <div className="trust-hero-grid">
          <div className="trust-progress-wrap" aria-label="Signal reliability score">
            <div className="trust-progress-ring" style={progressStyle}>
              <div className="trust-progress-core">
                <strong>{dashboard.hitRate !== null ? `${dashboard.hitRate}%` : '—'}</strong>
                <span>{dashboard.hitRate !== null ? 'accurate recently' : 'building reliability'}</span>
              </div>
            </div>
          </div>

          <div className="trust-hero-copy">
            <div className="trust-headline-value">
              {dashboard.hitRate !== null ? `${dashboard.hitRate}% accurate recently` : 'Reliability building'}
            </div>
            <div className="trust-headline-copy">{dashboard.takeaway}</div>
          </div>

          <div className="trust-stat-rail" aria-label="Signal reliability details">
            <div className="trust-stat-card worked">
              <span>Average follow-through</span>
              <strong>{formatPct(dashboard.avgFollowThrough)}</strong>
              <small>avg. move after signal</small>
            </div>
            <div className="trust-stat-card neutral">
              <span>Resolved outcomes</span>
              <strong>{dashboard.workedCount} / {dashboard.mixedCount} / {dashboard.failedCount}</strong>
              <small>win / loss / breakeven</small>
            </div>
          </div>
        </div>
      </div>

      <div className="trust-impact-banner trust-impact-banner-premium">
        <div>
          <div className="eyebrow trust-impact-eyebrow">Impact summary</div>
          <div className="trust-impact-copy">{dashboard.impactSummary}</div>
        </div>
        {dashboard.mostMeaningful ? (
          <div className={`trust-impact-pill ${impactToneClass(dashboard.mostMeaningful.impact)}`}>
            <span>{dashboard.mostMeaningful.symbol}</span>
            <strong>{dashboard.mostMeaningful.impact?.label || 'Developing impact'}</strong>
          </div>
        ) : null}
      </div>

      <div className="trust-dual-grid">
        <div className="trust-surface-card trust-section-card">
          <div className="trust-card-head">
            <div className="eyebrow">Recent outcomes</div>
          </div>

          <div className="trust-table-head trust-table-head-outcomes">
            <span>Symbol</span>
            <span>Timeframe</span>
            <span>Result</span>
            <span>Impact</span>
            <span>Type</span>
          </div>

          <div className="trust-table-body">
            {dashboard.recentOutcomes.length ? dashboard.recentOutcomes.map((entry) => (
              <div className="trust-table-row trust-table-row-outcomes" key={entry.id}>
                <div className="trust-outcome-symbol-wrap">
                  <span className="trust-symbol">{entry.symbol}</span>
                  <span className={`outcome-badge ${entry.outcomeTone}`}>{entry.outcomeLabel}</span>
                </div>
                <span className="trust-cell-muted">{entry.latestHorizon === 'developing' ? '—' : entry.latestHorizon}</span>
                <span className={`trust-result-value ${entry.outcomeTone}`}>
                  {entry.latestHorizon === 'developing' ? 'Early read' : formatSignedPct(entry.latestReturnPct)}
                </span>
                <span className={`trust-impact-tag ${impactToneClass(entry.impact)}`}>{entry.impact?.label || 'Developing impact'}</span>
                <span className="trust-cell-muted trust-type-cell">{entry.regime}</span>
              </div>
            )) : <div className="muted small">Recent signal outcomes will appear here as checkpoints close.</div>}
          </div>

          <div className="trust-footnote-row">
            <span>Sorted by most recent</span>
          </div>
        </div>

        <div className="trust-surface-card trust-section-card">
          <div className="trust-card-head">
            <div className="eyebrow">Top performing signals</div>
          </div>

          <div className="trust-table-head trust-table-head-leaders">
            <span>Symbol</span>
            <span>Avg move</span>
            <span>Impact</span>
            <span>Samples</span>
          </div>

          <div className="trust-table-body">
            {dashboard.leaders.length ? dashboard.leaders.map((entry) => (
              <div className="trust-table-row trust-table-row-leaders" key={entry.symbol}>
                <span className="trust-symbol">{entry.symbol}</span>
                <span className="trust-leader-return positive">{formatSignedPct(entry.avgReturn)}</span>
                <span className={`trust-impact-tag ${entry.avgImpact >= 52 ? 'worked' : entry.avgImpact >= 26 ? 'mixed' : 'developing'}`}>{entry.strongestImpact || 'Developing impact'}</span>
                <span className="trust-cell-muted">{entry.samples}</span>
              </div>
            )) : <div className="muted small">Need a few more resolved outcomes before leaders stand out.</div>}
          </div>

          <div className="trust-footnote-row">
            <span>Based on average move after signal</span>
          </div>
        </div>
      </div>

      <div className="trust-helper-bar">
        <div>
          <strong>How to read this:</strong> Higher follow-through and more confirmed outcomes = more reliable signals.
        </div>
        <button type="button" className="ghost-button trust-helper-link">Learn more</button>
      </div>
    </section>
  );
}
