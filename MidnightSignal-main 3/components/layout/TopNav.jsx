'use client';

import { useEffect, useState } from 'react';

const PLAN_STORAGE_KEY = 'midnight-signal-plan';

export default function TopNav({ state, user, status, onJump, onOpenControls, onOpenLearning }) {
  const [planTier, setPlanTier] = useState('basic');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncPlan = () => {
      try {
        setPlanTier(window.localStorage.getItem(PLAN_STORAGE_KEY) || 'basic');
      } catch {
        setPlanTier('basic');
      }
    };

    syncPlan();
    window.addEventListener('storage', syncPlan);
    window.addEventListener('focus', syncPlan);

    return () => {
      window.removeEventListener('storage', syncPlan);
      window.removeEventListener('focus', syncPlan);
    };
  }, []);
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
        <span className={`badge ${planTier === 'pro' ? 'plan-nav-badge tier-pro' : 'plan-nav-badge tier-basic'}`}>{planTier === 'pro' ? 'Pro Active' : 'Free Plan'}</span>
        <span className="badge">{user ? 'Cloud ready' : 'Saved locally'}</span>
        <span className="badge status-pill">{status}</span>
        <button className="ghost-button nav-action" onClick={onOpenLearning} type="button">Learning</button>
        <button className="button nav-action" onClick={onOpenControls} type="button">Controls</button>
      </div>
    </div>
  );
}
