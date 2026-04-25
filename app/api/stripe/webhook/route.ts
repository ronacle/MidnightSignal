import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const stripe = getStripe();
  const supabase = getSupabaseAdminClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ error: 'Webhook not configured.' }, { status: 500 });

  const body = await request.text();
  const sig = (await headers()).get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (error) {
    console.error('Invalid Stripe signature:', error);
    return NextResponse.json({ error: 'Invalid Stripe signature.' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId || session.client_reference_id || '';
    const email = session.customer_details?.email || session.customer_email || '';

    if (supabase && email) {
      const { error } = await supabase.from('users').upsert({
        id: userId || crypto.randomUUID(),
        email,
        plan: 'pro',
        stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
        stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' });

      if (error) console.error('Supabase user upsert error:', error);
      else console.log('User upgraded to pro:', email);
    } else {
      console.warn('Checkout completed without Supabase client or email.', { hasSupabase: Boolean(supabase), email });
    }
  }

  return NextResponse.json({ received: true });
}
