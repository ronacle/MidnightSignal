import { NextResponse } from 'next/server';
import {
  findMatchingUserIdsByEntitlement,
  getStripeClient,
  mapStripeSessionToEntitlement,
  mapStripeSubscriptionToEntitlement,
  persistEntitlementForUserIds,
} from '@/lib/stripe-server';

export const dynamic = 'force-dynamic';

async function eventToEntitlement(event, stripe) {
  const object = event?.data?.object;
  if (!object) return null;

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
    case 'checkout.session.expired':
      return mapStripeSessionToEntitlement(object);
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      return mapStripeSubscriptionToEntitlement({
        subscription: object,
        fallbackCustomerId: object.customer || null,
        fallbackPriceId: object.items?.data?.[0]?.price?.id || null,
        eventCreated: event.created || null,
      });
    }
    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const subscriptionId = typeof object.subscription === 'string' ? object.subscription : object.subscription?.id;
      if (!subscriptionId) return null;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price'],
      });
      return mapStripeSubscriptionToEntitlement({
        subscription,
        fallbackCustomerId: object.customer || null,
        fallbackPriceId: object.lines?.data?.[0]?.price?.id || null,
        eventCreated: event.created || null,
      });
    }
    default:
      return null;
  }
}

export async function POST(request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ ok: false, error: 'Missing STRIPE_WEBHOOK_SECRET' }, { status: 503 });
  }

  try {
    const stripe = await getStripeClient();
    if (!stripe) {
      return NextResponse.json({ ok: false, error: 'Stripe is not configured' }, { status: 503 });
    }

    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json({ ok: false, error: 'Missing stripe-signature header' }, { status: 400 });
    }

    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    const entitlement = await eventToEntitlement(event, stripe);

    if (!entitlement) {
      return NextResponse.json({ ok: true, ignored: true, type: event.type });
    }

    const userIds = await findMatchingUserIdsByEntitlement(entitlement);
    const persisted = userIds.length
      ? await persistEntitlementForUserIds(userIds, entitlement)
      : { ok: true, updated: 0 };

    return NextResponse.json({
      ok: true,
      type: event.type,
      matchedUsers: userIds.length,
      updatedUsers: persisted.updated || 0,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unable to process webhook' }, { status: 400 });
  }
}
