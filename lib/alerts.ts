import type { SupabaseClient } from '@supabase/supabase-js';
import type { SignalResult } from './performance';
import { summarizePerformance } from './performance';
import { getSupabaseAdminClient } from './supabase-server';

export type AlertPreferences = {
  highConfidenceAlerts: boolean;
  dailyRecap: boolean;
  settlementAlerts: boolean;
  proOnlyAlerts: boolean;
};

export type AlertEventType = 'high_confidence' | 'settlement' | 'daily_recap' | 'pro_signal';

export type AlertEvent = {
  id: string;
  userId: string | null;
  type: AlertEventType;
  title: string;
  body: string;
  symbol: string | null;
  resultId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
};

export const defaultAlertPreferences: AlertPreferences = {
  highConfidenceAlerts: true,
  dailyRecap: true,
  settlementAlerts: true,
  proOnlyAlerts: true
};

type PreferenceRow = {
  high_confidence_alerts?: boolean | null;
  daily_recap?: boolean | null;
  settlement_alerts?: boolean | null;
  pro_only_alerts?: boolean | null;
};

type AlertEventRow = {
  id: string;
  user_id?: string | null;
  type: AlertEventType;
  title: string;
  body: string;
  symbol?: string | null;
  signal_result_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  read_at?: string | null;
};

function fromPreferenceRow(row?: PreferenceRow | null): AlertPreferences {
  return {
    highConfidenceAlerts: row?.high_confidence_alerts ?? defaultAlertPreferences.highConfidenceAlerts,
    dailyRecap: row?.daily_recap ?? defaultAlertPreferences.dailyRecap,
    settlementAlerts: row?.settlement_alerts ?? defaultAlertPreferences.settlementAlerts,
    proOnlyAlerts: row?.pro_only_alerts ?? defaultAlertPreferences.proOnlyAlerts
  };
}

function toEvent(row: AlertEventRow): AlertEvent {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    type: row.type,
    title: row.title,
    body: row.body,
    symbol: row.symbol ?? null,
    resultId: row.signal_result_id ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    readAt: row.read_at ?? null
  };
}

export async function fetchAlertPreferences(userId?: string | null): Promise<AlertPreferences> {
  const supabase = getSupabaseAdminClient();
  if (!supabase || !userId) return defaultAlertPreferences;
  const { data } = await supabase
    .from('alert_preferences')
    .select('high_confidence_alerts,daily_recap,settlement_alerts,pro_only_alerts')
    .eq('user_id', userId)
    .maybeSingle();
  return fromPreferenceRow(data as PreferenceRow | null);
}

export async function upsertAlertPreferences(userId: string, preferences: Partial<AlertPreferences>) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, reason: 'Supabase service role env vars are not set.' };

  const next = { ...defaultAlertPreferences, ...preferences };
  const { error } = await supabase.from('alert_preferences').upsert({
    user_id: userId,
    high_confidence_alerts: next.highConfidenceAlerts,
    daily_recap: next.dailyRecap,
    settlement_alerts: next.settlementAlerts,
    pro_only_alerts: next.proOnlyAlerts,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });

  return error ? { ok: false, reason: error.message } : { ok: true, preferences: next };
}

async function insertAlertEvent(supabase: SupabaseClient, event: Omit<AlertEventRow, 'id' | 'created_at'> & { dedupe_key?: string }) {
  const { error } = await supabase.from('alert_events').upsert({
    user_id: event.user_id ?? null,
    type: event.type,
    title: event.title,
    body: event.body,
    symbol: event.symbol ?? null,
    signal_result_id: event.signal_result_id ?? null,
    metadata: event.metadata ?? {},
    read_at: event.read_at ?? null,
    dedupe_key: event.dedupe_key ?? null
  }, { onConflict: 'dedupe_key' });
  return error?.message;
}

export async function createHighConfidenceAlertEvents(rows: Array<{ user_id?: string | null; symbol: string; confidence: number; direction: string; trader_mode: string }>) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { created: 0, skipped: true, reason: 'Supabase service role env vars are not set.' };

  let created = 0;
  const errors: string[] = [];
  for (const row of rows.filter(item => item.confidence >= 72)) {
    const prefs = await fetchAlertPreferences(row.user_id);
    if (!prefs.highConfidenceAlerts) continue;
    const error = await insertAlertEvent(supabase, {
      user_id: row.user_id ?? null,
      type: 'high_confidence',
      title: `${row.symbol} high-confidence signal`,
      body: `${row.symbol} opened as a ${row.direction} signal at ${row.confidence}% confidence in ${row.trader_mode} mode.`,
      symbol: row.symbol,
      signal_result_id: null,
      metadata: { confidence: row.confidence, direction: row.direction, mode: row.trader_mode },
      read_at: null,
      dedupe_key: `${row.user_id ?? 'guest'}:high:${row.symbol}:${row.trader_mode}:${new Date().toISOString().slice(0, 13)}`
    });
    if (error) errors.push(`${row.symbol}: ${error}`);
    else created += 1;
  }
  return { created, skipped: false, errors };
}

export async function createSettlementAlertEvent(result: SignalResult, userId?: string | null) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { created: 0, skipped: true, reason: 'Supabase service role env vars are not set.' };
  const prefs = await fetchAlertPreferences(userId);
  if (!prefs.settlementAlerts) return { created: 0, skipped: true, reason: 'Settlement alerts disabled.' };

  const sign = result.returnPct >= 0 ? '+' : '';
  const error = await insertAlertEvent(supabase, {
    user_id: userId ?? null,
    type: 'settlement',
    title: `${result.symbol} signal ${result.outcome}`,
    body: `${result.symbol} ${result.direction.toUpperCase()} closed at ${sign}${result.returnPct}% after settlement.`,
    symbol: result.symbol,
    signal_result_id: result.id,
    metadata: { returnPct: result.returnPct, outcome: result.outcome, confidence: result.confidence },
    read_at: null,
    dedupe_key: `${userId ?? 'guest'}:settled:${result.id}`
  });
  return error ? { created: 0, skipped: true, reason: error } : { created: 1, skipped: false };
}

export async function fetchAlertEvents(userId?: string | null, limit = 20): Promise<AlertEvent[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];
  let query = supabase
    .from('alert_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  query = userId ? query.eq('user_id', userId) : query.is('user_id', null);
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as AlertEventRow[]).map(toEvent);
}

async function fetchClosedResultsForRecap(userId?: string | null): Promise<SignalResult[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];
  let query = supabase
    .from('signal_results')
    .select('*')
    .not('closed_at', 'is', null)
    .order('closed_at', { ascending: false })
    .limit(200);
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    label: row.label,
    direction: row.direction,
    mode: row.trader_mode,
    confidence: Number(row.confidence),
    entryPrice: Number(row.entry_price),
    exitPrice: Number(row.exit_price ?? row.entry_price),
    returnPct: Number(row.return_pct ?? 0),
    outcome: row.outcome ?? 'neutral',
    openedAt: row.opened_at,
    closedAt: row.closed_at ?? row.opened_at,
    note: row.note ?? ''
  }));
}

export async function buildDailyRecap(userId?: string | null) {
  const results = await fetchClosedResultsForRecap(userId ?? undefined);
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const closedToday = results.filter(result => new Date(result.closedAt).getTime() >= since);
  const summary = summarizePerformance(closedToday.length ? closedToday : results.slice(0, 24));
  const best = summary.best;
  const sign = best.returnPct >= 0 ? '+' : '';
  return {
    generatedAt: new Date().toISOString(),
    totalClosed: summary.totalSignals,
    wins: summary.wins,
    losses: summary.losses,
    neutrals: summary.neutrals,
    winRate: summary.winRate,
    avgReturn: summary.avgReturn,
    best: best.symbol === 'N/A' ? null : `${best.symbol} ${best.direction.toUpperCase()} ${sign}${best.returnPct}%`,
    body: `${summary.totalSignals} signals reviewed · ${summary.wins} wins / ${summary.losses} losses · ${summary.winRate}% win rate · ${summary.avgReturn >= 0 ? '+' : ''}${summary.avgReturn}% average return.`
  };
}

export async function createDailyRecapAlert(userId?: string | null) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { created: 0, skipped: true, reason: 'Supabase service role env vars are not set.' };
  const prefs = await fetchAlertPreferences(userId);
  if (!prefs.dailyRecap) return { created: 0, skipped: true, reason: 'Daily recap disabled.' };
  const recap = await buildDailyRecap(userId);
  const today = new Date().toISOString().slice(0, 10);
  const error = await insertAlertEvent(supabase, {
    user_id: userId ?? null,
    type: 'daily_recap',
    title: 'Midnight Signal Daily Recap',
    body: recap.body,
    symbol: null,
    signal_result_id: null,
    metadata: recap,
    read_at: null,
    dedupe_key: `${userId ?? 'guest'}:daily:${today}`
  });
  return error ? { created: 0, skipped: true, reason: error, recap } : { created: 1, skipped: false, recap };
}
