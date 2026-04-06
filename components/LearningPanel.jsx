'use client';

import { useMemo, useState } from 'react';

const TOPICS = {
  signal: {
    title: 'Signal',
    what: 'A signal is the app’s combined read on posture, timing, and confidence for one asset.',
    use: 'Use it as the headline read before you dive into the details.',
  },
  conviction: {
    title: 'Conviction',
    what: 'Conviction tells you how aligned the setup is right now.',
    use: 'Higher conviction means more parts of the setup are agreeing at once. It is not certainty.',
  },
  posture: {
    title: 'Posture',
    what: 'Posture is the directional stance: bullish, neutral, or bearish.',
    use: 'It gives a quick directional read before you think about timing or risk.',
  },
  timeframe: {
    title: 'Timeframe',
    what: 'Timeframe changes how much short-term movement versus broader structure matters.',
    use: 'Shorter timeframes react faster. Longer timeframes usually smooth out noise.',
  },
  sync: {
    title: 'Cross-device sync',
    what: 'When signed in, your mode, asset, watchlist, timeframe, and agreement state follow you across devices.',
    use: 'Use “Sync now” if you want to force a fresh pull from the cloud.',
  },
};

export default function LearningPanel({ state }) {
  const [topic, setTopic] = useState('signal');
  const current = useMemo(() => TOPICS[topic], [topic]);

  return (
    <div className="panel stack" id="learning">
      <div className="row space-between">
        <div>
          <h2 className="section-title">Learning Panel</h2>
          <div className="muted small">Clean learning mode keeps the glossary in one place instead of scattering tooltips everywhere.</div>
        </div>
        <span className="badge">{state.mode} mode</span>
      </div>

      <div className="topic-grid">
        <div className="topic-list">
          {Object.entries(TOPICS).map(([key, value]) => (
            <button
              key={key}
              type="button"
              className={`topic-button ${topic === key ? 'active' : ''}`}
              onClick={() => setTopic(key)}
            >
              {value.title}
            </button>
          ))}
        </div>

        <div className="topic-card">
          <div className="eyebrow">Glossary focus</div>
          <div className="learning-title">{current.title}</div>
          <div className="stack small">
            <div><strong>What it means:</strong> <span className="muted">{current.what}</span></div>
            <div><strong>How to use it here:</strong> <span className="muted">{current.use}</span></div>
          </div>
          <div className="notice small">Early Access Pro framing: deeper signal breakdowns and richer context can live here without interrupting the core nightly flow.</div>
        </div>
      </div>
    </div>
  );
}
