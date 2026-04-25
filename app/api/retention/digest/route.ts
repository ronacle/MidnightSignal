import { NextResponse } from 'next/server';
import { buildDailyDigestSnapshot } from '@/lib/retention';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const personalSymbol = (searchParams.get('personal') || 'BTC').toUpperCase();
  const globalSymbol = (searchParams.get('global') || 'NVDA').toUpperCase();
  const personalConfidence = Number(searchParams.get('personalConfidence') || searchParams.get('personalScore') || 68);
  const globalConfidence = Number(searchParams.get('globalConfidence') || searchParams.get('globalScore') || 76);

  const digest = buildDailyDigestSnapshot({
    personalSignal: { symbol: personalSymbol, name: searchParams.get('personalName') || 'Your watchlist leader', confidence: personalConfidence },
    globalSignal: { symbol: globalSymbol, name: searchParams.get('globalName') || 'Global top signal', confidence: globalConfidence },
  });

  return NextResponse.json({ digest, source: 'generated-snapshot' });
}
