import { NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe-server';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const customerId = body?.customerId || null;
    const returnPath = typeof body?.returnPath === 'string' && body.returnPath.startsWith('/') ? body.returnPath : '/?billing_return=portal';
    const origin = request.nextUrl.origin;

    if (!customerId) {
      return NextResponse.json({ ok: false, error: 'Missing Stripe customer ID' }, { status: 400 });
    }

    const stripe = await getStripeClient();
    if (!stripe) {
      return NextResponse.json({ ok: false, error: 'Stripe is not configured' }, { status: 503 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}${returnPath}`,
    });

    return NextResponse.json({ ok: true, url: session.url || null });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unable to create billing portal session' }, { status: 500 });
  }
}
