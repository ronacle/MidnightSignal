import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const supabase = getSupabaseAdminClient();
  const { userId, email } = await request.json().catch(() => ({}));
  if (!supabase || (!userId && !email)) return NextResponse.json({ plan: 'free' });

  const query = supabase.from('profiles').select('plan,email').limit(1);
  const { data } = userId ? await query.eq('id', userId) : await query.eq('email', email);
  return NextResponse.json({ plan: data?.[0]?.plan || 'free', email: data?.[0]?.email || email || '' });
}
