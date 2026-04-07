'use client';

import BeaconLogo from '@/components/BeaconLogo';
import { formatTime } from '@/lib/utils';

export default function HeroSection({ selected, user, status, syncing, lastSyncedAt, watchlistCount, onOpenControls}) {
  const isLocalOnly = !user;
  const syncLabel = user ? (syncing ? 'Syncing…' : 'Sync Active') : 'Saved locally';
  const syncDetail = user
    ? (lastSyncedAt ? `Last synced ${formatTime(lastSyncedAt)}` : 'Your settings follow you across devices.')
    : 'Saved locally on this device.';

  return (
    <section className="hero hero-shell">
      <div className="stack hero-copy">
        <div className="brand-row brand-row-large">
          <div className="beacon-wrap">
            <BeaconLogo size={108} animated />
          </div>
          <div className="brand-copy">
            <div className="eyebrow">Midnight Signal · v11.13.3</div>
            <h1>What’s the signal tonight?</h1>
            <p>
              Transforming Market Data → Information → Knowledge → Understanding → Market Wisdom.
              Know the setup, the why, and act with more confidence.
            </p>
            <div className="hero-support-copy">
              <p>Start with the top signal, read the why, then scan the Top 20 for broader market context.</p>
              <p>When signed in, your selected asset, mode, strategy, timeframe, watchlist, and disclaimer acceptance stay in sync across devices.</p>
            </div>
          </div>
        </div>

        <div className="hero-pill-row">
          <span className="badge glow-badge">Surface-first flow restored</span>
          <span className="badge">Learning drawer</span>
          <span className="badge">Controls drawer</span>
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
          {isLocalOnly ? (
            <button className="ghost-button sync-inline-action" onClick={onOpenControls}>
              Sync now
            </button>
          ) : (
            <button className="ghost-button sync-inline-action" onClick={onOpenControls}>
              Manage sync
            </button>
          )}
        </div>
        <div className="mini">
          <div className="eyebrow">Watchlist</div>
          <div className="value">{watchlistCount}</div>
          <div className="muted small">Tracked assets</div>
        </div>
      </div>
    </section>
  );
}
