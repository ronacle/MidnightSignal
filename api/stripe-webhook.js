import { stripe } from '../lib/stripe.js';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';

async function updateProfileFromSubscription({
  userId,
  email,
  customerId,
  subscriptionId,
  status,
  currentPeriodEnd,
  plan,
}) {
  const payload = {
    id: userId,
    email,
    plan: plan || (status === 'active' || status === 'trialing' ? 'pro' : 'free'),
    stripe_customer_id: customerId || null,
    stripe_subscription_id: subscriptionId || null,
    subscription_status: status || null,
    current_period_end: currentPeriodEnd
      ? new Date(currentPeriodEnd * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin.from('profiles').upsert(payload, {
    onConflict: 'id',
  });

  if (error) {
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return res.status(400).json({ error: 'missing_webhook_signature_or_secret' });
  }

  try {
    const rawBody =
      typeof req.body === 'string'
        ? req.body
        : Buffer.isBuffer(req.body)
        ? req.body.toString('utf8')
        : JSON.stringify(req.body);

    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.user_id;
        const email = session.customer_details?.email || session.metadata?.email || null;

        if (userId) {
          await updateProfileFromSubscription({
            userId,
            email,
            customerId: session.customer || null,
            subscriptionId: session.subscription || null,
            status: 'active',
            currentPeriodEnd: null,
            plan: 'pro',
          });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.user_id || null;

        if (userId) {
          await updateProfileFromSubscription({
            userId,
            email: null,
            customerId: subscription.customer || null,
            subscriptionId: subscription.id || null,
            status: subscription.status || null,
            currentPeriodEnd: subscription.current_period_end || null,
            plan:
              subscription.status === 'active' || subscription.status === 'trialing'
                ? 'pro'
                : 'free',
          });
        }
        break;
      }

      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('stripe-webhook error:', error);
    return res.status(400).json({
      error: 'webhook_failed',
      detail: String(error?.message || error),
    });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
