'use client';

import BeaconLogo from '@/components/BeaconLogo';
import { formatTime } from '@/lib/utils';

export default function HeroSection({ selected, user, status, lastSyncedAt, watchlistCount }) {
  return (
    <section className="hero hero-shell">
      <div className="stack hero-copy">
        <div className="brand-row brand-row-large">
          <div className="beacon-wrap">
            <BeaconLogo size={108} animated />
          </div>
          <div className="brand-copy">
            <div className="eyebrow">Midnight Signal · v11.12</div>
            <h1>What’s the signal tonight?</h1>
            <p>
              Transforming Market Data → Information → Knowledge → Understanding → Market Wisdom.
              Know the setup, the why, and act with more confidence.
            </p>
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
        <div className="mini">
          <div className="eyebrow">Sync state</div>
          <div className="value">{user ? 'Cloud ready' : 'Local mode'}</div>
          <div className="muted small">{lastSyncedAt ? formatTime(lastSyncedAt) : status}</div>
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
