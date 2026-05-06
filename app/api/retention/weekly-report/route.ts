import { NextResponse } from 'next/server';
import { buildWeeklyReportSnapshot } from '@/lib/retention';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const report = buildWeeklyReportSnapshot({
    winRate: Number(searchParams.get('winRate') || 0),
    acted: Number(searchParams.get('acted') || 0),
    ignored: Number(searchParams.get('ignored') || 0),
    wins: Number(searchParams.get('wins') || 0),
    losses: Number(searchParams.get('losses') || 0),
    neutral: Number(searchParams.get('neutral') || 0),
    conversions: Number(searchParams.get('conversions') || 0),
    missedOpportunities: Number(searchParams.get('missedOpportunities') || 0),
    bestAsset: searchParams.get('bestAsset') || undefined,
  });

  return NextResponse.json({ report, source: 'generated-snapshot' });
}
