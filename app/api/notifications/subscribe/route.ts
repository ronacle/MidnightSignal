import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = typeof body.userId === 'string' ? body.userId : null;
    const subscription = body.subscription;
    const supabase = getSupabaseAdminClient();
    if (!userId || !subscription || !supabase) return NextResponse.json({ subscribed: false, persisted: false }, { status: 202 });

    const endpoint = String(subscription.endpoint || '');
    const { error } = await supabase.from('push_subscriptions').upsert({ user_id: userId, endpoint, subscription, updated_at: new Date().toISOString() }, { onConflict: 'user_id,endpoint' });
    if (error) throw error;
    return NextResponse.json({ subscribed: true, persisted: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to save push subscription.' }, { status: 500 });
  }
}
