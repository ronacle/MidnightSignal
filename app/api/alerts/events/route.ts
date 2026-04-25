import { NextResponse } from 'next/server';
import { fetchAlertEvents } from '@/lib/alerts';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const limit = Number(searchParams.get('limit') || 20);
  const events = await fetchAlertEvents(userId, Number.isFinite(limit) ? limit : 20);
  return NextResponse.json({ ok: true, events });
}
