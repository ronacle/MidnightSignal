import { NextResponse } from 'next/server';

export async function GET(request) {
  const origin = request.nextUrl.origin;
  const successUrl = `${origin}/?upgraded=1`;
  const cancelUrl = `${origin}/?checkout=canceled`;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!secretKey || !priceId) {
    return NextResponse.redirect(successUrl);
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
    });

    if (!session.url) {
      return NextResponse.redirect(successUrl);
    }

    return NextResponse.redirect(session.url);
  } catch {
    return NextResponse.redirect(successUrl);
  }
}
