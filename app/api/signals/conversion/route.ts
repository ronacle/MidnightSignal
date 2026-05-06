import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

type ConversionEventType = 'global_added_to_watchlist' | 'global_tracked' | 'global_upgrade_clicked';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = typeof body.userId === 'string' ? body.userId : null;
    const type = body.type as ConversionEventType;
    const symbol = typeof body.symbol === 'string' ? body.symbol.toUpperCase() : null;
    const signalId = typeof body.signalId === 'string' ? body.signalId : null;
    const mode = typeof body.mode === 'string' ? body.mode : 'swing';
    const gap = typeof body.gap === 'number' ? body.gap : 0;

    if (!userId || !symbol || !signalId || !['global_added_to_watchlist', 'global_tracked', 'global_upgrade_clicked'].includes(type)) {
      return NextResponse.json({ error: 'Missing or invalid conversion event fields.' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: 'Supabase service role is not configured.' }, { status: 503 });

    const payload = {
      user_id: userId,
      event_type: type,
      symbol,
      signal_id: signalId,
      mode,
      confidence_gap: gap,
      metadata: body.metadata || null
    };

    const { data, error } = await supabase.from('signal_conversion_events').insert(payload).select('*').single();
    if (error) throw error;
    return NextResponse.json({ event: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to save conversion event.' }, { status: 500 });
  }
}
