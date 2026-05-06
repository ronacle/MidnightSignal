import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';
import { buildDailyDigestSnapshot, buildWeeklyReportSnapshot } from '@/lib/retention';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = typeof body.userId === 'string' ? body.userId : null;
    const snapshotType = body.snapshotType === 'weekly_report' ? 'weekly_report' : 'daily_digest';
    const snapshot = snapshotType === 'weekly_report'
      ? buildWeeklyReportSnapshot(body.report || {})
      : buildDailyDigestSnapshot({
          personalSignal: body.personalSignal || { symbol: 'BTC', name: 'Your watchlist leader', confidence: 68 },
          globalSignal: body.globalSignal || { symbol: 'NVDA', name: 'Global top signal', confidence: 76 },
        });

    const supabase = getSupabaseAdminClient();
    if (!userId || !supabase) {
      return NextResponse.json({ snapshot, source: 'generated-local', persisted: false }, { status: 202 });
    }

    const { data, error } = await supabase
      .from('retention_snapshots')
      .insert({ user_id: userId, snapshot_type: snapshotType, payload: snapshot })
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ snapshot: data, source: 'database', persisted: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to generate retention snapshot.' }, { status: 500 });
  }
}
