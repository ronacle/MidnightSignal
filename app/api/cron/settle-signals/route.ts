import { NextResponse } from 'next/server';
import { settleOpenSignals } from '@/lib/signal-storage';

export const dynamic = 'force-dynamic';

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const result = await settleOpenSignals();
  return NextResponse.json({ ok: true, ...result, settledAt: new Date().toISOString() });
}
