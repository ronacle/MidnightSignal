import { stripe } from "../lib/stripe.js";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const { userId, email } = req.body || {};
    if (!userId || !email) {
      return res.status(400).json({ error: "missing_user_id_or_email" });
    }

    const priceId = process.env.STRIPE_PRICE_ID_MONTHLY_PRO;
    const appBaseUrl = process.env.APP_BASE_URL;

    if (!priceId || !appBaseUrl) {
      return res.status(500).json({ error: "missing_checkout_configuration" });
    }

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: existing?.stripe_customer_id || undefined,
      customer_email: existing?.stripe_customer_id ? undefined : email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appBaseUrl}?checkout=success`,
      cancel_url: `${appBaseUrl}?checkout=cancelled`,
      client_reference_id: userId,
      metadata: {
        user_id: userId,
        email
      },
      allow_promotion_codes: true
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("create-checkout error:", error);
    return res.status(500).json({
      error: "checkout_creation_failed",
      detail: String(error?.message || error)
    });
  }
}
