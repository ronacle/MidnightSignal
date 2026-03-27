import { stripe } from "../lib/stripe.js";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: "missing_user_id" });
    }

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();

    if (error || !profile?.stripe_customer_id) {
      return res.status(400).json({ error: "missing_stripe_customer" });
    }

    const appBaseUrl = process.env.APP_BASE_URL;
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: appBaseUrl
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("create-portal error:", error);
    return res.status(500).json({
      error: "portal_creation_failed",
      detail: String(error?.message || error)
    });
  }
}
