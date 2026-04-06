'use client';

export default function WatchlistPanel({ watchlistItems = [], onSelectAsset, onToggleWatchlist }) {
  if (!watchlistItems.length) {
    return (
      <section className="panel stack compact-watchlist-panel">
        <div className="row space-between">
          <h2 className="section-title">Watchlist</h2>
          <span className="muted small">0 tracked</span>
        </div>
        <div className="muted small">Add assets to your watchlist to pin them here for quick access.</div>
      </section>
    );
  }

  return (
    <section className="panel stack compact-watchlist-panel">
      <div className="row space-between">
        <h2 className="section-title">Watchlist</h2>
        <span className="muted small">{watchlistItems.length} tracked</span>
      </div>

      <div className="watchlist-compact-grid">
        {watchlistItems.map((asset) => (
          <div key={asset.symbol} className="watchlist-compact-card">
            <div className="watchlist-compact-main">
              <div className="watchlist-compact-symbol">{asset.symbol}</div>
              <div className="watchlist-compact-name">{asset.name}</div>
            </div>

            <div className="watchlist-compact-meta">
              <span className="watchlist-meta-pill">{asset.confidence}%</span>
              <span className="watchlist-meta-pill">{asset.conviction || asset.posture || 'Signal'}</span>
            </div>

            <div className="watchlist-compact-actions">
              <button
                type="button"
                className="icon-action"
                aria-label={`View ${asset.symbol}`}
                title={`View ${asset.symbol}`}
                onClick={() => onSelectAsset?.(asset.symbol)}
              >
                👁
              </button>

              <button
                type="button"
                className="icon-action destructive"
                aria-label={`Remove ${asset.symbol} from watchlist`}
                title={`Remove ${asset.symbol}`}
                onClick={() => onToggleWatchlist?.(asset.symbol)}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
