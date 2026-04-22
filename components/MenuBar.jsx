'use client';

export default function MenuBar({ state, user, status, onJump }) {
  const items = [
    ['top-signal', 'Top Signal'],
    ['brief', 'Brief'],
    ['controls', 'Controls'],
    ['learning', 'Learning'],
    ['watchlist', 'Watchlist'],
  ];

  return (
    <div className="menu-bar card">
      <div className="menu-brand">
        <span className="menu-dot" />
        <span>Midnight Signal</span>
      </div>
      <div className="menu-links">
        {items.map(([id, label]) => (
          <button key={id} className="nav-chip" onClick={() => onJump?.(id)} type="button">
            {label}
          </button>
        ))}
      </div>
      <div className="menu-status">
        <span className="badge">{state.mode}</span>
        <span className="badge">{user ? 'Cloud ready' : 'Saved locally'}</span>
        <span className="badge status-pill">{status}</span>
      </div>
    </div>
  );
}
