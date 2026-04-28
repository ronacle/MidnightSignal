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

function withNoStore(response: NextResponse) {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('Surrogate-Control', 'no-store');
  response.headers.set('X-Midnight-Live-Data', 'true');
  return response;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = modeFrom(searchParams.get('mode'));
  const currency = (searchParams.get('currency') || 'USD').toUpperCase();
  const snapshot = await getMarketSnapshot(mode, currency);
  return withNoStore(NextResponse.json({ ok: true, snapshot, diagnostics: snapshot.diagnostics }));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LivePayload;
    const mode = modeFrom(body.mode);
    const currency = (body.currency || 'USD').toUpperCase();
    const snapshot = await getMarketSnapshot(mode, currency, body.previousTop);
    return withNoStore(NextResponse.json({ ok: true, snapshot, diagnostics: snapshot.diagnostics }));
  } catch (error) {
    return withNoStore(NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unable to load live signals.' }, { status: 500 }));
  }
}
