import { ingestContextItems, listContextItems } from '@/lib/context-ingestion';

const INGEST_SCHEMA = {
  accepts: ['x', 'rss', 'manual'],
  requiredShape: ['title or headline', 'body or summary', 'source', 'publishedAt/timestamp'],
  optionalShape: ['url', 'assetMentions', 'sentimentHint', 'catalystType', 'sourceHandle', 'sourceNetwork'],
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || '';
  const watchlist = (searchParams.get('watchlist') || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const payload = listContextItems({ symbol, watchlist });

  return Response.json({
    ok: true,
    items: payload.items,
    updatedAt: payload.updatedAt,
    meta: payload.meta,
    schema: INGEST_SCHEMA,
  });
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const items = Array.isArray(body?.items) ? body.items : body?.item ? [body.item] : [];
    const result = ingestContextItems(items);

    return Response.json({
      ok: true,
      inserted: result.inserted,
      items: result.items.slice(0, 12),
      updatedAt: result.updatedAt,
      message: 'Context items accepted and normalized.',
      schema: INGEST_SCHEMA,
    });
  } catch {
    return Response.json({
      ok: false,
      error: 'Unable to ingest context items.',
      schema: INGEST_SCHEMA,
    }, { status: 400 });
  }
}
