import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';
import { defaultNotificationPreferences } from '@/lib/notifications';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const supabase = getSupabaseAdminClient();
  if (!userId || !supabase) return NextResponse.json({ preferences: defaultNotificationPreferences, source: 'local' });

  const { data, error } = await supabase.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle();
  if (error) return NextResponse.json({ preferences: defaultNotificationPreferences, source: 'fallback', error: error.message }, { status: 202 });
  return NextResponse.json({ preferences: data?.preferences || defaultNotificationPreferences, source: data ? 'database' : 'default' });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = typeof body.userId === 'string' ? body.userId : null;
    const preferences = { ...defaultNotificationPreferences, ...(body.preferences || {}) };
    const supabase = getSupabaseAdminClient();
    if (!userId || !supabase) return NextResponse.json({ preferences, persisted: false }, { status: 202 });

    const { data, error } = await supabase.from('notification_preferences').upsert({ user_id: userId, preferences, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).select('*').single();
    if (error) throw error;
    return NextResponse.json({ preferences: data.preferences, persisted: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to save notification preferences.' }, { status: 500 });
  }
}
