import { NextResponse } from 'next/server';
import { getStripeClient, mapStripeSubscriptionToEntitlement, mapStripeSessionToEntitlement } from '@/lib/stripe-server';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const entitlement = body?.entitlement && typeof body.entitlement === 'object' ? body.entitlement : {};

    const stripe = await getStripeClient();
    if (!stripe) {
      return NextResponse.json({ ok: false, error: 'Stripe is not configured' }, { status: 503 });
    }

    if (entitlement.subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(entitlement.subscriptionId, {
        expand: ['items.data.price'],
      });
      const refreshed = mapStripeSubscriptionToEntitlement({
        subscription,
        sessionId: entitlement.checkoutSessionId || null,
        fallbackCustomerId: entitlement.customerId || null,
        fallbackPriceId: entitlement.priceId || null,
      });
      return NextResponse.json({ ok: true, entitlement: refreshed });
    }

    if (entitlement.checkoutSessionId) {
      const session = await stripe.checkout.sessions.retrieve(entitlement.checkoutSessionId, {
        expand: ['subscription', 'line_items.data.price'],
      });
      const refreshed = mapStripeSessionToEntitlement(session);
      return NextResponse.json({ ok: true, entitlement: refreshed });
    }

    return NextResponse.json({ ok: false, error: 'Missing Stripe identifiers for refresh' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unable to refresh entitlement' }, { status: 500 });
  }
}
