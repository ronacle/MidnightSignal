import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';
import { buildDailyDigestSnapshot, buildWeeklyReportSnapshot } from '@/lib/retention';
import { buildEmailBody, buildEmailSubject, buildPushPayload, sendResendEmail, type NotificationChannel, type NotificationType } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = typeof body.userId === 'string' ? body.userId : null;
    const email = typeof body.email === 'string' ? body.email : null;
    const type: NotificationType = body.type === 'weekly_report' ? 'weekly_report' : body.type === 'missed_opportunity' ? 'missed_opportunity' : 'daily_digest';
    const channels: NotificationChannel[] = Array.isArray(body.channels) && body.channels.length ? body.channels : ['email'];
    const payload = type === 'weekly_report'
      ? buildWeeklyReportSnapshot(body.report || {})
      : buildDailyDigestSnapshot({
          personalSignal: body.personalSignal || { symbol: 'BTC', name: 'Your watchlist leader', confidence: 68 },
          globalSignal: body.globalSignal || { symbol: 'NVDA', name: 'Global top signal', confidence: 76 },
        });

    const results: Record<string, unknown> = {};
    if (channels.includes('email')) {
      results.email = email
        ? await sendResendEmail({ to: email, subject: buildEmailSubject(type, payload), text: buildEmailBody(payload) })
        : { delivered: false, reason: 'missing_email' };
    }
    if (channels.includes('push')) {
      results.push = { delivered: false, reason: 'web_push_adapter_ready', payload: buildPushPayload(type, payload) };
    }

    const supabase = getSupabaseAdminClient();
    if (userId && supabase) {
      await supabase.from('notification_deliveries').insert({ user_id: userId, notification_type: type, channels, payload, provider_result: results });
    }

    return NextResponse.json({ notification: payload, results, persisted: Boolean(userId && supabase) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to send notification.' }, { status: 500 });
  }
}
