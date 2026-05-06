import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

type FeedbackAction = 'acted' | 'ignored';
type FeedbackOutcome = 'win' | 'loss' | 'neutral' | null;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = typeof body.userId === 'string' ? body.userId : null;
    const signal = body.signal || {};
    const signalId = typeof body.signalId === 'string' ? body.signalId : null;
    const action = body.action as FeedbackAction;
    const outcome = (body.outcome ?? null) as FeedbackOutcome;
    const mode = typeof body.mode === 'string' ? body.mode : 'swing';

    if (!userId || !signalId || !signal.symbol || !['acted', 'ignored'].includes(action)) {
      return NextResponse.json({ error: 'Missing userId, signalId, signal, or action.' }, { status: 400 });
    }
    if (outcome && !['win', 'loss', 'neutral'].includes(outcome)) {
      return NextResponse.json({ error: 'Invalid outcome.' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: 'Supabase service role is not configured.' }, { status: 503 });

    const payload = {
      user_id: userId,
      signal_id: signalId,
      symbol: String(signal.symbol).toUpperCase(),
      mode,
      label: signal.label || null,
      confidence: typeof signal.confidence === 'number' ? signal.confidence : null,
      action,
      outcome,
      signal_snapshot: signal
    };

    const { data, error } = await supabase.from('signal_feedback').insert(payload).select('*').single();
    if (error) throw error;
    return NextResponse.json({ feedback: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to save feedback.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = Math.min(Number(searchParams.get('limit') || 100), 250);
    if (!userId) return NextResponse.json({ feedback: [] });
    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ feedback: [], source: 'local-fallback' });
    const { data, error } = await supabase
      .from('signal_feedback')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return NextResponse.json({ feedback: data || [], source: 'database' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load feedback.' }, { status: 500 });
  }
}
