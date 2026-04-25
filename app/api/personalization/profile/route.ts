import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';
import { buildPersonalIntelligenceProfile } from '@/lib/personalization';
import { buildSignals } from '@/lib/signals';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const mode = (searchParams.get('mode') || 'swing') as any;
  const watchlist = (searchParams.get('watchlist') || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  const supabase = getSupabaseAdminClient();
  if (!userId || !supabase) {
    const profile = buildPersonalIntelligenceProfile({ signals: buildSignals(mode), watchlist, feedback: [], conversionEvents: [], retentionEvents: [], performanceResults: [], mode });
    return NextResponse.json({ ok: true, profile, source: 'local-generated' });
  }

  const [{ data: profileRow }, { data: feedbackRows }, { data: conversionRows }, { data: retentionRows }, { data: resultRows }, { data: recommendationRows }] = await Promise.all([
    supabase.from('user_intelligence_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('signal_feedback').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(250),
    supabase.from('signal_conversion_events').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(250),
    supabase.from('retention_events').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(250),
    supabase.from('signal_results').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(250),
    supabase.from('recommendation_feedback').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(250)
  ]);

  const profile = buildPersonalIntelligenceProfile({
    signals: buildSignals(mode),
    watchlist,
    feedback: (feedbackRows || []).map((row: any) => ({ signalId: row.signal_id, symbol: row.symbol, action: row.action, outcome: row.outcome })),
    conversionEvents: (conversionRows || []).map((row: any) => ({ type: row.event_type, symbol: row.symbol })),
    retentionEvents: (retentionRows || []).map((row: any) => ({ type: row.event_type, symbol: row.symbol })),
    recommendationFeedback: (recommendationRows || []).map((row: any) => ({ symbol: row.symbol, action: row.action, metadata: row.metadata })),
    performanceResults: resultRows || [],
    mode
  });

  await supabase.from('user_intelligence_profiles').upsert({ user_id: userId, profile, risk_style: profile.riskStyle, preferred_assets: profile.preferredAssets, preferred_signal_types: profile.preferredSignalTypes, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

  return NextResponse.json({ ok: true, profile: profileRow?.profile ? { ...profile, ...profileRow.profile, recommendations: profile.recommendations } : profile, source: 'database' });
}
