import { NextResponse } from 'next/server';

export async function GET(request) {
  const origin = request.nextUrl.origin;
  const plan = request.nextUrl.searchParams.get('plan') || 'pro-founder';
  const billingCycle = request.nextUrl.searchParams.get('billing_cycle') || 'monthly';
  const successUrl = `${origin}/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/cancel?checkout=canceled`;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!secretKey || !priceId) {
    return NextResponse.redirect(`${origin}/?billing=unavailable`);
  }

  try {
    const stripeModule = await import('stripe');
    const Stripe = stripeModule.default;
    const stripe = new Stripe(secretKey);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_creation: 'always',
      metadata: {
        product: 'midnight-signal-pro',
        plan,
        billingCycle,
      },
      subscription_data: {
        metadata: {
          product: 'midnight-signal-pro',
          plan,
          billingCycle,
        },
      },
    });

    if (!session.url) {
      return NextResponse.redirect(`${origin}/?billing=unavailable`);
    }

    return NextResponse.redirect(session.url);
  } catch {
    return NextResponse.redirect(`${origin}/?billing=unavailable`);
  }
}
