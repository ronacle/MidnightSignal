'use client';

function LearnLink({ term, onOpenLearning, className = '', children = null }) {
  const content = children || term;
  return (
    <button type="button" className={`inline-learn-link ${className}`.trim()} onClick={() => onOpenLearning?.(term)}>
      {content}
    </button>
  );
}

function formatSourceType(value = '') {
  if (value === 'x') return 'X';
  if (value === 'article') return 'Article';
  return 'Note';
}

function formatDriverLabel(label = '') {
  return String(label || '').replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();
}

function getTopDrivers(asset) {
  const factors = Object.entries(asset?.factors || {})
    .filter(([, value]) => typeof value === 'number')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, value]) => ({ label: formatDriverLabel(label), value }));

  if (factors.length) return factors;

  return [
    { label: 'Momentum', value: asset?.signalScore ?? asset?.conviction ?? 0 },
    { label: 'Structure', value: Math.max(45, (asset?.signalScore ?? asset?.conviction ?? 50) - 6) },
    { label: 'Participation', value: Math.max(40, Math.round((asset?.volumeToMarketCap || 0) * 10)) },
  ];
}

function buildExplainability(context, asset, experience) {
  const profile = experience?.userType || 'Beginner';
  const intent = experience?.intent || 'learn';
  const conviction = Number(asset?.signalScore ?? asset?.conviction ?? 0);
  const reasons = Array.isArray(asset?.signalReasons) ? asset.signalReasons.slice(0, 3) : [];
  const drivers = getTopDrivers(asset);
  const driverNames = drivers.map((item) => item.label);
  const crowdTone = context?.meta?.crowdTone || context?.crowdTone || 'mixed';
  const articleCount = Number(context?.meta?.sourceTypes?.article || 0);
  const xCount = Number(context?.meta?.sourceTypes?.x || 0);
  const volatility = Number(asset?.factors?.volatility || 0);
  const structure = Number(asset?.factors?.structure || 0);
  const momentum = Number(asset?.factors?.momentum || 0);
  const relativeStrength = Number(asset?.factors?.relativeStrength || 0);
  const direction = asset?.sentiment === 'bearish' ? 'downside pressure' : asset?.sentiment === 'bullish' ? 'upside pressure' : 'a balanced posture';

  let why = [];
  if (reasons.length) {
    why = reasons;
  } else {
    why = [
      `${driverNames[0] || 'Momentum'} is one of the strongest inputs in the current score.`,
      `${driverNames[1] || 'Structure'} is helping keep the setup from reading as pure noise.`,
      `${driverNames[2] || 'Participation'} is adding confirmation to the current posture.`,
    ];
  }

  let means = '';
  let watch = '';

  if (profile === 'Beginner') {
    means = conviction >= 70
      ? `Right now the market is leaning more clearly in one direction, and ${asset.symbol} is one of the stronger names in that move.`
      : conviction >= 55
        ? `${asset.symbol} has a usable setup, but it still needs more confirmation before it feels decisive.`
        : `${asset.symbol} is showing mixed evidence, so this is more of a watch item than a high-confidence setup.`;
    watch = asset?.sentiment === 'bearish'
      ? `Watch whether weakness keeps spreading. If the score slips further or the crowd tone worsens, the setup gets less reliable.`
      : `Watch whether the current strength keeps holding. If momentum fades or structure softens, the signal can cool quickly.`;
  } else if (profile === 'Active trader') {
    means = conviction >= 70
      ? `${asset.symbol} is reading like a continuation candidate with ${direction} and better board leadership than most of the field.`
      : `${asset.symbol} is tradable, but still sitting in a middling zone where confirmation matters more than anticipation.`;
    watch = asset?.sentiment === 'bearish'
      ? `Respect reversal risk if volatility rises without structure improving. A softer crowd read can accelerate downside.`
      : `Stay focused on follow-through. If momentum remains above structure and relative strength stays firm, continuation bias remains valid.`;
  } else {
    means = conviction >= 70
      ? `${asset.symbol} is showing a stronger longer-horizon posture than most names on the board, which can matter more than short-term noise.`
      : `${asset.symbol} is improving, but the longer-horizon read still needs steadier confirmation before it earns more confidence.`;
    watch = `Focus on whether structure (${structure || '—'}) and relative strength (${relativeStrength || '—'}) stay firm enough to support the broader trend read.`;
  }

  const changed = [
    articleCount || xCount
      ? `Narrative attention is elevated by ${articleCount} article${articleCount === 1 ? '' : 's'} and ${xCount} X item${xCount === 1 ? '' : 's'} in the current context layer.`
      : 'Live context is still light, so the explanation is leaning more on the signal engine than the narrative feed.',
    `Crowd tone currently reads as ${crowdTone}, which is ${crowdTone === 'bullish' ? 'reinforcing' : crowdTone === 'bearish' ? 'pressuring' : 'not strongly confirming'} the signal posture.`,
    volatility >= 70
      ? 'Volatility is elevated, so even a strong signal may feel less smooth than the score suggests.'
      : momentum > structure
        ? 'Momentum is running ahead of structure, which can be powerful early but still deserves confirmation.'
        : 'Structure is holding up reasonably well relative to momentum, which supports a steadier read.',
  ];

  const modeRead = profile === 'Beginner'
    ? 'Plain-English read'
    : profile === 'Active trader'
      ? 'Tactical read'
      : 'Long-horizon read';

  const modeSummary = profile === 'Beginner'
    ? 'This section translates the score into plain language before you scan more names.'
    : profile === 'Active trader'
      ? 'Use this to decide whether the setup deserves more screen time or just a quick pass.'
      : 'Use this to separate durable posture from short-term market noise.';

  const confidenceRead = conviction >= 70 ? 'High-conviction posture' : conviction >= 55 ? 'Developing posture' : 'Mixed posture';

  return { why, means, watch, changed, drivers, modeRead, modeSummary, confidenceRead, intent };
}

function ContextBadges({ context, asset }) {
  return (
    <>
      <span className={`badge tone-${asset.sentiment || 'neutral'}`}>{asset.signalLabel || 'Balanced signal posture'}</span>
      <span className="badge">{context?.meta?.live ? 'Scored live context' : 'Narrative fallback active'}</span>
    </>
  );
}

export default function SignalContextPanel({ context, asset, experience = null, collapsed = false, onToggleHide, onOpenLearning = null }) {
  if (!context || !asset) return null;

  const sourceTypes = context?.meta?.sourceTypes || {};
  const explain = buildExplainability(context, asset, experience);

  if (collapsed) {
    return (
      <section className="signal-context-panel signal-context-panel-collapsed card" id="signal-context">
        <div className="signal-context-collapsed-shell">
          <div className="signal-context-collapsed-top">
            <div className="signal-context-collapsed-titleblock">
              <div className="eyebrow">Optional context</div>
              <h2 className="section-title">Why this signal?</h2>
            </div>
            <div className="signal-context-collapsed-actions">
              <ContextBadges context={context} asset={asset} />
              {onToggleHide ? (
                <button
                  type="button"
                  className="ghost-button small section-collapse-toggle is-collapsed"
                  onClick={onToggleHide}
                  aria-expanded={false}
                  aria-label="Open signal context panel"
                >
                  Open
                </button>
              ) : null}
            </div>
          </div>
          <div className="signal-context-collapsed-summary muted small">
            Narrative context is tucked away so the main screen stays cleaner. Open it when you want the deeper why, what it means, and what to watch next.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="signal-context-panel card" id="signal-context">
      <div className="signal-context-head section-collapse-head">
        <div>
          <div className="eyebrow">Optional context</div>
          <h2 className="section-title">Why this signal?</h2>
        </div>
        <div className="stack section-collapse-actions" style={{ alignItems: 'flex-end', gap: 8 }}>
          <ContextBadges context={context} asset={asset} />
          {onToggleHide ? (
            <button
              type="button"
              className="ghost-button small section-collapse-toggle is-open"
              onClick={onToggleHide}
              aria-expanded={true}
              aria-label="Hide signal context panel"
            >
              Hide
            </button>
          ) : null}
        </div>
      </div>

      <div className="signal-context-hero">
        <div className="signal-context-title">{context.headline}</div>
        <div className="muted small">{context.subhead}</div>
        <p className="signal-context-setup">{context.setup}</p>
      </div>

      <div className="signal-context-explain-grid">
        <div className="signal-context-explain-card signal-context-explain-card-primary">
          <div className="signal-context-label">Why this signal exists</div>
          <div className="signal-context-mode-title">{explain.confidenceRead}</div>
          <div className="signal-context-bullets">
            {explain.why.map((item, idx) => (
              <div key={`${item}-${idx}`} className="signal-context-bullet">
                <span className="signal-context-bullet-dot" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="signal-context-driver-row">
            {explain.drivers.map((item) => (
              <span key={item.label} className="since-chip"><LearnLink term={item.label} onOpenLearning={onOpenLearning}>{item.label}</LearnLink>: {item.value}</span>
            ))}
          </div>
        </div>

        <div className="signal-context-explain-card">
          <div className="signal-context-label">{explain.modeRead}</div>
          <div className="signal-context-mode-title">What this usually means</div>
          <p className="signal-context-explain-copy">{explain.means}</p>
          <div className="muted small">{explain.modeSummary}</div>
        </div>

        <div className="signal-context-explain-card">
          <div className="signal-context-label">What changed tonight</div>
          <div className="signal-context-mode-title">What to watch next</div>
          <div className="signal-context-bullets">
            {explain.changed.map((item, idx) => (
              <div key={`${item}-${idx}`} className="signal-context-bullet">
                <span className="signal-context-bullet-dot" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="signal-context-watch-note">{explain.watch}</div>
        </div>
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
