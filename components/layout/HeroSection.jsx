'use client';

import BeaconLogo from '@/components/BeaconLogo';
import { formatTime } from '@/lib/utils';

export default function HeroSection({ selected, user, status, syncing, lastSyncedAt, watchlistCount, onOpenControls, state, ritualStatus, alertSummary, growthSummary, inviteBanner, onShareSignal, onCopyReferral }) {
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
    <section className="hero hero-shell premium-hero-shell">
      <div className="hero-ambient-orb hero-ambient-orb-left" aria-hidden="true" />
      <div className="hero-ambient-orb hero-ambient-orb-right" aria-hidden="true" />

      <div className="stack hero-copy premium-hero-copy">
        <div className="brand-row brand-row-large premium-brand-row">
          <div className="beacon-wrap premium-beacon-wrap">
            <BeaconLogo size={118} animated />
          </div>
          <div className="brand-copy">
            <div className="eyebrow eyebrow-glow">Midnight Signal · v11.71</div>
            <h1>What’s the signal tonight?</h1>
            <p>
              Transforming Market Data → Information → Knowledge → Understanding → Market Wisdom.
              Learn the setup, understand the why, and move with calmer market awareness.
            </p>
            <div className="hero-support-copy">
              <p>Start with Tonight’s Top Signal, open the why, then scan the Top 20 for broader posture.</p>
              <p>The system is cleaner and safer now: tighter hierarchy, more reliable rendering, stronger mobile rhythm, and fewer fragile content paths.</p>
            </div>
          </div>
        </div>

        <div className="hero-pill-row premium-pill-row">
          <span className="badge glow-badge">Beacon-guided signal flow</span>
          <span className="badge">Live market context</span>
          <span className="badge">Explainable signals</span>
          <span className="badge">Account-synced ritual flow</span>
          <span className="badge">Not financial advice</span>
        </div>

        <div className="hero-status-grid">
          {ritualStatus ? (
          <div className="ritual-checkin-card">
            <div>
              <div className="eyebrow">Daily ritual</div>
              <div className="ritual-checkin-title">{ritualStatus.title}</div>
              <div className="muted small">{ritualStatus.detail}</div>
            </div>
            <div className="row wrap">
              <span className="badge">{ritualStatus.badge}</span>
              <span className="badge">{ritualStatus.streakLabel}</span>
            </div>
          </div>
        ) : null}

          {alertSummary ? (
            <div className="ritual-checkin-card alert-ritual-card">
              <div>
                <div className="eyebrow">Retention loop</div>
                <div className="ritual-checkin-title">{alertSummary.title}</div>
                <div className="muted small">{alertSummary.detail}</div>
              </div>
              <div className="row wrap">
                <span className="badge glow-badge">{alertSummary.badge}</span>
                <span className="badge">{alertSummary.watchlistLabel}</span>
              </div>
            </div>
          ) : null}
        </div>

        {inviteBanner ? <div className="invite-banner hero-invite-banner">{inviteBanner}</div> : null}

        <div className="hero-mobile-hint muted small">
          Mobile flow: start with Tonight’s Top Signal, tap any asset card for details, then use Controls for session changes.
        </div>

        <div className="hero-conversion-row premium-conversion-row">
          <div className="hero-conversion-card premium-callout-card">
            <div className="eyebrow">Start here</div>
            <div className="hero-conversion-title">Read tonight’s signal in under a minute</div>
            <p className="muted small">Use the free flow first: Top Signal → Why it appears → Board scan → Watchlist.</p>
            <div className="row wrap">
              <button className="button" onClick={onOpenControls} type="button">Open control panel</button>
              <button className="ghost-button" onClick={onShareSignal} type="button">Share Tonight&apos;s Signal</button>
              <span className="badge">{setupLabel}</span>
            </div>
          </div>

          <div className="hero-conversion-card trust-card premium-callout-card">
            <div className="eyebrow">Midnight method</div>
            <ul className="hero-trust-list premium-trust-list">
              <li>Built to explain the signal, not just flash it.</li>
              <li>Free mode stays useful before any upgrade pressure.</li>
              <li>The beacon visual language now carries from hero to board to breakdown.</li>
            </ul>
            <div className="row wrap hero-growth-row">
              <span className="badge glow-badge">Invite code {growthSummary?.inviteCode || 'MSCODE'}</span>
              <span className="badge">{growthSummary?.rewardLabel || 'Invite 3 to unlock 7 days Pro'}</span>
              <button className="ghost-button" onClick={onCopyReferral} type="button">Copy referral link</button>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-stat-grid premium-stat-grid">
        <div className="mini premium-mini accent-mini">
          <div className="eyebrow">Tonight’s lead</div>
          <div className="value">{selected.symbol}</div>
          <div className="muted small">{selected.name}</div>
        </div>
        <div className="mini premium-mini">
          <div className="eyebrow">Direction</div>
          <div className="value sentiment-word">{selected.sentiment}</div>
          <div className="muted small">Directional posture</div>
        </div>
        <div className="mini premium-mini">
          <div className="eyebrow">Conviction</div>
          <div className="value">{selected.conviction}%</div>
          <div className="muted small">Alignment of the setup</div>
        </div>
        <div className="mini premium-mini sync-mini">
          <div className="eyebrow">Sync state</div>
          <div className="value">{syncLabel}</div>
          <div className="muted small">{syncDetail}</div>
          <button className="ghost-button sync-inline-action" onClick={onOpenControls} type="button">
            {isLocalOnly ? 'Open setup' : 'Manage account'}
          </button>
        </div>
        <div className="mini premium-mini">
          <div className="eyebrow">Watchlist</div>
          <div className="value">{watchlistCount}</div>
          <div className="muted small">Tracked assets</div>
        </div>
        <div className="mini premium-mini onboarding-mini">
          <div className="eyebrow">Plan view</div>
          <div className="value">{planTier === 'pro' ? 'Pro active' : 'Free plan'}</div>
          <div className="muted small">
            {planTier === 'pro'
              ? 'Full breakdowns, validation, and forward tracking are unlocked.'
              : "You can already use Tonight's Brief, board scan, watchlist, and alerts. Pro adds deeper validation and follow-through tools."}
          </div>
          <button className="ghost-button sync-inline-action" onClick={onOpenControls} type="button">{planTier === 'pro' ? 'Manage billing' : 'See plan details'}</button>
        </div>
      </div>
    </section>
  );
}
