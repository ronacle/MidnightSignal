import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

type PersonalizedEventType = 'recommendation_viewed' | 'recommendation_clicked' | 'recommendation_added_to_watchlist' | 'recommendation_dismissed';
const allowed: PersonalizedEventType[] = ['recommendation_viewed', 'recommendation_clicked', 'recommendation_added_to_watchlist', 'recommendation_dismissed'];

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const userId = typeof body.userId === 'string' ? body.userId : null;
  const eventType = body.eventType as PersonalizedEventType;
  const symbol = typeof body.symbol === 'string' ? body.symbol.toUpperCase() : null;
  const metadata = typeof body.metadata === 'object' && body.metadata ? body.metadata : {};
  if (!userId || !symbol || !allowed.includes(eventType)) return NextResponse.json({ ok: false, error: 'Missing or invalid personalization event fields.' }, { status: 400 });
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ ok: true, source: 'local-fallback' }, { status: 202 });
  const { error } = await supabase.from('personalized_signal_events').insert({ user_id: userId, event_type: eventType, symbol, metadata });
  return NextResponse.json(error ? { ok: false, error: error.message } : { ok: true }, { status: error ? 500 : 200 });
}
