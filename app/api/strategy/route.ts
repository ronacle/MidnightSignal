import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';
import type { StrategyId } from '@/lib/strategy';

const allowed = new Set(['momentum', 'breakout', 'conservative', 'aggressive']);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ strategy: 'momentum', source: 'default' });
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ strategy: 'momentum', source: 'local' });
  const { data, error } = await supabase.from('user_strategies').select('strategy').eq('user_id', userId).maybeSingle();
  if (error) return NextResponse.json({ strategy: 'momentum', source: 'fallback', error: error.message });
  return NextResponse.json({ strategy: data?.strategy || 'momentum', source: data ? 'database' : 'default' });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const userId = typeof body.userId === 'string' ? body.userId : null;
  const strategy = typeof body.strategy === 'string' ? body.strategy as StrategyId : null;
  if (!strategy || !allowed.has(strategy)) return NextResponse.json({ error: 'Invalid strategy' }, { status: 400 });
  if (!userId) return NextResponse.json({ strategy, source: 'local' });
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ strategy, source: 'local' });
  const { error } = await supabase.from('user_strategies').upsert({ user_id: userId, strategy, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ strategy, source: 'database' });
}
