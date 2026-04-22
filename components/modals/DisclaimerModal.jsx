
'use client';

import { useMemo, useState } from 'react';

export default function DisclaimerModal({ onAccept }) {
  const [educationChecked, setEducationChecked] = useState(false);
  const [riskChecked, setRiskChecked] = useState(false);
  const canContinue = educationChecked && riskChecked;

  const bullets = useMemo(() => [
    'Midnight Signal is an educational guidance tool.',
    'It surfaces signal posture, confidence, and context to help users learn.',
    'It does not provide financial advice or guarantee outcomes.'
  ], []);

  return (
    <div className="first-run-overlay" role="dialog" aria-modal="true" aria-labelledby="disclaimer-title">
      <div className="first-run-card">
        <div className="first-run-eyebrow">Before you continue</div>
        <h2 id="disclaimer-title" className="first-run-title">Midnight Signal is not financial advice</h2>
        <p className="muted small">Use Midnight Signal to understand posture, confidence, and market context faster. You are still responsible for your own decisions.</p>

        <div className="first-run-note-list">
          {bullets.map((item) => (
            <div key={item} className="first-run-note-item">{item}</div>
          ))}
        </div>

        <label className="first-run-check">
          <input type="checkbox" checked={educationChecked} onChange={(event) => setEducationChecked(event.target.checked)} />
          <span>I understand this is educational and informational.</span>
        </label>

        <label className="first-run-check">
          <input type="checkbox" checked={riskChecked} onChange={(event) => setRiskChecked(event.target.checked)} />
          <span>I understand this is not financial advice.</span>
        </label>

        <div className="first-run-actions">
          <button type="button" className="primary-button" disabled={!canContinue} onClick={onAccept}>
            Agree and Enter
          </button>
        </div>
      </div>
    </div>
  );
}
