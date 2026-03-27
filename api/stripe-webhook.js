import { stripe } from "../lib/stripe.js";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";

async function updateProfile({
  userId,
  email,
  customerId,
  subscriptionId,
  subscriptionStatus,
  plan
}) {
  const payload = {
    id: userId,
    email: email || null,
    plan: plan || "free",
    stripe_customer_id: customerId || null,
    stripe_subscription_id: subscriptionId || null,
    subscription_status: subscriptionStatus || null,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabaseAdmin
    .from("profiles")
    .upsert(payload, { onConflict: "id" });

  if (error) throw error;
}

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const signature = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return res.status(400).json({ error: "missing_signature_or_secret" });
    }

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    const rawBody = Buffer.concat(chunks);

    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.user_id;
        const email = session.customer_details?.email || session.metadata?.email || null;
        if (userId) {
          await updateProfile({
            userId,
            email,
            customerId: session.customer || null,
            subscriptionId: session.subscription || null,
            subscriptionStatus: "active",
            plan: "pro"
          });
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        let userId = subscription.metadata?.user_id || null;

        if (!userId && subscription.customer) {
          const { data } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", String(subscription.customer))
            .maybeSingle();
          userId = data?.id || null;
        }

        if (userId) {
          const active = subscription.status === "active" || subscription.status === "trialing";
          await updateProfile({
            userId,
            email: null,
            customerId: subscription.customer || null,
            subscriptionId: subscription.id || null,
            subscriptionStatus: subscription.status || null,
            plan: active ? "pro" : "free"
          });
        }
        break;
      }

      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("stripe-webhook error:", error);
    return res.status(400).json({
      error: "webhook_failed",
      detail: String(error?.message || error)
    });
  }
}
