
'use client';

export default function SignalContextPanel({ context, asset }) {
  if (!context || !asset) return null;

  return (
    <section className="signal-context-panel card" id="signal-context">
      <div className="signal-context-head">
        <div>
          <div className="eyebrow">Signal context</div>
          <h2 className="section-title">News + X context layer</h2>
        </div>
        <span className={`badge tone-${asset.sentiment || 'neutral'}`}>{asset.signalLabel || 'Balanced signal posture'}</span>
      </div>

      <div className="signal-context-hero">
        <div className="signal-context-title">{context.headline}</div>
        <div className="muted small">{context.subhead}</div>
        <p className="signal-context-setup">{context.setup}</p>
      </div>

      <div className="signal-context-grid">
        <div className="signal-context-card">
          <div className="signal-context-label">Narrative cues</div>
          <div className="signal-context-list">
            {context.newsCues.map((item) => (
              <div key={item.title} className="signal-context-item">
                <div className="signal-context-item-title">{item.title}</div>
                <div className="muted small">{item.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="signal-context-card">
          <div className="signal-context-label">X watch</div>
          <div className="signal-context-list">
            {context.xAngles.map((item) => (
              <div key={item} className="signal-context-item">
                <div className="signal-context-item-title">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="signal-context-foot muted small">
        Context layer helps explain what kind of story would strengthen or weaken tonight&apos;s signal. It does not replace the signal itself.
      </div>
    </section>
  );
}
