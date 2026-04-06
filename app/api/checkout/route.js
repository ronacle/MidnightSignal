//import Stripe from "stripe";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get("origin") ||
      "http://localhost:3000";

    const email = body?.email || "";
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;

    if (!stripeKey || !priceId) {
      return Response.json({
        ok: true,
        mode: "mock",
        url: `${origin}/success?mock=1&email=${encodeURIComponent(email)}`,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-02-24.acacia" });
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
      customer_email: email || undefined,
      allow_promotion_codes: true,
    });

    return Response.json({
      ok: true,
      mode: "stripe",
      url: session.url,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message: error?.message || "Unable to create checkout session.",
      },
      { status: 500 }
    );
  }
}
