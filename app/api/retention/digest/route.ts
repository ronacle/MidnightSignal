import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const personal = searchParams.get('personal') || 'your watchlist leader';
  const global = searchParams.get('global') || 'the global top signal';
  const gap = Number(searchParams.get('gap') || 0);
  return NextResponse.json({
    digest: {
      title: 'Daily Signal Digest',
      personalSignal: personal,
      globalSignal: global,
      missedOpportunity: gap >= 4 && personal !== global,
      body: gap >= 4 && personal !== global
        ? `${global} is outperforming ${personal} by ${gap} confidence points. Review it before your next watchlist decision.`
        : `${personal} remains your best starting point today. Review receipts before acting.`,
      source: 'generated'
    }
  });
}
