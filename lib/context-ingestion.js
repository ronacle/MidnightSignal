const MEMORY_KEY = '__midnightSignalContextMemory';

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

export function detectAssetMentions(text = '') {
  const upper = String(text || '').toUpperCase();
  const map = ['BTC', 'ETH', 'ADA', 'SOL', 'XRP', 'BNB', 'DOGE', 'AVAX', 'LINK', 'DOT', 'SUI', 'HBAR', 'MIDNIGHT'];
  return map.filter((symbol) => {
    if (symbol === 'MIDNIGHT') return upper.includes('MIDNIGHT');
    return new RegExp(`\\b${symbol}\\b`).test(upper);
  });
}

function inferSentimentHint(text = '') {
  const lowered = String(text || '').toLowerCase();
  const positive = ['surge', 'rally', 'gain', 'approval', 'breakout', 'strong', 'upside', 'growth', 'bull'];
  const negative = ['drop', 'selloff', 'hack', 'risk', 'lawsuit', 'outflow', 'bear', 'warning', 'delay', 'weak'];
  let score = 0;
  positive.forEach((word) => { if (lowered.includes(word)) score += 1; });
  negative.forEach((word) => { if (lowered.includes(word)) score -= 1; });
  if (score >= 2) return 'positive';
  if (score <= -2) return 'cautious';
  return 'mixed';
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
  };
}

function dedupeItems(items = []) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const key = `${item.sourceType}|${item.title.toLowerCase()}|${item.source.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
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
    .slice(0, 100);
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

  const articleCount = filtered.filter((item) => item.sourceType === 'article').length;
  const xCount = filtered.filter((item) => item.sourceType === 'x').length;

  return {
    items: filtered.slice(0, 12),
    updatedAt: store.updatedAt,
    meta: {
      live: filtered.length > 0,
      sourceTypes: {
        article: articleCount,
        x: xCount,
        note: filtered.filter((item) => item.sourceType === 'note').length,
      },
    },
  };
}
