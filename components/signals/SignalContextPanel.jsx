// PATCH: SignalContextPanel.jsx structure

export default function SignalContextPanel({ context }) {
  return (
    <section className="context-section">

      <div className="context-block">
        <h4>Why this signal</h4>
        <p>{context?.whyThisIsHappening?.detail}</p>
      </div>

      <div className="context-block">
        <h4>Related catalysts</h4>
        {(context?.relatedCatalysts || []).slice(0,3).map((c, i) => (
          <div key={i} className="catalyst-item">
            {c?.headline}
          </div>
        ))}
      </div>

      <div className="context-block">
        <h4>What changed</h4>
        <p>{context?.whatChanged}</p>
      </div>

      <div className="context-block">
        <h4>What to watch</h4>
        <p>{context?.watchNext}</p>
      </div>

    </section>
  );
}
