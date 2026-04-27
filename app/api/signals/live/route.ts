import { NextResponse } from 'next/server';
import type { AssetSignal, TraderMode } from '@/lib/signals';
import { getMarketSnapshot } from '@/lib/market';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PreviousTop = Pick<AssetSignal, 'symbol' | 'confidence'> & Partial<AssetSignal>;

function isTraderMode(value: string | null): value is TraderMode {
  return value === 'scalp' || value === 'swing' || value === 'position';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const modeParam = searchParams.get('mode');
  const mode: TraderMode = isTraderMode(modeParam) ? modeParam : 'swing';
  const currency = (searchParams.get('currency') || 'USD').toUpperCase();
  const previousSymbol = searchParams.get('previousSymbol') || undefined;
  const previousConfidence = Number(searchParams.get('previousConfidence') || 0);
  const previousTop: PreviousTop | undefined = previousSymbol
    ? { symbol: previousSymbol, confidence: Number.isFinite(previousConfidence) ? previousConfidence : 0 }
    : undefined;

  const snapshot = await getMarketSnapshot(mode, currency, previousTop as AssetSignal | undefined);

  return NextResponse.json(snapshot, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store'
    }
  });
}
