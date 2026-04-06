'use client';

import LearningPanel from '@/components/LearningPanel';

export default function LearningDrawer({ open, onClose, state }) {
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
          <LearningPanel state={state} />
        </div>
      </aside>
    </div>
  );
}
