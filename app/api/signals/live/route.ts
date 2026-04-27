import { NextResponse } from 'next/server';
import { getMarketSnapshot } from '@/lib/market';
import type { AssetSignal, TraderMode } from '@/lib/signals';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function safeMode(value: string | null): TraderMode {
  return value === 'scalp' || value === 'position' || value === 'swing' ? value : 'swing';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = safeMode(searchParams.get('mode'));
  const currency = (searchParams.get('currency') || 'USD').toUpperCase();
  const previousSymbol = searchParams.get('previousSymbol') || undefined;
  const previousConfidence = Number(searchParams.get('previousConfidence') || '');

  const previousTop: AssetSignal | undefined = previousSymbol && Number.isFinite(previousConfidence)
    ? {
        symbol: previousSymbol,
        name: previousSymbol,
        price: 0,
        change24h: 0,
        confidence: previousConfidence,
        momentum: 0,
        trend: 0,
        volatility: 0,
        mtf: 0,
        label: 'Neutral',
        why: ''
      }
    : undefined;

  const snapshot = await getMarketSnapshot(mode, currency, previousTop);

  return NextResponse.json(
    { ok: true, snapshot },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
        Pragma: 'no-cache'
      }
    }
  );
}
