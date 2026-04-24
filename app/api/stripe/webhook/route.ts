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
  try { event = stripe.webhooks.constructEvent(body, sig, secret); }
  catch { return NextResponse.json({ error: 'Invalid Stripe signature.' }, { status: 400 }); }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId || session.client_reference_id || '';
    const email = session.customer_details?.email || session.customer_email || '';
    if (supabase && userId) {
      await supabase.from('profiles').upsert({
        id: userId,
        email,
        plan: 'pro',
        stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    }
  }

  return NextResponse.json({ received: true });
}
