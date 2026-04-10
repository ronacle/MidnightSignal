'use client';

function safeText(value, fallback = '') {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    const first = value.find((item) => item !== null && item !== undefined);
    return safeText(first, fallback);
  }
  if (value && typeof value === 'object') {
    return safeText(value.headline ?? value.title ?? value.label ?? value.detail ?? value.body ?? value.summary ?? value.text, fallback);
  }
  return fallback;
}

export default function SignalContextPanel({ context, asset, planTier = 'basic' }) {
  const catalysts = Array.isArray(context?.relatedCatalysts) ? context.relatedCatalysts.slice(0, planTier === 'pro' ? 3 : 1) : [];

  return (
    <section className="signal-context-card card">
      <div className="signal-context-head">
        <div>
          <div className="eyebrow">Signal context</div>
          <h2 className="section-title">Why {asset?.symbol || 'this asset'} looks this way tonight</h2>
        </div>
        <span className="badge context-badge">{planTier === 'pro' ? 'Pro depth' : 'Focused read'}</span>
      </div>
      <div className="signal-context-grid">
        <div className="context-block">
          <h4>Why this signal</h4>
          <p>{safeText(context?.whyThisIsHappening, 'Momentum, alignment, and volatility are shaping the current posture.')}</p>
        </div>
        <div className="context-block">
          <h4>What changed</h4>
          <p>{safeText(context?.whatChanged, 'No major context change yet — watch the next cycle for confirmation.')}</p>
        </div>
        <div className="context-block">
          <h4>What to watch</h4>
          <p>{safeText(context?.watchNext, asset?.watchNext || 'Watch for follow-through and next-cycle confirmation.')}</p>
        </div>
        <div className="context-block">
          <h4>Related catalysts</h4>
          <div className="context-catalyst-list">
            {catalysts.length ? catalysts.map((item, index) => (
              <div key={`${item?.headline || 'catalyst'}-${index}`} className="catalyst-item">{safeText(item?.headline, 'Catalyst watch armed')}</div>
            )) : <div className="catalyst-item muted">No clear catalyst detected yet.</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
