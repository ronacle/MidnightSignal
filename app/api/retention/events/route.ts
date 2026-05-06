import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

type RetentionEventType = 'digest_viewed' | 'weekly_report_viewed' | 'missed_opportunity_clicked' | 'digest_upgrade_clicked';

const allowed: RetentionEventType[] = ['digest_viewed', 'weekly_report_viewed', 'missed_opportunity_clicked', 'digest_upgrade_clicked'];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = typeof body.userId === 'string' ? body.userId : null;
    const type = body.type as RetentionEventType;
    const symbol = typeof body.symbol === 'string' ? body.symbol.toUpperCase() : null;

    if (!userId || !allowed.includes(type)) {
      return NextResponse.json({ error: 'Missing or invalid retention event fields.' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ event: null, source: 'local-fallback' }, { status: 202 });

    const { data, error } = await supabase
      .from('retention_events')
      .insert({ user_id: userId, event_type: type, symbol, metadata: body.metadata || null })
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ event: data, source: 'database' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to save retention event.' }, { status: 500 });
  }
}
