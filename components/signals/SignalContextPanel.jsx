'use client';

import { safeText } from '@/lib/safeText';

export default function SignalContextPanel({ context, asset, planTier = 'basic' }) {
  const catalysts = (context?.relatedCatalysts || []).slice(0, planTier === 'pro' ? 3 : 2);
const whyNow =
  safeText(context?.whyThisIsHappening) ||
  asset?.whyNow ||
  asset?.postureSummary ||
  "Signal context is tracking the strongest drivers behind tonight's lead asset.";  const whatChanged = safeText(context?.whatChanged) || context?.statusLabel || 'No major structural shift since the last evaluation.';
  const watchNext = safeText(context?.watchNext) || asset?.watchNext || 'Watch for the next confirmation cycle before leaning too hard on the move.';
  const marketNote = safeText(context?.marketContext) || 'Broader market context is available when you want more depth.';

  return (
    <section className="panel signal-context-panel" aria-label="Signal context">
      <div className="signal-context-head">
        <div>
          <div className="eyebrow">Signal Context</div>
          <h2 className="section-title signal-context-title">Open the why behind tonight&apos;s signal</h2>
        </div>
        <span className="badge">{catalysts.length ? `${catalysts.length} catalyst${catalysts.length === 1 ? '' : 's'}` : 'Context ready'}</span>
      </div>

      <div className="signal-context-hero">
        <div className="signal-context-hero-grid">
          <div className="signal-context-detail-card">
            <div className="signal-context-label">Why this signal</div>
            <div className="signal-context-detail-copy">{whyNow}</div>
          </div>
          <div className="signal-context-detail-card signal-context-detail-card--accent">
            <div className="signal-context-label">What to watch</div>
            <div className="signal-context-detail-copy">{watchNext}</div>
          </div>
        </div>
      </div>

      <div className="signal-context-grid">
        <div className="signal-context-card">
          <div className="signal-context-label">Related catalysts</div>
          <div className="signal-context-list">
            {catalysts.length ? catalysts.map((item, index) => (
              <div key={`${item?.headline || 'catalyst'}-${index}`} className="signal-context-item">
                <div className="signal-context-item-title">{safeText(item?.headline || item) || 'Catalyst item'}</div>
                {safeText(item?.detail || item?.summary) ? <div className="muted small">{safeText(item?.detail || item?.summary)}</div> : null}
              </div>
            )) : <div className="signal-context-item muted small">No clear catalyst detected yet.</div>}
          </div>
        </div>

        <div className="signal-context-card">
          <div className="signal-context-label">Context snapshot</div>
          <div className="signal-context-list">
            <div className="signal-context-item">
              <div className="signal-context-item-title">What changed</div>
              <div className="muted small">{whatChanged}</div>
            </div>
            <div className="signal-context-item">
              <div className="signal-context-item-title">Market note</div>
              <div className="muted small">{marketNote}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
