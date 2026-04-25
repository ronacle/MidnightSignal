import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const winRate = Number(searchParams.get('winRate') || 0);
  const feedback = Number(searchParams.get('feedback') || 0);
  const conversions = Number(searchParams.get('conversions') || 0);
  return NextResponse.json({
    report: {
      title: 'Weekly Performance Report',
      winRate,
      feedbackEvents: feedback,
      conversionEvents: conversions,
      summary: feedback
        ? `You recorded ${feedback} feedback events and ${conversions} discovery actions. Current tracked win rate is ${winRate}%.`
        : 'Start recording wins, losses, ignored signals, and global discovery actions to unlock a meaningful weekly report.',
      source: 'generated'
    }
  });
}
