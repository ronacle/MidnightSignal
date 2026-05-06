import type { AssetSignal, TraderMode } from './signals';
import type { PerformanceOutcome, SignalDirection, SignalResult } from './performance';
import { getSupabaseAdminClient } from './supabase-server';
import { getMarketPrice } from './market';
import { createHighConfidenceAlertEvents, createSettlementAlertEvent } from './alerts';

const SETTLE_AFTER_HOURS = Number(process.env.SIGNAL_SETTLE_AFTER_HOURS || 24);
const MAX_OPEN_PER_MODE = Number(process.env.SIGNAL_MAX_OPEN_PER_MODE || 20);

type SignalResultRow = {
  id: string;
  user_id?: string | null;
  symbol: string;
  name: string;
  label: 'Bullish' | 'Neutral' | 'Bearish';
  direction: SignalDirection;
  trader_mode: TraderMode;
  confidence: number;
  entry_price: number | string;
  exit_price?: number | string | null;
  return_pct?: number | string | null;
  outcome?: PerformanceOutcome | null;
  opened_at: string;
  closed_at?: string | null;
  note?: string | null;
};

function directionFor(label: AssetSignal['label']): SignalDirection {
  if (label === 'Bullish') return 'long';
  if (label === 'Bearish') return 'short';
  return 'watch';
}

function outcomeFromReturn(returnPct: number): PerformanceOutcome {
  if (returnPct >= 0.75) return 'win';
  if (returnPct <= -0.75) return 'loss';
  return 'neutral';
}

function resultNote(symbol: string, direction: SignalDirection, outcome: PerformanceOutcome, returnPct: number) {
  if (outcome === 'win') return `${symbol} validated the ${direction} posture with a ${returnPct.toFixed(2)}% settled move.`;
  if (outcome === 'loss') return `${symbol} moved against the ${direction} read by ${Math.abs(returnPct).toFixed(2)}%, flagging this setup for review.`;
  return `${symbol} stayed close to entry, so Midnight Signal scored it neutral instead of forcing a win/loss.`;
}

function normalize(row: SignalResultRow): SignalResult {
  const returnPct = Number(row.return_pct ?? 0);
  const outcome = row.outcome ?? outcomeFromReturn(returnPct);
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    label: row.label,
    direction: row.direction,
    mode: row.trader_mode,
    confidence: Number(row.confidence),
    entryPrice: Number(row.entry_price),
    exitPrice: Number(row.exit_price ?? row.entry_price),
    returnPct,
    outcome,
    openedAt: row.opened_at,
    closedAt: row.closed_at ?? row.opened_at,
    note: row.note ?? resultNote(row.symbol, row.direction, outcome, returnPct)
  };
}

export async function fetchClosedSignalResults(userId?: string, limit = 60): Promise<SignalResult[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  let query = supabase
    .from('signal_results')
    .select('*')
    .not('closed_at', 'is', null)
    .order('closed_at', { ascending: false })
    .limit(limit);

  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as SignalResultRow[]).map(normalize);
}

export async function saveOpenSignals(signals: AssetSignal[], mode: TraderMode, userId?: string | null) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { inserted: 0, skipped: true, reason: 'Supabase service role env vars are not set.' };

  const topSignals = signals.slice(0, 5);
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const rows = [];
  for (const signal of topSignals) {
    const direction = directionFor(signal.label);
    const existing = await supabase
      .from('signal_results')
      .select('id')
      .eq('symbol', signal.symbol)
      .eq('trader_mode', mode)
      .is('closed_at', null)
      .gte('opened_at', since)
      .limit(1);

    if (existing.data?.length) continue;

    rows.push({
      user_id: userId || null,
      symbol: signal.symbol,
      name: signal.name,
      label: signal.label,
      direction,
      trader_mode: mode,
      confidence: signal.confidence,
      entry_price: signal.price,
      opened_at: new Date().toISOString(),
      note: `${signal.symbol} opened as a ${direction} signal at ${signal.confidence}% confidence.`
    });
  }

  if (!rows.length) return { inserted: 0, skipped: false };
  const { error } = await supabase.from('signal_results').insert(rows);
  if (error) return { inserted: 0, skipped: true, reason: error.message };
  const alertResult = await createHighConfidenceAlertEvents(rows);
  return { inserted: rows.length, skipped: false, alertResult };
}

export async function settleOpenSignals() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { settled: 0, skipped: true, reason: 'Supabase service role env vars are not set.' };

  const cutoff = new Date(Date.now() - SETTLE_AFTER_HOURS * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('signal_results')
    .select('*')
    .is('closed_at', null)
    .lte('opened_at', cutoff)
    .order('opened_at', { ascending: true })
    .limit(MAX_OPEN_PER_MODE);

  if (error || !data?.length) return { settled: 0, skipped: Boolean(error), reason: error?.message };

  let settled = 0;
  const errors: string[] = [];

  for (const signal of data as SignalResultRow[]) {
    try {
      const exitPrice = await getMarketPrice(signal.symbol, 'USD');
      const entryPrice = Number(signal.entry_price);
      const rawChange = ((exitPrice - entryPrice) / entryPrice) * 100;
      const returnPct = Number((signal.direction === 'short' ? -rawChange : rawChange).toFixed(2));
      const outcome = outcomeFromReturn(returnPct);
      const note = resultNote(signal.symbol, signal.direction, outcome, returnPct);

      const update = await supabase
        .from('signal_results')
        .update({
          exit_price: exitPrice,
          return_pct: returnPct,
          outcome,
          closed_at: new Date().toISOString(),
          note,
          updated_at: new Date().toISOString()
        })
        .eq('id', signal.id);

      if (update.error) errors.push(`${signal.symbol}: ${update.error.message}`);
      else {
        settled += 1;
        const closedAt = new Date().toISOString();
        await createSettlementAlertEvent(normalize({ ...signal, exit_price: exitPrice, return_pct: returnPct, outcome, closed_at: closedAt, note }), signal.user_id ?? null);
      }
    } catch (error) {
      errors.push(`${signal.symbol}: ${error instanceof Error ? error.message : 'Unknown settlement error'}`);
    }
  }

  return { settled, skipped: false, errors };
}
