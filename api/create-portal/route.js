async function createBillingPortalSession({ customerId, origin }) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;

  const params = new URLSearchParams();
  params.set("customer", customerId);
  params.set("return_url", `${siteUrl}/`);

  const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || "Billing portal failed");
  }
  return json;
}

export async function POST(req) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json(
        { error: "Stripe is not configured yet. Add STRIPE_SECRET_KEY." },
        { status: 501 }
      );
    }

    const body = await req.json().catch(() => ({}));
    if (!body?.customerId) {
      return Response.json({ error: "Missing customerId" }, { status: 400 });
    }

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const portal = await createBillingPortalSession({
      customerId: body.customerId,
      origin
    });

    return Response.json({ url: portal.url }, { status: 200 });
  } catch (err) {
    return Response.json({ error: err.message || "Portal creation failed" }, { status: 500 });
  }
}
