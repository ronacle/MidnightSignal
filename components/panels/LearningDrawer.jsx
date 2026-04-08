'use client';

const GLOSSARY = [
  { term: 'Top Signal', beginner: 'The system-selected asset that currently ranks highest after the engine scores all tracked assets.', pro: 'Highest-ranked asset in the current model pass.' },
  { term: 'Top Signal Brief', beginner: 'A plain-English explanation of why the top signal is leading right now.', pro: 'Narrative summary of current signal leadership.' },
  { term: 'Posture', beginner: 'A quick decision framing label like Favorable, Watch, Cautious, or Avoid so you can understand the setup at a glance.', pro: 'Action-oriented signal framing layer.' },
  { term: 'Market Regime', beginner: 'The current market environment, such as Trending, Chop, Directional, or Mixed. Regime changes how the engine weighs factors.', pro: 'Detected market state used for adaptive weighting.' },
  { term: 'Factor Breakdown', beginner: 'The ingredients behind the signal score, like momentum, trend, volume, relative strength, and volatility.', pro: 'Per-factor model contribution view.' },
  { term: 'Momentum', beginner: 'How strongly price is moving right now across the model’s short time windows.', pro: 'Short-horizon directional strength.' },
  { term: 'Trend', beginner: 'A measure of whether the asset is holding stronger structure compared with the rest of the market.', pro: 'Structural leadership component.' },
  { term: 'Volume', beginner: 'A check for whether participation is supporting the move instead of leaving it weak or thin.', pro: 'Participation confirmation factor.' },
  { term: 'Relative Strength', beginner: 'How the asset is behaving compared with the broader market, not just on its own.', pro: 'Outperformance vs market baseline.' },
  { term: 'Volatility', beginner: 'A measure of how noisy or explosive price movement is. In choppy markets, this matters more.', pro: 'Noise/expansion factor.' },
  { term: 'Multi-Timeframe Read', beginner: 'A blended look across 5m, 15m, and 1h so the app is not overreacting to only one time window.', pro: 'Short-stack timeframe blend.' },
  { term: 'Adaptive Weights', beginner: 'The engine slightly shifts factor importance based on what has recently worked best.', pro: 'Performance-informed weighting adjustment.' },
  { term: 'Forward Scorecard', beginner: 'A running check of what happened after top signals were selected, including hit rate and average returns.', pro: 'Outcome tracking layer.' },
  { term: 'Signal Change Summary', beginner: 'A short explanation of what changed since the prior signal, like momentum improving or regime shifting.', pro: 'Delta summary vs prior top signal snapshot.' },
];

export default function LearningDrawer({ open, onClose, state, focusAsset }) {
  const beginner = (state?.mode || 'Beginner') === 'Beginner';

  return (
    <div className={`drawer-root ${open ? 'open' : ''}`} aria-hidden={!open}>
      <button
        type="button"
        className="drawer-backdrop"
        aria-label="Close learning panel"
        onClick={onClose}
      />
      <aside className="drawer drawer-right learning-drawer" role="dialog" aria-modal="true" aria-label="Learning Panel">
        <div className="drawer-header">
          <div>
            <div className="eyebrow">Learning Panel</div>
            <h2 className="section-title" style={{ marginTop: 6 }}>Understand the signal system</h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>Close</button>
        </div>

        <div className="drawer-content stack">
          {focusAsset ? (
            <div className="list-item stack">
              <div className="eyebrow">Focused asset</div>
              <div className="value">{focusAsset.symbol} · {focusAsset.name}</div>
              <div className="muted">{focusAsset.story}</div>
            </div>
          ) : null}

          <div className="stack">
            {GLOSSARY.map((item) => (
              <div key={item.term} className="list-item stack">
                <div className="eyebrow">{item.term}</div>
                <div className="muted">{beginner ? item.beginner : item.pro}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
