import { NextResponse } from 'next/server';
import { fetchWatchlist, saveWatchlist } from '@/lib/watchlist';

export const dynamic = 'force-dynamic';

type Payload = {
  userId?: string | null;
  symbols?: string[];
  preferences?: Array<{ symbol: string; highConfidenceAlerts?: boolean; settlementAlerts?: boolean; isPrimary?: boolean }>;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const items = await fetchWatchlist(userId);
  return NextResponse.json({ ok: true, items });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    if (!body.userId) return NextResponse.json({ ok: false, error: 'userId is required' }, { status: 400 });
    const result = await saveWatchlist(body.userId, body.symbols || [], body.preferences || []);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unable to save watchlist' }, { status: 500 });
  }
}
