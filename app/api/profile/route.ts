import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const supabase = getSupabaseAdminClient();
  const { userId, email } = await request.json().catch(() => ({}));
  if (!supabase || (!userId && !email)) return NextResponse.json({ plan: 'free' });

  let query = supabase
    .from('users')
    .select('id,email,plan,stripe_customer_id,stripe_subscription_id,updated_at')
    .limit(1);

  const { data, error } = userId
    ? await query.eq('id', userId)
    : await query.eq('email', email);

  if (error) {
    console.error('Profile lookup error:', error);
    return NextResponse.json({ plan: 'free', error: error.message }, { status: 200 });
  }

  const record = data?.[0];
  return NextResponse.json({
    plan: record?.plan === 'pro' ? 'pro' : 'free',
    email: record?.email || email || '',
    stripeCustomerId: record?.stripe_customer_id || null,
    stripeSubscriptionId: record?.stripe_subscription_id || null,
    updatedAt: record?.updated_at || null
  });
}
