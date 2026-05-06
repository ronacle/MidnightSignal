import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const supabase = getSupabaseAdminClient();
  if (!userId || !supabase) return NextResponse.json({ logs: [], source: 'local' });
  const { data, error } = await supabase.from('notification_delivery_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(25);
  if (error) return NextResponse.json({ logs: [], source: 'fallback', error: error.message }, { status: 202 });
  return NextResponse.json({ logs: data || [], source: 'database' });
}
