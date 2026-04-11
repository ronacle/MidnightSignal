import { NextResponse } from 'next/server';
import { getStripeClient, mapStripeSubscriptionToEntitlement } from '@/lib/stripe-server';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const subscriptionId = body?.subscriptionId || null;
    const immediate = Boolean(body?.immediate);

    if (!subscriptionId) {
      return NextResponse.json({ ok: false, error: 'Missing Stripe subscription ID' }, { status: 400 });
    }

    const stripe = await getStripeClient();
    if (!stripe) {
      return NextResponse.json({ ok: false, error: 'Stripe is not configured' }, { status: 503 });
    }

    const subscription = immediate
      ? await stripe.subscriptions.cancel(subscriptionId)
      : await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });

    const entitlement = mapStripeSubscriptionToEntitlement({
      subscription,
      sessionId: body?.checkoutSessionId || null,
      fallbackCustomerId: body?.customerId || null,
      fallbackPriceId: body?.priceId || null,
    });

    return NextResponse.json({
      ok: true,
      cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
      canceledAt: subscription?.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      entitlement,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unable to cancel subscription' }, { status: 500 });
  }
}
