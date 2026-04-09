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

function clampText(value = '', max = 320) {
  const text = cleanText(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3).trim()}...`;
}

function normalizedSourceType(value = '') {
  const lowered = String(value || '').toLowerCase();
  if (['x', 'tweet', 'twitter', 'post'].includes(lowered)) return 'x';
  if (['rss', 'feed', 'article', 'news', 'rss-item', 'article-item'].includes(lowered)) return 'article';
  if (['newsletter', 'email', 'digest'].includes(lowered)) return 'newsletter';
  return 'note';
}

function canonicalizeUrl(value = '') {
  const raw = cleanText(value);
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    parsed.hash = '';
    if ((parsed.protocol === 'http:' && parsed.port === '80') || (parsed.protocol === 'https:' && parsed.port === '443')) {
      parsed.port = '';
    }
    const paramsToDrop = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'source'];
    paramsToDrop.forEach((key) => parsed.searchParams.delete(key));
    const pathname = parsed.pathname.replace(/\/$/, '');
    return `${parsed.origin}${pathname}${parsed.searchParams.toString() ? `?${parsed.searchParams.toString()}` : ''}`;
  } catch {
    return /^https?:\/\//i.test(raw) ? raw : '';
  }
}

function normalizeUrl(value = '') {
  return canonicalizeUrl(value);
}

function normalizedSourceNetwork(item = {}) {
  const raw = String(item.sourceNetwork || item.network || item.platform || '').toLowerCase();
  if (['x', 'twitter'].includes(raw)) return 'x';
  if (['rss', 'feed', 'article', 'news', 'google-news'].includes(raw)) return 'rss';
  if (['newsletter', 'email', 'digest'].includes(raw)) return 'newsletter';
  if (['manual', 'internal', 'note'].includes(raw)) return 'manual';
  const type = normalizedSourceType(item.sourceType || item.type || item.kind);
  if (type === 'x') return 'x';
  if (type === 'article') return 'rss';
  if (type === 'newsletter') return 'newsletter';
  return 'manual';
}

function tokenize(value = '') {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function buildDuplicateKey(item = {}) {
  if (item.externalId) return `external|${String(item.externalId).toLowerCase()}`;
  if (item.url) return `url|${canonicalizeUrl(item.url)}`;
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

function normalizeTimestamp(value) {
  const raw = cleanText(value || '');
  if (!raw) return new Date().toISOString();
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function freshnessHours(timestamp) {
  const time = new Date(timestamp || '').getTime();
  if (Number.isNaN(time)) return 0;
  return Math.max(0, (Date.now() - time) / (1000 * 60 * 60));
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
  if (sourceType === 'newsletter') return 1.05;
  if (sourceType === 'x') return 1.0;
  return 0.85;
}

function inferTopicBucket(item = {}) {
  const text = `${item.title || ''} ${item.body || ''} ${item.source || ''}`.toLowerCase();
  if (/cardano|ada/.test(text)) return 'Cardano';
  if (/midnight|midnight network/.test(text)) return 'Midnight';
  if (/fed|rates|cpi|inflation|macro|treasury|jobs|tariff|etf/.test(text)) return 'Macro';
  if (/bitcoin|ethereum|solana|altcoin|crypto market|majors/.test(text)) return 'Market';
  if (/upgrade|launch|partnership|bridge|validator|staking|governance|network|ecosystem/.test(text)) return 'Ecosystem';
  return 'General';
}

function inferCatalystType(item = {}) {
  const bucket = inferTopicBucket(item);
  if (bucket === 'General') return 'Altcoin';
  return bucket;
}

export function scoreContextItem(item = {}, focusSymbols = []) {
  const now = Date.now();
  const itemTime = item.timestamp ? new Date(item.timestamp).getTime() : now;
  const ageHours = Math.max(0, (now - itemTime) / (1000 * 60 * 60));
  const recency = Math.max(0, 72 - ageHours) / 72;
  const focus = new Set((focusSymbols || []).map((value) => String(value).toUpperCase()));
  const mentionScore = (item.assetMentions || []).reduce((acc, symbol) => acc + (focus.has(symbol) ? 2.25 : 0.45), 0);
  const directMatch = (item.assetMentions || []).some((symbol) => focus.has(symbol));
  const topicScore = item.topicBucket === 'Cardano' || item.topicBucket === 'Midnight'
    ? 1.15
    : item.topicBucket === 'Macro' || item.topicBucket === 'Market'
    ? 0.9
    : 0.65;

  const sentimentScoreMap = {
    constructive: 1.25,
    mixed: 0.85,
    cautious: 0.95,
    'risk-off': 1.15,
    hype: 1.0,
  };

  const sentimentWeight = sentimentScoreMap[item.sentimentHint || 'mixed'] || 0.85;
  const titleBonus = cleanText(item.title).length > 18 ? 0.25 : 0;
  const score = Number((((recency * 3.4) + mentionScore + titleBonus + topicScore + (directMatch ? 1.1 : 0)) * sourceWeight(item.sourceType) * sentimentWeight).toFixed(2));

  return {
    ...item,
    relevanceScore: score,
    ageHours: Number(ageHours.toFixed(1)),
    matchTier: directMatch ? 'Direct asset match' : item.assetMentions?.length ? 'Cross-asset match' : item.topicBucket === 'Macro' || item.topicBucket === 'Market' ? 'Market-wide context' : 'General context',
  };
}

export function normalizeContextItem(item = {}) {
  const title = cleanText(item.title || item.headline || 'Untitled context item');
  const body = clampText(item.body || item.summary || item.text || item.description || '', 420);
  const source = cleanText(item.source || item.handle || item.publisher || 'Context feed');
  const url = normalizeUrl(item.url || item.href || item.link || '');
  const sourceType = normalizedSourceType(item.sourceType || item.type || item.kind);
  const sourceNetwork = normalizedSourceNetwork(item);
  const sourceHandle = cleanText(item.sourceHandle || item.handle || item.author || '');
  const timestamp = normalizeTimestamp(item.timestamp || item.publishedAt || item.pubDate);

  const assetMentions = Array.isArray(item.assetMentions) && item.assetMentions.length
    ? item.assetMentions.map((value) => String(value).toUpperCase())
    : detectAssetMentions(`${title} ${body}`);

  const sentimentHint = item.sentimentHint || inferSentimentHint(`${title} ${body}`);
  const topicBucket = cleanText(item.topicBucket || item.topic || item.bucket || inferTopicBucket({ title, body, source })) || 'General';
  const catalystType = cleanText(item.catalystType || item.category || item.tag || inferCatalystType({ title, body, source })) || 'Market';
  const externalId = cleanText(item.externalId || item.guid || item.postId || item.tweetId || item.entryId || '');
  const imageUrl = normalizeUrl(item.imageUrl || item.image || item.thumbnail || item.image || '');

  return {
    id: cleanText(item.id || externalId || `${sourceType}-${title}-${timestamp}`).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 96),
    title,
    body,
    source,
    url,
    sourceType,
    sourceNetwork,
    sourceHandle,
    timestamp,
    assetMentions,
    sentimentHint,
    catalystType,
    topicBucket,
    externalId,
    imageUrl,
  };
}

function shouldReplaceExisting(existing = {}, incoming = {}) {
  const existingAge = freshnessHours(existing.timestamp);
  const incomingAge = freshnessHours(incoming.timestamp);
  const existingScore = (existing.assetMentions?.length || 0) + (existing.url ? 1 : 0) + (existing.externalId ? 1 : 0) - (existingAge / 72);
  const incomingScore = (incoming.assetMentions?.length || 0) + (incoming.url ? 1 : 0) + (incoming.externalId ? 1 : 0) - (incomingAge / 72);
  return incomingScore >= existingScore;
}

function dedupeItems(items = []) {
  const output = [];
  const keys = new Map();

  for (const item of items) {
    const key = buildDuplicateKey(item);
    if (keys.has(key)) {
      const idx = keys.get(key);
      if (shouldReplaceExisting(output[idx], item)) output[idx] = item;
      continue;
    }

    const nearDuplicateIndex = output.findIndex((existing) => {
      const sameUrl = existing.url && item.url && canonicalizeUrl(existing.url) === canonicalizeUrl(item.url);
      if (sameUrl) return true;
      const titleSim = similarityScore(existing.title, item.title);
      const bodySim = similarityScore(existing.body, item.body);
      return titleSim >= 0.76 || (titleSim >= 0.58 && bodySim >= 0.74);
    });

    if (nearDuplicateIndex >= 0) {
      if (shouldReplaceExisting(output[nearDuplicateIndex], item)) output[nearDuplicateIndex] = item;
      continue;
    }

    keys.set(key, output.length);
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
    .slice(0, 160);

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
    ? store.items.filter((item) => {
        const mentions = item.assetMentions || [];
        const topicBucket = String(item.topicBucket || '').toUpperCase();
        if (mentions.some((mention) => desired.has(mention))) return true;
        if (desired.has('ADA') && (topicBucket === 'CARDANO' || topicBucket === 'MIDNIGHT')) return true;
        return ['MARKET', 'MACRO'].includes(topicBucket);
      })
    : store.items;

  const scored = filtered
    .map((item) => scoreContextItem(item, [...desired]))
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

  const articleCount = scored.filter((item) => item.sourceType === 'article').length;
  const xCount = scored.filter((item) => item.sourceType === 'x').length;
  const newsletterCount = scored.filter((item) => item.sourceType === 'newsletter').length;

  return {
    items: scored.slice(0, 16),
    updatedAt: store.updatedAt,
    meta: {
      live: scored.length > 0,
      sourceTypes: {
        article: articleCount,
        x: xCount,
        newsletter: newsletterCount,
        note: scored.filter((item) => item.sourceType === 'note').length,
      },
      sourceNetworks: {
        x: scored.filter((item) => item.sourceNetwork === 'x').length,
        rss: scored.filter((item) => item.sourceNetwork === 'rss').length,
        newsletter: scored.filter((item) => item.sourceNetwork === 'newsletter').length,
        manual: scored.filter((item) => item.sourceNetwork === 'manual').length,
      },
      topicBuckets: {
        cardano: scored.filter((item) => item.topicBucket === 'Cardano').length,
        midnight: scored.filter((item) => item.topicBucket === 'Midnight').length,
        macro: scored.filter((item) => item.topicBucket === 'Macro').length,
        market: scored.filter((item) => item.topicBucket === 'Market').length,
        ecosystem: scored.filter((item) => item.topicBucket === 'Ecosystem').length,
      },
      hooks: {
        accepts: ['x', 'rss', 'manual', 'newsletter'],
        fields: ['headline/title', 'summary/body', 'url', 'assetMentions', 'sentimentHint', 'publishedAt', 'sourceNetwork', 'topicBucket', 'externalId', 'imageUrl'],
      },
    },
  };
}
