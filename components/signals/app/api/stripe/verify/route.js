import { NextResponse } from 'next/server';
import { mapStripeSessionToEntitlement, getStripeClient } from '@/lib/stripe-server';

export async function GET(request) {
  const sessionId = request.nextUrl.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ ok: false, error: 'Missing session_id' }, { status: 400 });
  }

  try {
    const stripe = await getStripeClient();
    if (!stripe) {
      return NextResponse.json({ ok: false, error: 'Stripe is not configured' }, { status: 503 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'line_items.data.price'],
    });

    const entitlement = mapStripeSessionToEntitlement(session);

    return NextResponse.json({
      ok: true,
      verified: entitlement.verified,
      entitlement,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error?.message || 'Unable to verify Stripe session',
    }, { status: 500 });
  }
}
