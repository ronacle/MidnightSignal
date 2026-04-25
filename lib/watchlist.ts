import { getSupabaseAdminClient } from './supabase-server';

export type WatchlistPreference = {
  symbol: string;
  highConfidenceAlerts: boolean;
  settlementAlerts: boolean;
  isPrimary: boolean;
};

type WatchlistRow = {
  symbol: string;
  high_confidence_alerts?: boolean | null;
  settlement_alerts?: boolean | null;
  is_primary?: boolean | null;
};

function normalize(row: WatchlistRow): WatchlistPreference {
  return {
    symbol: row.symbol,
    highConfidenceAlerts: row.high_confidence_alerts ?? true,
    settlementAlerts: row.settlement_alerts ?? true,
    isPrimary: row.is_primary ?? false
  };
}

export async function fetchWatchlist(userId?: string | null): Promise<WatchlistPreference[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('watchlist_symbols')
    .select('symbol,high_confidence_alerts,settlement_alerts,is_primary')
    .eq('user_id', userId)
    .order('position', { ascending: true });
  if (error || !data) return [];
  return (data as WatchlistRow[]).map(normalize);
}

export async function saveWatchlist(userId: string, symbols: string[], preferences: Partial<WatchlistPreference>[] = []) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, reason: 'Supabase service role env vars are not set.' };

  const unique = Array.from(new Set(symbols.map(symbol => symbol.trim().toUpperCase()).filter(Boolean))).slice(0, 50);
  const prefMap = new Map(preferences.map(pref => [pref.symbol?.toUpperCase(), pref]));

  const { error: deleteError } = await supabase.from('watchlist_symbols').delete().eq('user_id', userId);
  if (deleteError) return { ok: false, reason: deleteError.message };

  if (!unique.length) return { ok: true, count: 0 };

  const rows = unique.map((symbol, index) => {
    const pref = prefMap.get(symbol);
    return {
      user_id: userId,
      symbol,
      position: index,
      high_confidence_alerts: pref?.highConfidenceAlerts ?? true,
      settlement_alerts: pref?.settlementAlerts ?? true,
      is_primary: pref?.isPrimary ?? index === 0,
      updated_at: new Date().toISOString()
    };
  });

  const { error } = await supabase.from('watchlist_symbols').insert(rows);
  return error ? { ok: false, reason: error.message } : { ok: true, count: rows.length };
}
