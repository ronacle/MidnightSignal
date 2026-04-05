const NEWS_QUERIES = {
  BTC: 'Bitcoin OR BTC crypto',
  ETH: 'Ethereum OR ETH crypto',
  SOL: 'Solana OR SOL crypto',
  XRP: 'XRP OR Ripple crypto',
  ADA: 'Cardano OR ADA OR "Midnight Network"',
  BNB: 'BNB OR Binance Coin crypto',
  DOGE: 'Dogecoin OR DOGE crypto',
  AVAX: 'Avalanche OR AVAX crypto',
  LINK: 'Chainlink OR LINK crypto',
  DOT: 'Polkadot OR DOT crypto',
};

function decodeHtml(value = '') {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(value = '') {
  return decodeHtml(String(value).replace(/<[^>]*>/g, ' '));
}

function extractTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? stripTags(match[1]) : '';
}

function extractLink(block) {
  const rss = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
  if (rss) return decodeHtml(rss[1]);
  const atom = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?/i);
  return atom ? decodeHtml(atom[1]) : '';
}

function parseRssItems(xml = '') {
  const itemBlocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  return itemBlocks.map((block) => {
    const title = extractTag(block, 'title');
    const description = extractTag(block, 'description') || extractTag(block, 'summary') || extractTag(block, 'content');
    const source = extractTag(block, 'source') || extractTag(block, 'author') || extractTag(block, 'dc:creator');
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated');
    const href = extractLink(block);
    return { title, description, source, pubDate, href };
  }).filter((item) => item.title && item.href);
}

function normalizedTitle(title = '') {
  return title
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(cardano|bitcoin|ethereum|solana|crypto|cryptocurrency|news|today|latest)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupeByTitle(items = []) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const key = normalizedTitle(item.title).slice(0, 80) || item.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function domainLabel(url = '') {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host;
  } catch {
    return 'Live feed';
  }
}

async function fetchFeed(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const res = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 MidnightSignal/10.5',
        accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
      },
      next: { revalidate: 900 },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Feed request failed: ${res.status}`);
    const xml = await res.text();
    return parseRssItems(xml);
  } finally {
    clearTimeout(timeout);
  }
}

function scoreHeadlineTone(headline = '', symbol = '') {
  const text = `${headline} ${symbol}`.toLowerCase();
  const positive = ['surge', 'rally', 'record', 'approval', 'growth', 'gain', 'bull', 'upside', 'launch', 'partnership', 'adoption', 'inflow', 'strong'];
  const negative = ['drop', 'slump', 'selloff', 'hack', 'lawsuit', 'risk', 'outflow', 'bear', 'warning', 'delay', 'loss', 'weak', 'decline'];
  let score = 0;
  for (const word of positive) if (text.includes(word)) score += 1;
  for (const word of negative) if (text.includes(word)) score -= 1;
  return score;
}

function pickSentiment(posture, headlines, symbol) {
  const total = headlines.reduce((sum, item) => sum + scoreHeadlineTone(item.title, symbol), 0);
  if (total >= 2) return 'positive';
  if (total <= -2) return 'cautious';
  if (posture === 'Bullish') return 'constructive';
  if (posture === 'Bearish') return 'defensive';
  return 'mixed';
}

function buildDrivers({ symbol, posture, confidence, watchlist, headlines, pulseItems }) {
  const watchText = Array.isArray(watchlist) && watchlist.length ? watchlist.slice(0, 3).join(', ') : 'your watchlist';
  const topNews = headlines[0]?.title || `${symbol} is still searching for a cleaner narrative lead.`;
  const secondNews = headlines[1]?.title || `Broader crypto flow remains part of the ${symbol} setup tonight.`;
  const pulseLine = pulseItems[0]?.title || pulseItems[0]?.text || `${symbol} remains in active community discussion.`;

  const postureDriver = posture === 'Bullish'
    ? `${symbol} is carrying a bullish posture at ${confidence}% confidence, and the live narrative is leaning supportive instead of contradictory.`
    : posture === 'Bearish'
    ? `${symbol} is carrying a bearish posture at ${confidence}% confidence, and the live narrative is not yet doing much to repair that weakness.`
    : `${symbol} is still mixed at ${confidence}% confidence, and the live narrative is not decisive enough to force a stronger posture.`;

  return [
    postureDriver,
    `Headline flow tonight: ${topNews}`,
    `Secondary context: ${secondNews}`,
    `Community focus around ${watchText}: ${pulseLine}`,
  ].slice(0, 3);
}

function buildPulseFromItems(items = []) {
  return items.slice(0, 3).map((item) => ({
    text: item.title,
    source: item.source || domainLabel(item.href),
    href: item.href,
  }));
}

function derivePulseFromNews(news = []) {
  return news.slice(0, 3).map((item) => ({
    text: item.title,
    source: `${item.source || domainLabel(item.href)} pulse`,
    href: item.href,
  }));
}

function buildFallback(symbol = 'BTC', posture = 'Neutral', confidence = 50, watchlist = []) {
  const watchText = Array.isArray(watchlist) && watchlist.length ? watchlist.slice(0, 3).join(', ') : 'your watchlist';
  const sentiment = posture === 'Bullish' ? 'constructive' : posture === 'Bearish' ? 'defensive' : 'mixed';
  return {
    sentiment,
    alignment: 'Mixed',
    drivers: [
      `${symbol} is carrying a ${posture.toLowerCase()} posture at ${confidence}% confidence tonight.`,
      `${watchText} are still shaping where leadership is concentrated.`,
      `Live feed fallback is active, so this context is currently derived from the dashboard itself.`,
    ],
    news: [
      { title: `${symbol} live context feed is unavailable right now`, source: 'Fallback', href: 'https://news.google.com/' },
    ],
    pulse: [
      { text: `${symbol} community pulse will resume when feeds respond again.`, source: 'Fallback' },
    ],
    meta: { live: false, newsCount: 0, pulseCount: 0, pulseMode: 'fallback' },
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get('symbol') || 'BTC').toUpperCase();
  const posture = searchParams.get('posture') || 'Neutral';
  const confidence = Number(searchParams.get('confidence') || 50);
  const watchlist = (searchParams.get('watchlist') || '').split(',').filter(Boolean);

  const query = NEWS_QUERIES[symbol] || `${symbol} crypto`;
  const newsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-CA&gl=CA&ceid=CA:en`;
  const pulseFeeds = String(process.env.CONTEXT_PULSE_FEEDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  try {
    const [newsItems, pulseFeedResults] = await Promise.all([
      fetchFeed(newsUrl),
      pulseFeeds.length ? Promise.allSettled(pulseFeeds.slice(0, 3).map((url) => fetchFeed(url))) : Promise.resolve([]),
    ]);

    const cleanNews = dedupeByTitle(newsItems)
      .slice(0, 6)
      .map((item) => ({
        title: item.title,
        source: item.source || domainLabel(item.href),
        href: item.href,
        pubDate: item.pubDate,
      }));

    const pulseFeedItems = Array.isArray(pulseFeedResults)
      ? pulseFeedResults.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
      : [];

    const cleanPulse = dedupeByTitle(pulseFeedItems)
      .filter((item) => normalizedTitle(item.title).includes(symbol.toLowerCase()) || normalizedTitle(item.description).includes(symbol.toLowerCase()) || symbol === 'ADA')
      .slice(0, 6);

    const sentiment = pickSentiment(posture, cleanNews, symbol);
    const alignment =
      (posture === 'Bullish' && (sentiment === 'positive' || sentiment === 'constructive')) ||
      (posture === 'Bearish' && (sentiment === 'cautious' || sentiment === 'defensive'))
        ? 'Strong'
        : sentiment === 'mixed'
        ? 'Mixed'
        : 'Weak';

    const pulse = cleanPulse.length ? buildPulseFromItems(cleanPulse) : derivePulseFromNews(cleanNews);
    const drivers = buildDrivers({ symbol, posture, confidence, watchlist, headlines: cleanNews, pulseItems: pulse });

    return Response.json({
      ok: true,
      context: {
        sentiment,
        alignment,
        drivers,
        news: cleanNews.slice(0, 5),
        pulse: pulse.slice(0, 5),
        meta: {
          live: cleanNews.length > 0,
          newsCount: cleanNews.length,
          pulseCount: pulse.length,
          pulseMode: cleanPulse.length ? 'community-feed' : 'news-derived',
          query,
        },
      },
    });
  } catch {
    return Response.json({ ok: true, context: buildFallback(symbol, posture, confidence, watchlist) });
  }
}
