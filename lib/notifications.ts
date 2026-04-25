import { DailyDigestSnapshot, WeeklyReportSnapshot } from '@/lib/retention';

export type NotificationChannel = 'email' | 'push';
export type NotificationType = 'daily_digest' | 'weekly_report' | 'missed_opportunity';

export type NotificationPreferences = {
  emailDailyDigest: boolean;
  emailWeeklyReport: boolean;
  pushDailyDigest: boolean;
  pushMissedOpportunity: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};

export const defaultNotificationPreferences: NotificationPreferences = {
  emailDailyDigest: true,
  emailWeeklyReport: true,
  pushDailyDigest: false,
  pushMissedOpportunity: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

export function buildEmailSubject(type: NotificationType, payload: DailyDigestSnapshot | WeeklyReportSnapshot) {
  if (type === 'weekly_report') return 'Your Midnight Signal weekly report is ready';
  if (type === 'missed_opportunity') return 'A global signal is beating your watchlist';
  return 'Your Midnight Signal daily digest';
}

export function buildEmailBody(payload: DailyDigestSnapshot | WeeklyReportSnapshot) {
  if (payload.kind === 'weekly_report') {
    return [
      payload.title,
      '',
      payload.headline,
      payload.summary,
      '',
      'Next best action: ' + payload.nextBestAction,
      '',
      'Open Midnight Signal to review the full report.'
    ].join('\n');
  }

  return [
    payload.title,
    '',
    payload.headline,
    payload.comparison,
    '',
    'Primary action: ' + payload.primaryAction,
    'Secondary action: ' + payload.secondaryAction,
    '',
    'Open Midnight Signal to review the full digest.'
  ].join('\n');
}

export function buildPushPayload(type: NotificationType, payload: DailyDigestSnapshot | WeeklyReportSnapshot) {
  if (payload.kind === 'weekly_report') {
    return {
      title: 'Weekly report ready',
      body: payload.headline,
      url: '/?notification=weekly-report',
      type,
    };
  }

  return {
    title: type === 'missed_opportunity' ? 'Missed opportunity alert' : 'Daily signal digest',
    body: payload.comparison,
    url: type === 'missed_opportunity' ? '/?notification=missed-opportunity' : '/?notification=daily-digest',
    type,
  };
}

export async function sendResendEmail(input: { to: string; subject: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || 'Midnight Signal <notifications@midnightsignal.app>';
  if (!apiKey) return { delivered: false, provider: 'resend', reason: 'missing_resend_api_key' };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: input.to, subject: input.subject, text: input.text }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || 'Resend email delivery failed');
  return { delivered: true, provider: 'resend', data };
}
