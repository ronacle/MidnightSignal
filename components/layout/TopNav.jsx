'use client';

export default function TopNav({ state, user, status, onJump, onOpenControls, onOpenLearning, onOpenAlerts }) {
  const links = [
    ['top-signal', 'Top Signal'],
    ['since-last-visit', 'Since Last Visit'],
    ['market-scan', 'Top 20'],
  ];

  return (
    <div className="menu-bar card">
      <div className="menu-brand">
        <span className="menu-dot" />
        <span>Midnight Signal</span>
      </div>

      <div className="menu-links">
        {links.map(([id, label]) => (
          <button key={id} className="nav-chip" onClick={() => onJump?.(id)} type="button">
            {label}
          </button>
        ))}
      </div>

      <div className="menu-status">
        <span className="badge">{state.mode}</span>
        <span className="badge">{user ? 'Cloud ready' : 'Saved locally'}</span>
        <span className="badge status-pill">{status}</span>
        <button className="ghost-button nav-action" onClick={onOpenLearning} type="button">Learning</button>
        <button className="button nav-action" onClick={onOpenControls} type="button">Controls</button>
      </div>
    </div>
  );
}
