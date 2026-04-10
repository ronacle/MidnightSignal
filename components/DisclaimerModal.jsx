'use client';

import { useState } from 'react';

export default function DisclaimerModal({ onAccept }) {
  const [checkedInfo, setCheckedInfo] = useState(false);
  const [checkedAdvice, setCheckedAdvice] = useState(false);

  return (
    <div className="ms-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="ms-disclaimer-title">
      <div className="ms-modal-card card ms-modal-card--narrow">
        <div className="eyebrow">Agreement of understanding</div>
        <h2 id="ms-disclaimer-title" className="section-title">Before you enter tonight&apos;s signal</h2>
        <p className="muted small">Midnight Signal is an educational tool for guidance, learning, and market orientation. It is not financial advice, and you remain responsible for your own decisions.</p>
        <div className="ms-agreement-stack">
          <label className="ms-checkline"><input type="checkbox" checked={checkedInfo} onChange={(event) => setCheckedInfo(event.target.checked)} /> <span>I understand this is educational and informational.</span></label>
          <label className="ms-checkline"><input type="checkbox" checked={checkedAdvice} onChange={(event) => setCheckedAdvice(event.target.checked)} /> <span>I understand Midnight Signal does not provide financial advice.</span></label>
        </div>
        <div className="ms-modal-actions">
          <button type="button" className="primary-button" disabled={!(checkedInfo && checkedAdvice)} onClick={onAccept}>Agree and Enter</button>
        </div>
      </div>
    </div>
  );
}
