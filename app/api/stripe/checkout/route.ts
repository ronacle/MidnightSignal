import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Stripe is not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID.' }, { status: 500 });

  const { email, userId } = await request.json().catch(() => ({}));
  const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const price = process.env.STRIPE_PRICE_ID;
  if (!price) return NextResponse.json({ error: 'Missing STRIPE_PRICE_ID.' }, { status: 500 });

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    customer_email: email || undefined,
    client_reference_id: userId || undefined,
    metadata: { userId: userId || '', plan: 'pro', product: 'midnight-signal-founder' },
    success_url: `${origin}?checkout=success`,
    cancel_url: `${origin}?checkout=cancelled`,
    allow_promotion_codes: true
  });

  return NextResponse.json({ url: session.url });
}
