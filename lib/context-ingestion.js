const MEMORY_KEY = '__midnightSignalContextMemory';

const ASSET_ALIASES = {
  BTC: ['BTC', 'BITCOIN'],
  ETH: ['ETH', 'ETHEREUM'],
  ADA: ['ADA', 'CARDANO'],
  SOL: ['SOL', 'SOLANA'],
  XRP: ['XRP', 'RIPPLE'],
  BNB: ['BNB', 'BINANCE COIN', 'BINANCE'],
  DOGE: ['DOGE', 'DOGECOIN'],
  AVAX: ['AVAX', 'AVALANCHE'],
  LINK: ['LINK', 'CHAINLINK'],
  DOT: ['DOT', 'POLKADOT'],
  SUI: ['SUI'],
  HBAR: ['HBAR', 'HEDERA'],
  MIDNIGHT: ['MIDNIGHT', 'MIDNIGHT NETWORK'],
};

function getStore() {
  if (!globalThis[MEMORY_KEY]) {
    globalThis[MEMORY_KEY] = {
      items: [],
      updatedAt: null,
    };
  }
  return globalThis[MEMORY_KEY];
}

function cleanText(value = '') {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizedSourceType(value = '') {
  const lowered = String(value || '').toLowerCase();
  if (['x', 'tweet', 'twitter', 'post'].includes(lowered)) return 'x';
  if (['rss', 'feed', 'article', 'news'].includes(lowered)) return 'article';
  return 'note';
}

function tokenize(value = '') {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function buildDuplicateKey(item = {}) {
  const titleTokens = tokenize(item.title).slice(0, 10).join(' ');
  const source = cleanText(item.source).toLowerCase();
  return `${item.sourceType || 'note'}|${source}|${titleTokens}`;
}

function similarityScore(a = '', b = '') {
  const aTokens = new Set(tokenize(a));
  const bTokens = new Set(tokenize(b));
  if (!aTokens.size || !bTokens.size) return 0;

  let overlap = 0;
  aTokens.forEach((token) => {
    if (bTokens.has(token)) overlap += 1;
  });

  return overlap / Math.max(aTokens.size, bTokens.size);
}

export function detectAssetMentions(text = '') {
  const cleaned = ` ${cleanText(text).toUpperCase()} `;
  const mentions = [];

  Object.entries(ASSET_ALIASES).forEach(([symbol, aliases]) => {
    const matched = aliases.some((alias) => {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      return new RegExp(`(^|\\W)${escaped}(?=$|\\W)`, 'i').test(cleaned);
    });
    if (matched) mentions.push(symbol);
  });

  return mentions;
}

function inferSentimentHint(text = '') {
  const lowered = cleanText(text).toLowerCase();

  const constructive = ['breakout', 'approval', 'gain', 'surge', 'growth', 'accumulate', 'support', 'strength', 'rebound', 'strong'];
  const cautious = ['delay', 'warning', 'weak', 'uncertain', 'slowdown', 'fade', 'mixed', 'range'];
  const riskOff = ['hack', 'selloff', 'liquidation', 'outflow', 'lawsuit', 'panic', 'fear', 'crash', 'risk-off', 'breakdown'];
  const hype = ['moon', 'explode', 'parabolic', 'send it', 'squeeze', 'mania', 'crowded', 'fomo'];

  let score = 0;
  constructive.forEach((word) => { if (lowered.includes(word)) score += 2; });
  cautious.forEach((word) => { if (lowered.includes(word)) score -= 1; });
  riskOff.forEach((word) => { if (lowered.includes(word)) score -= 3; });
  hype.forEach((word) => { if (lowered.includes(word)) score += 1; });

  if (riskOff.some((word) => lowered.includes(word))) return 'risk-off';
  if (hype.some((word) => lowered.includes(word)) && score > 0) return 'hype';
  if (score >= 3) return 'constructive';
  if (score <= -2) return 'cautious';
  return 'mixed';
}

function sourceWeight(sourceType = 'note') {
  if (sourceType === 'article') return 1.1;
  if (sourceType === 'x') return 1.0;
  return 0.85;
}

export function scoreContextItem(item = {}, focusSymbols = []) {
  const now = Date.now();
  const itemTime = item.timestamp ? new Date(item.timestamp).getTime() : now;
  const ageHours = Math.max(0, (now - itemTime) / (1000 * 60 * 60));
  const recency = Math.max(0, 48 - ageHours) / 48;
  const focus = new Set((focusSymbols || []).map((value) => String(value).toUpperCase()));
  const mentionScore = (item.assetMentions || []).reduce((acc, symbol) => acc + (focus.has(symbol) ? 2 : 0.5), 0);

  const sentimentScoreMap = {
    constructive: 1.25,
    mixed: 0.85,
    cautious: 0.95,
    'risk-off': 1.15,
    hype: 1.0,
  };

  const sentimentWeight = sentimentScoreMap[item.sentimentHint || 'mixed'] || 0.85;
  const titleBonus = cleanText(item.title).length > 18 ? 0.25 : 0;
  const score = Number((((recency * 3) + mentionScore + titleBonus) * sourceWeight(item.sourceType) * sentimentWeight).toFixed(2));

  return {
    ...item,
    relevanceScore: score,
    ageHours: Number(ageHours.toFixed(1)),
  };
}

function inferCatalystType(item = {}) {
  const text = `${item.title || ''} ${item.body || ''} ${item.source || ''}`.toLowerCase();
  if (/cardano|ada|midnight/.test(text)) return 'Cardano';
  if (/fed|rates|cpi|inflation|macro|treasury|jobs|tariff|etf/.test(text)) return 'Macro';
  if (/bitcoin|ethereum|solana|altcoin|crypto market|majors/.test(text)) return 'Market';
  if (/upgrade|launch|partnership|bridge|validator|staking|governance|network|ecosystem/.test(text)) return 'Ecosystem';
  return 'Altcoin';
}

export function normalizeContextItem(item = {}) {
  const title = cleanText(item.title || item.headline || 'Untitled context item');
  const body = cleanText(item.body || item.summary || item.text || '');
  const source = cleanText(item.source || item.handle || item.publisher || 'Context feed');
  const url = cleanText(item.url || item.href || '');
  const sourceType = normalizedSourceType(item.sourceType || item.type || item.kind);
  const timestamp = item.timestamp || item.publishedAt || item.pubDate || new Date().toISOString();

  const assetMentions = Array.isArray(item.assetMentions) && item.assetMentions.length
    ? item.assetMentions.map((value) => String(value).toUpperCase())
    : detectAssetMentions(`${title} ${body}`);

  const sentimentHint = item.sentimentHint || inferSentimentHint(`${title} ${body}`);
  const catalystType = cleanText(item.catalystType || item.category || item.tag || inferCatalystType({ title, body, source })) || 'Market';

  return {
    id: cleanText(item.id || `${sourceType}-${title}-${timestamp}`).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 96),
    title,
    body,
    source,
    url,
    sourceType,
    timestamp,
    assetMentions,
    sentimentHint,
    catalystType,
  };
}

function dedupeItems(items = []) {
  const output = [];
  const keys = new Set();

  for (const item of items) {
    const key = buildDuplicateKey(item);
    if (keys.has(key)) continue;

    const nearDuplicate = output.some((existing) => {
      if (existing.sourceType !== item.sourceType) return false;
      const titleSim = similarityScore(existing.title, item.title);
      const bodySim = similarityScore(existing.body, item.body);
      return titleSim >= 0.72 || bodySim >= 0.8;
    });

    if (nearDuplicate) continue;

    keys.add(key);
    output.push(item);
  }

  return output;
}

export function ingestContextItems(input = []) {
  const store = getStore();
  const incoming = (Array.isArray(input) ? input : [input])
    .map(normalizeContextItem)
    .filter((item) => item.title);

  store.items = dedupeItems([...incoming, ...store.items])
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 120);

  store.updatedAt = new Date().toISOString();

  return {
    items: store.items,
    updatedAt: store.updatedAt,
    inserted: incoming.length,
  };
}

export function listContextItems({ symbol = '', watchlist = [] } = {}) {
  const store = getStore();
  const desired = new Set(
    [symbol, ...(Array.isArray(watchlist) ? watchlist : [])]
      .map((value) => String(value || '').toUpperCase())
      .filter(Boolean)
  );

  const filtered = desired.size
    ? store.items.filter((item) => item.assetMentions.some((mention) => desired.has(mention)))
    : store.items;

  const scored = filtered
    .map((item) => scoreContextItem(item, [...desired]))
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

  const articleCount = scored.filter((item) => item.sourceType === 'article').length;
  const xCount = scored.filter((item) => item.sourceType === 'x').length;

  return {
    items: scored.slice(0, 12),
    updatedAt: store.updatedAt,
    meta: {
      live: scored.length > 0,
      sourceTypes: {
        article: articleCount,
        x: xCount,
        note: scored.filter((item) => item.sourceType === 'note').length,
      },
    },
  };
}
