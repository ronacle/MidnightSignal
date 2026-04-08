import { NextResponse } from 'next/server';

function toIsoFromUnix(value) {
  if (!value) return null;
  try {
    return new Date(value * 1000).toISOString();
  } catch {
    return null;
  }
}

export async function GET(request) {
  const sessionId = request.nextUrl.searchParams.get('session_id');
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!sessionId) {
    return NextResponse.json({ ok: false, error: 'Missing session_id' }, { status: 400 });
  }

  if (!secretKey) {
    return NextResponse.json({ ok: false, error: 'Stripe is not configured' }, { status: 503 });
  }

  try {
    const stripeModule = await import('stripe');
    const Stripe = stripeModule.default;
    const stripe = new Stripe(secretKey);

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'line_items.data.price'],
    });

    const subscription = session.subscription && typeof session.subscription === 'object'
      ? session.subscription
      : null;

    const subscriptionStatus = subscription?.status || null;
    const isPaid = session.payment_status === 'paid';
    const isActiveLike = ['active', 'trialing'].includes(subscriptionStatus || '');
    const verified = Boolean(session.status === 'complete' && isPaid && isActiveLike);

    return NextResponse.json({
      ok: true,
      verified,
      entitlement: {
        status: verified ? 'active' : (subscriptionStatus || (session.status === 'open' ? 'pending' : 'inactive')),
        verified,
        source: 'stripe',
        customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id || null,
        subscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id || null,
        checkoutSessionId: session.id,
        priceId: subscription?.items?.data?.[0]?.price?.id || session?.line_items?.data?.[0]?.price?.id || null,
        currentPeriodEnd: toIsoFromUnix(subscription?.current_period_end),
        checkedAt: new Date().toISOString(),
        lastEventAt: new Date().toISOString(),
        lastError: '',
      },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error?.message || 'Unable to verify Stripe session',
    }, { status: 500 });
  }
}
