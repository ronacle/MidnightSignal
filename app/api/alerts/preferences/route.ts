import { NextResponse } from 'next/server';
import { defaultAlertPreferences, fetchAlertPreferences, upsertAlertPreferences } from '@/lib/alerts';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const preferences = await fetchAlertPreferences(userId);
  return NextResponse.json({ ok: true, preferences });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const userId = body.userId as string | undefined;
  const preferences = { ...defaultAlertPreferences, ...(body.preferences || {}) };
  if (!userId) return NextResponse.json({ ok: true, preferences, localOnly: true });
  const result = await upsertAlertPreferences(userId, preferences);
  return NextResponse.json(result.ok ? { ok: true, preferences } : { ok: false, error: result.reason }, { status: result.ok ? 200 : 500 });
}
