'use client';

import BeaconLogo from '@/components/BeaconLogo';

export default function TopNav({ state, user, status, onJump, onOpenControls, onOpenLearning }) {
  const planTier = state?.planTier === 'pro' ? 'pro' : 'basic';
  const links = [
    ['top-signal', 'Top Signal'],
    ['since-last-visit', 'Since Last Visit'],
    ['market-scan', 'Top 20'],
  ];

  return (
    <div className="menu-bar card premium-nav-shell">
      <div className="menu-brand premium-menu-brand">
        <span className="nav-logo-wrap" aria-hidden="true">
          <BeaconLogo size={30} />
        </span>
        <div className="menu-brand-copy">
          <span>Midnight Signal</span>
          <small>Beacon market briefing</small>
        </div>
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
        <span className={`badge ${planTier === 'pro' ? 'plan-nav-badge tier-pro' : 'plan-nav-badge tier-basic'}`}>{planTier === 'pro' ? 'Pro Active' : 'Free Plan'}</span>
        <span className="badge">{user ? 'Cloud ready' : 'Saved locally'}</span>
        <span className="badge status-pill">{status}</span>
        <button className="ghost-button nav-action" onClick={onOpenLearning} type="button">Learning</button>
        <button className="button nav-action" onClick={onOpenControls} type="button">Controls</button>
      </div>
    </div>
  );
}
