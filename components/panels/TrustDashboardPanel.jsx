'use client';

import { buildTrustDashboard } from '@/lib/trust-dashboard';

export default function TrustDashboardPanel({ mode = 'Beginner', forwardValidation = [], recentAlertEvents = [] }) {
  const dashboard = buildTrustDashboard({ mode, forwardValidation, recentAlertEvents });

  return (
    <section className="card trust-dashboard-panel" id="trust-dashboard">
      <div className="row space-between">
        <div>
          <div className="eyebrow">Signal reliability</div>
          <h2 className="section-title">{dashboard.title}</h2>
        </div>
        <span className="badge">{dashboard.resolvedSignals}/{dashboard.trackedSignals} resolved</span>
      </div>

      <div className="muted small">{dashboard.subtitle}</div>

      <div className="factor-grid trust-stat-grid">
        <div className="factor-chip"><span>Recent accuracy</span><strong>{dashboard.hitRate ?? '—'}{dashboard.hitRate !== null ? '%' : ''}</strong></div>
        <div className="factor-chip"><span>Consistency trend</span><strong>{dashboard.avgFollowThrough ?? '—'}{dashboard.avgFollowThrough !== null ? '%' : ''}</strong></div>
        <div className="factor-chip"><span>Confirmed / Inconsistent / Faded</span><strong>{dashboard.workedCount} / {dashboard.mixedCount} / {dashboard.failedCount}</strong></div>
        <div className="factor-chip"><span>Alert follow-through</span><strong>{dashboard.alertFollowThrough ?? '—'}{dashboard.alertFollowThrough !== null ? '%' : ''}</strong></div>
      </div>

      <div className="trust-takeaway">
        <div className="eyebrow">{dashboard.takeawayPrefix}</div>
        <div className="muted">{dashboard.takeaway}</div>
      </div>

      <div className="trust-grid">
        <div className="factor-block">
          <div className="eyebrow">Recent outcomes</div>
          <div className="history-stack">
            {dashboard.recentOutcomes.length ? dashboard.recentOutcomes.map((entry) => (
              <div className="history-row trust-history-row" key={entry.id}>
                <span>{entry.symbol}</span>
                <span><span className={`outcome-badge ${entry.outcomeTone}`}>{entry.outcomeLabel}</span></span>
                <span>{entry.latestHorizon === 'developing' ? 'Early read' : `${entry.latestHorizon} ${entry.latestReturnPct}%`}</span>
                <span>{entry.regime}</span>
              </div>
            )) : <div className="muted small">Recent signal outcomes will appear here as checkpoints close.</div>}
          </div>
        </div>

        <div className="factor-block">
          <div className="eyebrow">Best recent assets</div>
          <div className="history-stack">
            {dashboard.leaders.length ? dashboard.leaders.map((entry) => (
              <div className="history-row" key={entry.symbol}>
                <span>{entry.symbol}</span>
                <span>{entry.avgReturn}% avg</span>
                <span>{entry.samples} samples</span>
              </div>
            )) : <div className="muted small">Need a few more resolved outcomes before leaders stand out.</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
