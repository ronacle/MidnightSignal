import { NextResponse } from 'next/server';
import { buildDailyRecap, createDailyRecapAlert } from '@/lib/alerts';

export const dynamic = 'force-dynamic';

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const dryRun = searchParams.get('dryRun') === 'true';
  const result = dryRun ? { created: 0, skipped: true, recap: await buildDailyRecap(userId) } : await createDailyRecapAlert(userId);
  return NextResponse.json({ ok: true, ...result, generatedAt: new Date().toISOString() });
}
