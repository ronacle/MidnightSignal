import { DailyDigestSnapshot, WeeklyReportSnapshot } from '@/lib/retention';

export type NotificationChannel = 'email' | 'push';
export type NotificationType = 'daily_digest' | 'weekly_report' | 'missed_opportunity';
export type DeliveryStatus = 'sent' | 'failed' | 'skipped' | 'duplicate' | 'test_mode';

export type NotificationPreferences = {
  emailDailyDigest: boolean;
  emailWeeklyReport: boolean;
  pushDailyDigest: boolean;
  pushWeeklyReport: boolean;
  pushMissedOpportunity: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};

export const defaultNotificationPreferences: NotificationPreferences = {
  emailDailyDigest: true,
  emailWeeklyReport: true,
  pushDailyDigest: false,
  pushWeeklyReport: false,
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
    return [payload.title, '', payload.headline, payload.summary, '', 'Next best action: ' + payload.nextBestAction, '', 'Open Midnight Signal to review the full report.'].join('\n');
  }
  return [payload.title, '', payload.headline, payload.comparison, '', 'Primary action: ' + payload.primaryAction, 'Secondary action: ' + payload.secondaryAction, '', 'Open Midnight Signal to review the full digest.'].join('\n');
}

export function buildPushPayload(type: NotificationType, payload: DailyDigestSnapshot | WeeklyReportSnapshot) {
  if (payload.kind === 'weekly_report') return { title: 'Weekly report ready', body: payload.headline, url: '/?notification=weekly-report', type };
  return { title: type === 'missed_opportunity' ? 'Missed opportunity alert' : 'Daily signal digest', body: payload.comparison, url: type === 'missed_opportunity' ? '/?notification=missed-opportunity' : '/?notification=daily-digest', type };
}

export function channelsForPreference(type: NotificationType, preferences: Partial<NotificationPreferences>) {
  const prefs = { ...defaultNotificationPreferences, ...preferences };
  const channels: NotificationChannel[] = [];
  if (type === 'daily_digest') {
    if (prefs.emailDailyDigest) channels.push('email');
    if (prefs.pushDailyDigest) channels.push('push');
  }
  if (type === 'weekly_report') {
    if (prefs.emailWeeklyReport) channels.push('email');
    if (prefs.pushWeeklyReport) channels.push('push');
  }
  if (type === 'missed_opportunity' && prefs.pushMissedOpportunity) channels.push('push');
  return channels;
}

function minutes(value: string) {
  const [h, m] = String(value || '00:00').split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

export function isWithinQuietHours(preferences: Partial<NotificationPreferences>, now = new Date()) {
  const prefs = { ...defaultNotificationPreferences, ...preferences };
  const current = now.getHours() * 60 + now.getMinutes();
  const start = minutes(prefs.quietHoursStart);
  const end = minutes(prefs.quietHoursEnd);
  if (start === end) return false;
  return start < end ? current >= start && current < end : current >= start || current < end;
}

export function deliveryKey(input: { userId: string; snapshotId?: string | null; type: NotificationType; channel: NotificationChannel; periodKey?: string | null }) {
  return [input.userId, input.snapshotId || input.periodKey || 'manual', input.type, input.channel].join(':');
}

export async function sendResendEmail(input: { to: string; subject: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || 'Midnight Signal <notifications@midnightsignal.app>';
  if (!apiKey) return { delivered: false, provider: 'resend', reason: 'missing_resend_api_key' };
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: input.to, subject: input.subject, text: input.text }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || 'Resend email delivery failed');
  return { delivered: true, provider: 'resend', data };
}
