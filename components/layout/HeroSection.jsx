'use client';

import BeaconLogo from '@/components/BeaconLogo';
import { formatTime } from '@/lib/utils';

export default function HeroSection({ selected, user, status, syncing, lastSyncedAt, watchlistCount, onOpenControls, state }) {
  const isLocalOnly = !user;
  const syncLabel = user ? (syncing ? 'Syncing…' : 'Sync Active') : 'Saved locally';
  const syncDetail = user
    ? (lastSyncedAt ? `Last synced ${formatTime(lastSyncedAt)}` : 'Your settings follow you across devices.')
    : 'Saved locally on this device.';
  const planTier = state?.planTier === 'pro' ? 'pro' : 'basic';
  const disclaimerAccepted = Boolean(state?.acceptedDisclaimer);
  const setupCount = [Boolean(user), disclaimerAccepted, planTier === 'pro'].filter(Boolean).length;
  const setupLabel = `${setupCount}/3 setup steps complete`;

  return (
    <section className="hero hero-shell">
      <div className="stack hero-copy">
        <div className="brand-row brand-row-large">
          <div className="beacon-wrap">
            <BeaconLogo size={108} animated />
          </div>
          <div className="brand-copy">
            <div className="eyebrow">Midnight Signal · v11.48</div>
            <h1>What’s the signal tonight?</h1>
            <p>
              Transforming Market Data → Information → Knowledge → Understanding → Market Wisdom.
              Learn the setup, understand the why, and move with clearer market awareness.
            </p>
            <div className="hero-support-copy">
              <p>Start with Tonight’s Top Signal, open the why, then scan the Top 20 for broader posture.</p>
              <p>Control Panel now gives you a cleaner flow for setup, sync, billing truth, and account management.</p>
            </div>
          </div>
        </div>

        <div className="hero-pill-row">
          <span className="badge glow-badge">Onboarding cleanup</span>
          <span className="badge">Billing center polish</span>
          <span className="badge">Stripe-verified Pro</span>
        </div>
      </div>

      <div className="hero-stat-grid">
        <div className="mini">
          <div className="eyebrow">Tonight’s lead</div>
          <div className="value">{selected.symbol}</div>
          <div className="muted small">{selected.name}</div>
        </div>
        <div className="mini">
          <div className="eyebrow">Direction</div>
          <div className="value sentiment-word">{selected.sentiment}</div>
          <div className="muted small">Directional posture</div>
        </div>
        <div className="mini">
          <div className="eyebrow">Conviction</div>
          <div className="value">{selected.conviction}%</div>
          <div className="muted small">Alignment of the setup</div>
        </div>
        <div className="mini sync-mini">
          <div className="eyebrow">Sync state</div>
          <div className="value">{syncLabel}</div>
          <div className="muted small">{syncDetail}</div>
          <button className="ghost-button sync-inline-action" onClick={onOpenControls}>
            {isLocalOnly ? 'Open setup' : 'Manage account'}
          </button>
        </div>
        <div className="mini">
          <div className="eyebrow">Watchlist</div>
          <div className="value">{watchlistCount}</div>
          <div className="muted small">Tracked assets</div>
        </div>
        <div className="mini onboarding-mini">
          <div className="eyebrow">Getting started</div>
          <div className="value">{setupLabel}</div>
          <div className="muted small">
            {!user ? 'Sign in to sync across devices.' : !disclaimerAccepted ? 'Accept the Agreement of Understanding.' : planTier !== 'pro' ? 'Optional: upgrade for Pro tools.' : 'Your setup is complete.'}
          </div>
          <button className="ghost-button sync-inline-action" onClick={onOpenControls}>Continue</button>
        </div>
      </div>
    </section>
  );
}
