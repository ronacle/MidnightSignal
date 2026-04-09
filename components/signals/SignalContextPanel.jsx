import { safeText } from '@/lib/safeText';

export default function SignalContextPanel({ context, asset, planTier }) {
  const catalysts = (context?.relatedCatalysts || []).slice(0, 3);
  const compactNote = safeText(context?.whyThisIsHappening) || 'Context is available in the asset detail pane.';
  const marketNote = safeText(context?.marketContext);
  const gated = planTier !== 'pro' && catalysts.length > 1;

  return (
    <section className="signal-context-card card" aria-label="Signal context">
      <div className="signal-context-head">
        <div>
          <div className="eyebrow">Signal summary</div>
          <h2 className="section-title">Why this signal</h2>
        </div>
        {asset?.symbol ? <span className="badge">{asset.symbol}</span> : null}
      </div>

      <div className="signal-context-grid">
        <div className="context-block context-block--primary">
          <h4>Quick read</h4>
          <p>{compactNote}</p>
        </div>

        <div className="context-block">
          <h4>Related catalysts</h4>
          {catalysts.length ? (
            <div className="context-list">
              {catalysts.map((c, i) => (
                <div key={c?.id || c?.headline || i} className="catalyst-item">
                  <div className="catalyst-headline">{safeText(c?.headline) || 'Catalyst developing'}</div>
                  {safeText(c?.detail || c?.summary) ? (
                    <div className="catalyst-detail muted">{safeText(c?.detail || c?.summary)}</div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No clear catalyst detected right now.</p>
          )}
          {gated ? <div className="muted small">Pro unlocks the full catalyst stack.</div> : null}
        </div>
      </div>

      {marketNote ? (
        <details className="market-context-compact">
          <summary>Broader market context</summary>
          <div className="muted small">{marketNote}</div>
        </details>
      ) : null}
    </section>
  );
}
