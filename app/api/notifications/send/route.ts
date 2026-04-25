import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';
import { buildDailyDigestSnapshot, buildWeeklyReportSnapshot } from '@/lib/retention';
import { buildEmailBody, buildEmailSubject, buildPushPayload, deliveryKey, sendResendEmail, type NotificationChannel, type NotificationType } from '@/lib/notifications';

async function logDelivery(input: { userId: string | null; snapshotId?: string | null; type: NotificationType; channel: NotificationChannel; status: string; periodKey?: string | null; errorMessage?: string | null; providerResult?: Record<string, unknown> }) {
  const supabase = getSupabaseAdminClient();
  if (!input.userId || !supabase) return;
  const key = deliveryKey({ userId: input.userId, snapshotId: input.snapshotId, type: input.type, channel: input.channel, periodKey: input.periodKey });
  await supabase.from('notification_delivery_logs').insert({ user_id: input.userId, snapshot_id: input.snapshotId || null, notification_type: input.type, channel: input.channel, status: input.status, delivery_key: key, period_key: input.periodKey || null, error_message: input.errorMessage || null, provider_result: input.providerResult || {} }).throwOnError();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = typeof body.userId === 'string' ? body.userId : null;
    const email = typeof body.email === 'string' ? body.email : null;
    const type: NotificationType = body.type === 'weekly_report' ? 'weekly_report' : body.type === 'missed_opportunity' ? 'missed_opportunity' : 'daily_digest';
    const channels: NotificationChannel[] = Array.isArray(body.channels) && body.channels.length ? body.channels : ['email'];
    const periodKey = typeof body.periodKey === 'string' ? body.periodKey : new Date().toISOString().slice(0, 10);
    const snapshotId = typeof body.snapshotId === 'string' ? body.snapshotId : null;
    const testMode = Boolean(body.testMode);
    const payload = type === 'weekly_report'
      ? buildWeeklyReportSnapshot(body.report || {})
      : buildDailyDigestSnapshot({ personalSignal: body.personalSignal || { symbol: 'BTC', name: 'Your watchlist leader', confidence: 68 }, globalSignal: body.globalSignal || { symbol: 'NVDA', name: 'Global top signal', confidence: 76 } });

    const supabase = getSupabaseAdminClient();
    const results: Record<string, unknown> = {};
    for (const channel of channels) {
      const key = userId ? deliveryKey({ userId, snapshotId, type, channel, periodKey }) : null;
      if (key && supabase) {
        const { data: existing } = await supabase.from('notification_delivery_logs').select('id,status').eq('delivery_key', key).maybeSingle();
        if (existing && !testMode) {
          results[channel] = { delivered: false, status: 'duplicate', reason: 'already_sent_for_snapshot_or_period' };
          continue;
        }
      }
      try {
        if (testMode) {
          results[channel] = { delivered: false, status: 'test_mode', payload: channel === 'push' ? buildPushPayload(type, payload) : undefined };
          await logDelivery({ userId, snapshotId, type, channel, status: 'test_mode', periodKey, providerResult: results[channel] as Record<string, unknown> });
        } else if (channel === 'email') {
          const result = email ? await sendResendEmail({ to: email, subject: buildEmailSubject(type, payload), text: buildEmailBody(payload) }) : { delivered: false, reason: 'missing_email' };
          const status = result.delivered ? 'sent' : 'skipped';
          results.email = result;
          await logDelivery({ userId, snapshotId, type, channel, status, periodKey, errorMessage: result.delivered ? null : String(result.reason || 'not_delivered'), providerResult: result as Record<string, unknown> });
        } else {
          const result = { delivered: false, status: 'skipped', reason: 'web_push_adapter_ready', payload: buildPushPayload(type, payload) };
          results.push = result;
          await logDelivery({ userId, snapshotId, type, channel, status: 'skipped', periodKey, errorMessage: 'web_push_adapter_ready', providerResult: result });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Delivery failed';
        results[channel] = { delivered: false, status: 'failed', error: message };
        await logDelivery({ userId, snapshotId, type, channel, status: 'failed', periodKey, errorMessage: message, providerResult: results[channel] as Record<string, unknown> });
      }
    }

    if (userId && supabase) await supabase.from('notification_deliveries').insert({ user_id: userId, notification_type: type, channels, payload, provider_result: results });
    return NextResponse.json({ notification: payload, results, periodKey, persisted: Boolean(userId && supabase) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to send notification.' }, { status: 500 });
  }
}
