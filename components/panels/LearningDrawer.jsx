'use client';

import LearningPanel from '@/components/LearningPanel';

export default function LearningDrawer({ open, onClose, state, focusAsset }) {
  return (
    <div className={`drawer-root ${open ? 'open' : ''}`}>
      <button type="button" className="drawer-backdrop" onClick={onClose} aria-label="Close learning panel" />
      <aside className="drawer drawer-left">
        <div className="drawer-header">
          <div>
            <div className="eyebrow">Slide-out glossary</div>
            <h2 className="section-title">Learning Panel</h2>
          </div>
          <button className="ghost-button" type="button" onClick={onClose}>Close</button>
        </div>
        <div className="drawer-content stack">
          {focusAsset ? (
            <div className="panel stack compact-panel">
              <div className="row space-between">
                <h3 className="section-title">Learning context</h3>
                <span className="badge">{focusAsset.symbol}</span>
              </div>
              <div className="muted small">
                Use the glossary below to interpret the current posture for <strong>{focusAsset.name}</strong>.
              </div>
              <div className="notice">
                {focusAsset.sentiment} posture · Conviction {focusAsset.conviction}% · {focusAsset.story}
              </div>
            </div>
          ) : null}
          <LearningPanel state={state} />
        </div>
      </aside>
    </div>
  );
}
