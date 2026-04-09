import { NextResponse } from 'next/server';

export async function GET(request) {
  const origin = request.nextUrl.origin;
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
      subscription_data: {
        metadata: {
          product: 'midnight-signal-pro',
        },
      },
      metadata: {
        product: 'midnight-signal-pro',
      },
      customer_creation: 'always',
    });

    if (!session.url) {
      return NextResponse.redirect(`${origin}/?billing=unavailable`);
    }

    return NextResponse.redirect(session.url);
  } catch {
    return NextResponse.redirect(`${origin}/?billing=unavailable`);
  }
}
