'use client';

function formatSourceType(value = '') {
  if (value === 'x') return 'X';
  if (value === 'article') return 'Article';
  return 'Note';
}

export default function SignalContextPanel({ context, asset }) {
  if (!context || !asset) return null;

  const sourceTypes = context?.meta?.sourceTypes || {};

  return (
    <section className="signal-context-panel card" id="signal-context">
      <div className="signal-context-head">
        <div>
          <div className="eyebrow">Signal context</div>
          <h2 className="section-title">News + X context layer</h2>
        </div>
        <div className="stack" style={{ alignItems: 'flex-end', gap: 8 }}>
          <span className={`badge tone-${asset.sentiment || 'neutral'}`}>{asset.signalLabel || 'Balanced signal posture'}</span>
          <span className="badge">{context?.meta?.live ? 'Live-ready context' : 'Narrative fallback active'}</span>
        </div>
      </div>

      <div className="signal-context-hero">
        <div className="signal-context-title">{context.headline}</div>
        <div className="muted small">{context.subhead}</div>
        <p className="signal-context-setup">{context.setup}</p>
      </div>

      <div className="since-chip-row" style={{ marginBottom: 16 }}>
        <div className="since-chip">Articles: {sourceTypes.article || 0}</div>
        <div className="since-chip">X items: {sourceTypes.x || 0}</div>
        <div className="since-chip">Notes: {sourceTypes.note || 0}</div>
        <div className="since-chip">{context?.meta?.updatedAt ? `Updated ${new Date(context.meta.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Awaiting live feed items'}</div>
      </div>

      <div className="signal-context-grid">
        <div className="signal-context-card">
          <div className="signal-context-label">Narrative cues</div>
          <div className="signal-context-list">
            {context.newsCues.map((item) => (
              <div key={item.title} className="signal-context-item">
                <div className="signal-context-item-title">{item.title}</div>
                <div className="muted small">{item.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="signal-context-card">
          <div className="signal-context-label">X watch</div>
          <div className="signal-context-list">
            {context.xAngles.map((item) => (
              <div key={item} className="signal-context-item">
                <div className="signal-context-item-title">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="signal-context-grid" style={{ marginTop: 16 }}>
        <div className="signal-context-card">
          <div className="signal-context-label">Recent context</div>
          <div className="signal-context-list">
            {context.recentItems?.length ? context.recentItems.map((item) => (
              <div key={item.id} className="signal-context-item">
                <div className="signal-context-item-title">{item.title}</div>
                <div className="muted small">
                  {formatSourceType(item.sourceType)} · {item.source}
                  {item.assetMentions?.length ? ` · ${item.assetMentions.join(', ')}` : ''}
                </div>
              </div>
            )) : (
              <div className="signal-context-item">
                <div className="signal-context-item-title">No ingested items yet</div>
                <div className="muted small">This panel will switch to real feed items as soon as article, RSS, or X payloads are posted into the context ingestion route.</div>
              </div>
            )}
          </div>
        </div>

        <div className="signal-context-card">
          <div className="signal-context-label">Asset mentions</div>
          <div className="signal-context-list">
            {context.assetMentions?.length ? context.assetMentions.map((item) => (
              <div key={item.symbol} className="signal-context-item">
                <div className="signal-context-item-title">{item.symbol}{item.isPrimary ? ' · primary focus' : ''}</div>
                <div className="muted small">{item.count} live context mention{item.count === 1 ? '' : 's'}</div>
              </div>
            )) : (
              <div className="signal-context-item">
                <div className="signal-context-item-title">Awaiting symbol mentions</div>
                <div className="muted small">When incoming items mention assets like ADA, BTC, or SOL, they will be surfaced here automatically.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="signal-context-foot muted small">
        Live feed scaffolding is now in place. The safest next layer is piping RSS, manual article drops, or future X automation payloads into the ingestion route without relying on brittle scraping in the app.
      </div>
    </section>
  );
}
