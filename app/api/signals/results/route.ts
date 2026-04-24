import { NextResponse } from 'next/server';
import { fetchClosedSignalResults } from '@/lib/signal-storage';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || undefined;
  const limit = Number(searchParams.get('limit') || 60);
  const results = await fetchClosedSignalResults(userId, Number.isFinite(limit) ? limit : 60);
  return NextResponse.json({ ok: true, results });
}
