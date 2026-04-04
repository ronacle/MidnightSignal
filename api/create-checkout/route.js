async function createStripeCheckoutSession({ origin, email }) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;

  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("success_url", `${siteUrl}/?checkout=success`);
  params.set("cancel_url", `${siteUrl}/?checkout=cancelled`);
  params.append("line_items[0][price]", priceId);
  params.append("line_items[0][quantity]", "1");
  if (email) params.set("customer_email", email);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || "Stripe checkout failed");
  }
  return json;
}

export async function POST(req) {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
      return Response.json(
        { error: "Stripe is not configured yet. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID." },
        { status: 501 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const session = await createStripeCheckoutSession({
      origin,
      email: body?.email || ""
    });

    return Response.json({ url: session.url }, { status: 200 });
  } catch (err) {
    return Response.json({ error: err.message || "Checkout creation failed" }, { status: 500 });
  }
}
