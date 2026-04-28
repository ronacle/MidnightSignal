import { NextResponse } from 'next/server';
import { getMarketSnapshot } from '@/lib/market';
import type { AssetSignal, TraderMode } from '@/lib/signals';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type LivePayload = {
  mode?: TraderMode;
  currency?: string;
  previousTop?: AssetSignal;
};

function modeFrom(value: unknown): TraderMode {
  return value === 'scalp' || value === 'position' || value === 'swing' ? value : 'swing';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = modeFrom(searchParams.get('mode'));
  const currency = (searchParams.get('currency') || 'USD').toUpperCase();
  const snapshot = await getMarketSnapshot(mode, currency);
  return NextResponse.json({ ok: true, snapshot }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LivePayload;
    const snapshot = await getMarketSnapshot(modeFrom(body.mode), (body.currency || 'USD').toUpperCase(), body.previousTop);
    return NextResponse.json({ ok: true, snapshot }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unable to load live signals.' }, { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } });
  }
}
