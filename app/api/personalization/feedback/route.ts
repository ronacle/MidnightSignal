import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

type RecommendationAction = 'more' | 'less' | 'hide';
const allowed: RecommendationAction[] = ['more', 'less', 'hide'];

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const userId = typeof body.userId === 'string' ? body.userId : null;
  const symbol = typeof body.symbol === 'string' ? body.symbol.toUpperCase() : null;
  const action = body.action as RecommendationAction;
  const metadata = typeof body.metadata === 'object' && body.metadata ? body.metadata : {};
  if (!userId || !symbol || !allowed.includes(action)) {
    return NextResponse.json({ ok: false, error: 'Missing or invalid recommendation feedback fields.' }, { status: 400 });
  }
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ ok: true, source: 'local-fallback' }, { status: 202 });
  const { error } = await supabase.from('recommendation_feedback').insert({ user_id: userId, symbol, action, metadata });
  return NextResponse.json(error ? { ok: false, error: error.message } : { ok: true }, { status: error ? 500 : 200 });
}
