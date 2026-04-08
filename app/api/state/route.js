import { NextResponse } from 'next/server';
import { VERSION } from '@/lib/version';

export async function GET() {
  return NextResponse.json({
    ok: true,
    version: VERSION,
    feature: 'signal-intelligence-layer',
    includes: [
      'top-signal-status-and-drivers',
      'multi-timeframe-alignment-read',
      'since-last-visit-upgrade',
      'board-change-indicators',
      'watchlist-momentum-badges'
    ]
  });
}
