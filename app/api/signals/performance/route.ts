import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

type FeedbackRow = {
  signal_id: string;
  symbol: string;
  mode: string;
  label: string | null;
  confidence: number | null;
  action: 'acted' | 'ignored';
  outcome: 'win' | 'loss' | 'neutral' | null;
  created_at: string;
};

type PerformanceRow = {
  label: string;
  total: number;
  acted: number;
  ignored: number;
  wins: number;
  losses: number;
  neutrals: number;
  winRate: number;
  actionRate: number;
};

function summarize(label: string, rows: FeedbackRow[]): PerformanceRow {
  const total = rows.length;
  const acted = rows.filter(row => row.action === 'acted').length;
  const ignored = rows.filter(row => row.action === 'ignored').length;
  const wins = rows.filter(row => row.outcome === 'win').length;
  const losses = rows.filter(row => row.outcome === 'loss').length;
  const neutrals = rows.filter(row => row.outcome === 'neutral').length;
  const decisive = wins + losses;
  return {
    label,
    total,
    acted,
    ignored,
    wins,
    losses,
    neutrals,
    winRate: decisive ? Math.round((wins / decisive) * 100) : 0,
    actionRate: total ? Math.round((acted / total) * 100) : 0
  };
}

function group(rows: FeedbackRow[], picker: (row: FeedbackRow) => string) {
  return rows.reduce<Record<string, FeedbackRow[]>>((acc, row) => {
    const key = picker(row) || 'Mixed';
    (acc[key] ||= []).push(row);
    return acc;
  }, {});
}

function sortRows(rows: PerformanceRow[]) {
  return rows.sort((a, b) => b.winRate - a.winRate || b.total - a.total || b.actionRate - a.actionRate);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const signalId = searchParams.get('signalId') || '';
    const symbol = (searchParams.get('symbol') || '').toUpperCase();
    const baseConfidence = Number(searchParams.get('confidence') || 0);
    const limit = Math.min(Number(searchParams.get('limit') || 500), 1000);

    if (!userId) return NextResponse.json({ performance: null, source: 'missing-user' });

    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ performance: null, source: 'local-fallback' });

    const { data, error } = await supabase
      .from('signal_feedback')
      .select('signal_id,symbol,mode,label,confidence,action,outcome,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    const rows = (data || []) as FeedbackRow[];
    const overall = summarize('All signals', rows);
    const bySymbol = sortRows(Object.entries(group(rows, row => row.symbol)).map(([label, items]) => summarize(label, items)));
    const byType = sortRows(Object.entries(group(rows, row => row.label || 'Mixed')).map(([label, items]) => summarize(label, items)));
    const currentRows = signalId ? rows.filter(row => row.signal_id === signalId) : [];
    const currentStats = summarize('Current signal', currentRows);
    const symbolStats = symbol ? bySymbol.find(row => row.label === symbol) : undefined;
    const sampleSize = currentStats.total || symbolStats?.total || overall.total;
    const performanceLift = currentStats.winRate || symbolStats?.winRate || overall.winRate;
    const fallbackConfidence = baseConfidence || (rows.find(row => row.symbol === symbol)?.confidence ?? 0);
    const informedConfidence = sampleSize >= 3 && performanceLift
      ? Math.max(35, Math.min(94, Math.round((fallbackConfidence * 0.65) + (performanceLift * 0.35))))
      : fallbackConfidence;

    return NextResponse.json({
      performance: {
        ...overall,
        bestType: byType[0] || null,
        byType,
        bySymbol,
        informedConfidence,
        sampleSize,
        source: 'database'
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load signal performance.' }, { status: 500 });
  }
}
