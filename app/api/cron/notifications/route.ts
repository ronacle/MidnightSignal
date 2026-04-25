import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';
import { buildDailyDigestSnapshot, buildWeeklyReportSnapshot } from '@/lib/retention';
import { buildEmailBody, buildEmailSubject, buildPushPayload, channelsForPreference, deliveryKey, isWithinQuietHours, sendResendEmail, type NotificationChannel, type NotificationType } from '@/lib/notifications';

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

async function deliver(input: { userId: string; email: string | null; type: NotificationType; snapshot: any; snapshotId: string | null; channels: NotificationChannel[]; periodKey: string; testMode: boolean }) {
  const supabase = getSupabaseAdminClient();
  const results: Record<string, unknown> = {};
  if (!supabase) return { results: { skipped: 'missing_supabase_admin' }, delivered: 0 };
  let delivered = 0;
  for (const channel of input.channels) {
    const key = deliveryKey({ userId: input.userId, snapshotId: input.snapshotId, type: input.type, channel, periodKey: input.periodKey });
    const { data: existing } = await supabase.from('notification_delivery_logs').select('id').eq('delivery_key', key).maybeSingle();
    if (existing && !input.testMode) {
      results[channel] = { status: 'duplicate' };
      continue;
    }
    try {
      let providerResult: Record<string, unknown>;
      let status = 'skipped';
      let errorMessage: string | null = null;
      if (input.testMode) {
        status = 'test_mode';
        providerResult = { delivered: false, testMode: true, payload: channel === 'push' ? buildPushPayload(input.type, input.snapshot) : undefined };
      } else if (channel === 'email') {
        const result = input.email ? await sendResendEmail({ to: input.email, subject: buildEmailSubject(input.type, input.snapshot), text: buildEmailBody(input.snapshot) }) : { delivered: false, reason: 'missing_email' };
        status = result.delivered ? 'sent' : 'skipped';
        errorMessage = result.delivered ? null : String(result.reason || 'not_delivered');
        providerResult = result as Record<string, unknown>;
        if (result.delivered) delivered += 1;
      } else {
        providerResult = { delivered: false, reason: 'web_push_adapter_ready', payload: buildPushPayload(input.type, input.snapshot) };
        errorMessage = 'web_push_adapter_ready';
      }
      results[channel] = providerResult;
      await supabase.from('notification_delivery_logs').insert({ user_id: input.userId, snapshot_id: input.snapshotId, notification_type: input.type, channel, status, delivery_key: key, period_key: input.periodKey, error_message: errorMessage, provider_result: providerResult });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Delivery failed';
      results[channel] = { status: 'failed', error: message };
      await supabase.from('notification_delivery_logs').insert({ user_id: input.userId, snapshot_id: input.snapshotId, notification_type: input.type, channel, status: 'failed', delivery_key: key, period_key: input.periodKey, error_message: message, provider_result: results[channel] as Record<string, unknown> });
    }
  }
  return { results, delivered };
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized cron request.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const type: NotificationType = body.type === 'weekly_report' ? 'weekly_report' : 'daily_digest';
  const testMode = Boolean(body.testMode);
  const targetUserId = typeof body.userId === 'string' ? body.userId : null;
  const periodKey = typeof body.periodKey === 'string' ? body.periodKey : new Date().toISOString().slice(0, type === 'weekly_report' ? 7 : 10);
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ processed: 0, delivered: 0, error: 'Missing Supabase admin client.' }, { status: 202 });

  let query = supabase.from('notification_preferences').select('user_id, preferences');
  if (targetUserId) query = query.eq('user_id', targetUserId);
  const { data: prefRows, error } = await query.limit(testMode ? 1 : 500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let processed = 0;
  let delivered = 0;
  const details: unknown[] = [];
  for (const row of prefRows || []) {
    const preferences = row.preferences || {};
    const channels = channelsForPreference(type, preferences);
    if (!channels.length) continue;
    if (!testMode && isWithinQuietHours(preferences)) {
      details.push({ userId: row.user_id, skipped: 'quiet_hours' });
      continue;
    }
    const { data: latestSnapshot } = await supabase.from('retention_snapshots').select('*').eq('user_id', row.user_id).eq('snapshot_type', type).order('created_at', { ascending: false }).limit(1).maybeSingle();
    const snapshot = latestSnapshot?.payload || (type === 'weekly_report' ? buildWeeklyReportSnapshot({}) : buildDailyDigestSnapshot({ personalSignal: { symbol: 'BTC', confidence: 68 }, globalSignal: { symbol: 'NVDA', confidence: 76 } }));
    const { data: authUser } = await supabase.auth.admin.getUserById(row.user_id);
    const result = await deliver({ userId: row.user_id, email: authUser?.user?.email || null, type, snapshot, snapshotId: latestSnapshot?.id || null, channels, periodKey, testMode });
    processed += 1;
    delivered += result.delivered;
    details.push({ userId: row.user_id, channels, results: result.results });
  }

  return NextResponse.json({ type, periodKey, testMode, processed, delivered, details });
}

export async function GET(request: Request) {
  return POST(request);
}
