'use client';

import { buildTrustDashboard } from '@/lib/trust-dashboard';

function formatPct(value) {
  return typeof value === 'number' ? `${value}%` : '—';
}

function formatSignedPct(value) {
  if (typeof value !== 'number') return 'Early read';
  return `${value > 0 ? '+' : ''}${value}%`;
}

export default function TrustDashboardPanel({ mode = 'Beginner', forwardValidation = [], recentAlertEvents = [] }) {
  const dashboard = buildTrustDashboard({ mode, forwardValidation, recentAlertEvents });

  return (
    <section className="card trust-dashboard-panel trust-dashboard-redesign" id="trust-dashboard">
      <div className="row space-between trust-header-row">
        <div>
          <div className="eyebrow">Signal reliability</div>
          <h2 className="section-title">{dashboard.title}</h2>
        </div>
        <span className="badge">{dashboard.resolvedSignals}/{dashboard.trackedSignals} resolved</span>
      </div>

      <div className="trust-headline-card">
        <div className="trust-headline-value">
          {dashboard.hitRate !== null ? `${dashboard.hitRate}% accurate recently` : 'Reliability building'}
        </div>
        <div className="trust-headline-copy">{dashboard.takeaway}</div>

        <div className="trust-mini-stats" aria-label="Signal reliability details">
          <div className="trust-mini-stat">
            <span>Avg follow-through</span>
            <strong>{formatPct(dashboard.avgFollowThrough)}</strong>
          </div>
          <div className="trust-mini-stat">
            <span>Alert follow-through</span>
            <strong>{formatPct(dashboard.alertFollowThrough)}</strong>
          </div>
          <div className="trust-mini-stat">
            <span>Confirmed / Inconsistent / Faded</span>
            <strong>{dashboard.workedCount} / {dashboard.mixedCount} / {dashboard.failedCount}</strong>
          </div>
        </div>
      </div>

      <div className="trust-stack">
        <div className="factor-block trust-section-block">
          <div className="eyebrow">Recent outcomes</div>
          <div className="trust-list">
            {dashboard.recentOutcomes.length ? dashboard.recentOutcomes.map((entry) => (
              <div className="trust-list-row" key={entry.id}>
                <div className="trust-list-main">
                  <span className="trust-symbol">{entry.symbol}</span>
                  <span className={`outcome-badge ${entry.outcomeTone}`}>{entry.outcomeLabel}</span>
                </div>
                <div className="trust-list-meta">
                  <span className={`trust-return-pill ${entry.outcomeTone}`}>
                    {entry.latestHorizon === 'developing' ? 'Early read' : `${entry.latestHorizon} ${formatSignedPct(entry.latestReturnPct)}`}
                  </span>
                  <span className="trust-regime">{entry.regime}</span>
                </div>
              </div>
            )) : <div className="muted small">Recent signal outcomes will appear here as checkpoints close.</div>}
          </div>
        </div>

        <div className="factor-block trust-section-block">
          <div className="eyebrow">Top performing signals</div>
          <div className="trust-list trust-leader-list">
            {dashboard.leaders.length ? dashboard.leaders.map((entry) => (
              <div className="trust-list-row trust-leader-row" key={entry.symbol}>
                <div className="trust-list-main">
                  <span className="trust-symbol">{entry.symbol}</span>
                </div>
                <div className="trust-list-meta">
                  <span className="trust-leader-return">{formatSignedPct(entry.avgReturn)} avg</span>
                  <span className="trust-regime">{entry.samples} {entry.samples === 1 ? 'sample' : 'samples'}</span>
                </div>
              </div>
            )) : <div className="muted small">Need a few more resolved outcomes before leaders stand out.</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
