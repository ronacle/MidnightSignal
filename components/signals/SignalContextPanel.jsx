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
          <span className="badge">{context?.meta?.live ? 'Scored live context' : 'Narrative fallback active'}</span>
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
        <div className="since-chip">Crowd tone: {context?.meta?.crowdTone || context?.crowdTone || 'mixed'}</div>
        <div className="since-chip">{context?.meta?.updatedAt ? `Updated ${new Date(context.meta.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Awaiting live feed items'}</div>
      </div>

      <div className="signal-context-grid">
        <div className="signal-context-card">
          <div className="signal-context-label">Narrative cues</div>
          <div className="signal-context-list">
            {context.newsCues.map((item, idx) => (
              <div key={`${item.title}-${idx}`} className="signal-context-item">
                <div className="signal-context-item-title">{item.title}</div>
                {item.headline ? <div className="muted small" style={{ marginBottom: 4 }}>{item.headline}</div> : null}
                <div className="muted small">{item.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="signal-context-card">
          <div className="signal-context-label">X watch</div>
          <div className="signal-context-list">
            {context.xAngles.map((item, idx) => (
              <div key={`${item}-${idx}`} className="signal-context-item">
                <div className="signal-context-item-title">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="signal-context-grid" style={{ marginTop: 16 }}>
        <div className="signal-context-card">
          <div className="signal-context-label">Narrative pressure</div>
          <div className="signal-context-item">
            <div className="signal-context-item-title">{context.narrativePressure}</div>
            <div className="muted small">Crowd tone right now reads as {context.crowdTone || 'mixed'}.</div>
          </div>
        </div>

        <div className="signal-context-card">
          <div className="signal-context-label">Related assets</div>
          <div className="signal-context-list">
            {context.assetMentions?.length ? context.assetMentions.map((item) => (
              <div key={item.symbol} className="signal-context-item">
                <div className="signal-context-item-title">{item.symbol}{item.isPrimary ? ' · primary focus' : ''}</div>
                <div className="muted small">{item.count} context mention{item.count === 1 ? '' : 's'}</div>
              </div>
            )) : (
              <div className="signal-context-item">
                <div className="signal-context-item-title">Awaiting symbol mentions</div>
                <div className="muted small">Incoming items that mention ADA, BTC, SOL, Cardano, Bitcoin, Ethereum, or Midnight will be surfaced here.</div>
              </div>
            )}
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
                  {item.relevanceScore ? ` · score ${item.relevanceScore}` : ''}
                </div>
              </div>
            )) : (
              <div className="signal-context-item">
                <div className="signal-context-item-title">No ingested items yet</div>
                <div className="muted small">This panel will switch to scored live context as soon as article, RSS, or X payloads are posted into the ingestion route.</div>
              </div>
            )}
          </div>
        </div>

        <div className="signal-context-card">
          <div className="signal-context-label">Scoring notes</div>
          <div className="signal-context-item">
            <div className="signal-context-item-title">What gets prioritized</div>
            <div className="muted small">Fresh items, stronger asset matches, clearer crowd tone, and lower-duplicate coverage now rank higher than generic or repeated mentions.</div>
          </div>
        </div>
      </div>
    </section>
  );
}
