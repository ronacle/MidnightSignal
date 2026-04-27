import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';
import { buildPersonalIntelligenceProfile } from '@/lib/personalization';
import { buildSignals } from '@/lib/signals';

export const dynamic = 'force-dynamic';

type PatternEventType = 'pattern_viewed' | 'pattern_applied' | 'pattern_dismissed' | 'pattern_boosted' | 'pattern_suppressed';
const allowed: PatternEventType[] = ['pattern_viewed', 'pattern_applied', 'pattern_dismissed', 'pattern_boosted', 'pattern_suppressed'];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const mode = (searchParams.get('mode') || 'swing') as any;
  const watchlist = (searchParams.get('watchlist') || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  const supabase = getSupabaseAdminClient();

  if (!userId || !supabase) {
    const profile = buildPersonalIntelligenceProfile({ signals: buildSignals(mode), watchlist, feedback: [], conversionEvents: [], retentionEvents: [], recommendationFeedback: [], performanceResults: [], mode });
    return NextResponse.json({ ok: true, patterns: profile.patterns, source: 'local-generated' });
  }

  const [{ data: feedbackRows }, { data: resultRows }, { data: recommendationRows }] = await Promise.all([
    supabase.from('signal_feedback').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(300),
    supabase.from('signal_results').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(300),
    supabase.from('recommendation_feedback').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(300)
  ]);

  const profile = buildPersonalIntelligenceProfile({
    signals: buildSignals(mode),
    watchlist,
    feedback: (feedbackRows || []).map((row: any) => ({ signalId: row.signal_id, symbol: row.symbol, action: row.action, outcome: row.outcome })),
    recommendationFeedback: (recommendationRows || []).map((row: any) => ({ symbol: row.symbol, action: row.action, metadata: row.metadata })),
    performanceResults: resultRows || [],
    mode
  });

  await Promise.all(profile.patterns.map(pattern => supabase.from('user_signal_patterns').upsert({
    user_id: userId,
    pattern_key: pattern.id,
    direction: pattern.direction,
    symbol: pattern.symbol || null,
    signal_type: pattern.signalType || null,
    confidence: pattern.confidence,
    description: pattern.description,
    action: pattern.action,
    metadata: pattern,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,pattern_key' })));

  return NextResponse.json({ ok: true, patterns: profile.patterns, source: 'database' });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const userId = typeof body.userId === 'string' ? body.userId : null;
  const eventType = body.eventType as PatternEventType;
  if (!userId || !allowed.includes(eventType)) return NextResponse.json({ ok: false, error: 'Missing or invalid pattern event fields.' }, { status: 400 });
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ ok: true, source: 'local-fallback' }, { status: 202 });
  const { error } = await supabase.from('pattern_insight_events').insert({
    user_id: userId,
    pattern_id: body.patternId || null,
    event_type: eventType,
    symbol: typeof body.symbol === 'string' ? body.symbol.toUpperCase() : null,
    signal_type: typeof body.signalType === 'string' ? body.signalType : null,
    metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {}
  });
  return NextResponse.json(error ? { ok: false, error: error.message } : { ok: true }, { status: error ? 500 : 200 });
}
