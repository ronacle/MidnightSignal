'use client';

function formatSourceType(value = '') {
  if (value === 'x') return 'X';
  if (value === 'article') return 'Article';
  return 'Note';
}

function formatSourceNetwork(value = '') {
  if (value === 'x') return 'X';
  if (value === 'rss') return 'RSS';
  return 'Manual';
}

function safeText(value, fallback = '') {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === 'string' || typeof item === 'number' || (item && typeof item === 'object'));
    return safeText(first, fallback);
  }
  if (value && typeof value === 'object') {
    return safeText(value.headline ?? value.title ?? value.label ?? value.detail ?? value.body ?? value.summary ?? value.text, fallback);
  }
  return fallback;
}

export default function SignalContextPanel({ context, asset, planTier = 'basic' }) {
  if (!context || !asset) return null;

  const sourceTypes = context?.meta?.sourceTypes || {};
  const catalystFeed = Array.isArray(context?.catalystFeed) ? context.catalystFeed : [];
  const premiumLocked = planTier !== 'pro';
  const visibleCatalysts = premiumLocked ? catalystFeed.slice(0, 2) : catalystFeed;

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

<div className="signal-context-strip">
  <div className="signal-context-strip-card">
    <div className="signal-context-label">Market context</div>
    <div className="signal-context-item-title">{safeText(context.marketContext?.headline, 'Market context loading')}</div>
    <div className="muted small">{safeText(context.marketContext?.detail, 'Broader tape context will appear here as data refreshes.')}</div>
  </div>
  <div className="signal-context-strip-card">
    <div className="signal-context-label">Catalyst watch</div>
    <div className="signal-context-item-title">{safeText(context.catalystLine, 'Catalyst watch is warming up')}</div>
    <div className="muted small">This is the shortest explanation of why tonight&apos;s setup matters right now.</div>
  </div>
</div>

<div className="signal-context-hero">
        <div className="signal-context-title">{safeText(context.headline, 'Signal context ready')}</div>
        <div className="muted small">{safeText(context.subhead, 'Context is organizing the strongest narrative cues for tonight.')}</div>
        <p className="signal-context-setup">{safeText(context.setup, 'Why this matters will appear here as the engine scores the latest posture.')}</p>
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
              <div key={`${safeText(item.title, 'Narrative cue')}-${idx}`} className="signal-context-item">
                <div className="signal-context-item-title">{safeText(item.title, 'Narrative cue')}</div>
                {item.headline ? <div className="muted small" style={{ marginBottom: 4 }}>{safeText(item.headline, '')}</div> : null}
                <div className="muted small">{safeText(item.body, 'Context detail unavailable.')}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="signal-context-card">
          <div className="signal-context-label">X watch</div>
          <div className="signal-context-list">
            {context.xAngles.map((item, idx) => (
              <div key={`${safeText(item, 'Context item')}-${idx}`} className="signal-context-item">
                <div className="signal-context-item-title">{safeText(item, 'Context item')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="signal-context-grid" style={{ marginTop: 16 }}>
        <div className="signal-context-card">
          <div className="signal-context-label">Catalyst match</div>
          <div className="signal-context-item">
            <div className="signal-context-item-title">{safeText(context.catalystMatch?.label, 'No clear catalyst detected')}</div>
            <div className="muted small">{safeText(context.catalystMatch?.detail, 'The signal is currently leading the context read.')}</div>
            <div className="muted small" style={{ marginTop: 8 }}>Strength: {safeText(context.catalystMatch?.strength, 'Signal-led')}</div>
          </div>
        </div>

        <div className="signal-context-card">
          <div className="signal-context-label">Catalyst feed</div>
          <div className="signal-context-list">
            {visibleCatalysts.length ? visibleCatalysts.map((item) => (
              <div key={item.id} className="signal-context-item catalyst-feed-item">
                <div className="row wrap-gap" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div className="signal-context-item-title">{safeText(item.title, 'Narrative cue')}</div>
                  <span className="badge">{safeText(item.catalystType, 'Market')}</span>
                </div>
                <div className="muted small">{safeText(item.body, 'Context detail unavailable.')}</div>
                <div className="muted small" style={{ marginTop: 8 }}>
                  {formatSourceType(item.sourceType)} · {formatSourceNetwork(item.sourceNetwork)} · {item.sourceHandle ? `${safeText(item.sourceHandle)} · ` : ''}{safeText(item.source, 'Source')} · {safeText(item.matchLabel, 'context match')}
                </div>
              {item.url ? <div className="muted small" style={{ marginTop: 4, wordBreak: 'break-all' }}>{safeText(item.url, '')}</div> : null}
              </div>
            )) : (
              <div className="signal-context-item">
                <div className="signal-context-item-title">No catalyst items yet</div>
                <div className="muted small">As news, RSS, or X items arrive, this feed will rank the strongest possible drivers for tonight&apos;s setup.</div>
              </div>
            )}
            {premiumLocked && catalystFeed.length > visibleCatalysts.length ? (
              <div className="signal-context-item catalyst-feed-locked">
                <div className="signal-context-item-title">Pro unlock: full catalyst feed</div>
                <div className="muted small">Free shows the strongest catalysts. Pro reveals the full feed, deeper matching, and broader context fusion.</div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="signal-context-grid" style={{ marginTop: 16 }}>
        <div className="signal-context-card">
          <div className="signal-context-label">Bridge status</div>
          <div className="signal-context-item">
            <div className="signal-context-item-title">{safeText(context.catalystBridge?.source, 'Context bridge ready')}</div>
            <div className="muted small">{safeText(context.catalystBridge?.detail, 'Waiting for catalyst items to arrive through the bridge.')}</div>
            <div className="since-chip-row" style={{ marginTop: 10 }}>
              {(context.catalystBridge?.accepts || []).map((item) => <div key={safeText(item, 'Context item')} className="since-chip">{item.toUpperCase()} accepted</div>)}
            </div>
          </div>
        </div>

        <div className="signal-context-card">
          <div className="signal-context-label">Catalyst mix</div>
          <div className="since-chip-row" style={{ marginBottom: 8 }}>
            {Object.entries(context.catalystBridge?.counts || {}).length ? Object.entries(context.catalystBridge.counts).map(([key, value]) => (
              <div key={key} className="since-chip">{key}: {value}</div>
            )) : <div className="since-chip">Awaiting tagged catalyst items</div>}
          </div>
          <div className="since-chip-row" style={{ marginBottom: 0 }}>
            {Object.entries(context.catalystBridge?.sourceCounts || {}).length ? Object.entries(context.catalystBridge.sourceCounts).map(([key, value]) => (
              <div key={key} className="since-chip">{formatSourceNetwork(key)}: {value}</div>
            )) : <div className="since-chip">Awaiting source hooks</div>}
          </div>
        </div>
      </div>


      <div className="signal-context-grid" style={{ marginTop: 16 }}>
        <div className="signal-context-card">
          <div className="signal-context-label">Related to this signal</div>
          <div className="signal-context-list">
            {context.relatedSignalItems?.length ? context.relatedSignalItems.map((item) => (
              <div key={item.id} className="signal-context-item">
                <div className="signal-context-item-title">{safeText(item.title, 'Narrative cue')}</div>
                <div className="muted small">{safeText(item.relation, 'Related to current signal')} · {safeText(item.tone, 'mixed')} · {formatSourceNetwork(item.sourceNetwork)} · {item.sourceHandle ? `${safeText(item.sourceHandle)} · ` : ''}{safeText(item.source, 'Source')}</div>
              </div>
            )) : (
              <div className="signal-context-item">
                <div className="signal-context-item-title">Awaiting related catalyst items</div>
                <div className="muted small">As X posts, RSS items, and manual notes are ingested, the strongest matches for the active signal will land here.</div>
              </div>
            )}
          </div>
        </div>

        <div className="signal-context-card">
          <div className="signal-context-label">Feed hook fields</div>
          <div className="since-chip-row" style={{ marginBottom: 0 }}>
            {(context.catalystBridge?.fields || []).length ? context.catalystBridge.fields.map((item) => (
              <div key={safeText(item, 'Context item')} className="since-chip">{safeText(item, 'Context item')}</div>
            )) : <div className="since-chip">headline · summary · url · assetMentions</div>}
          </div>
        </div>
      </div>

      <div className="signal-context-grid" style={{ marginTop: 16 }}>
        <div className="signal-context-card">
          <div className="signal-context-label">Narrative pressure</div>
          <div className="signal-context-item">
            <div className="signal-context-item-title">{safeText(context.narrativePressure, 'Narrative pressure is still mixed tonight.')}</div>
            <div className="muted small">Crowd tone right now reads as {safeText(context.crowdTone, 'mixed')}.</div>
          </div>
        </div>

        <div className="signal-context-card">
          <div className="signal-context-label">Related assets</div>
          <div className="signal-context-list">
            {context.assetMentions?.length ? context.assetMentions.map((item) => (
              <div key={safeText(item.symbol, 'Asset')} className="signal-context-item">
                <div className="signal-context-item-title">{safeText(item.symbol, 'Asset')}{item.isPrimary ? ' · primary focus' : ''}</div>
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
                <div className="signal-context-item-title">{safeText(item.title, 'Narrative cue')}</div>
                <div className="muted small">
                  {formatSourceType(item.sourceType)} · {safeText(item.source, 'Source')}
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
