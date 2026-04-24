import { NextResponse } from 'next/server';
import type { AssetSignal, TraderMode } from '@/lib/signals';
import { saveOpenSignals } from '@/lib/signal-storage';

export const dynamic = 'force-dynamic';

type Payload = {
  signals?: AssetSignal[];
  mode?: TraderMode;
  userId?: string | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    if (!body.signals?.length || !body.mode) {
      return NextResponse.json({ ok: false, error: 'signals and mode are required' }, { status: 400 });
    }

    const result = await saveOpenSignals(body.signals, body.mode, body.userId ?? null);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unable to save signals' }, { status: 500 });
  }
}
