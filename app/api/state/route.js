import { NextResponse } from 'next/server';
import { VERSION } from '@/lib/version';

export async function GET() {
  return NextResponse.json({
    ok: true,
    version: VERSION,
    feature: 'signal-alive-layout-lock',
    includes: [
      'top-signal-pulse',
      'confidence-breakdown',
      'watchlist-pinned-above-board',
      'since-last-visit-layout-guard'
    ]
  });
}
