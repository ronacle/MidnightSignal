import { createClient } from '@supabase/supabase-js';
import { normalizeEntitlement } from '@/lib/entitlements';
import { DEFAULT_STATE } from '@/lib/default-state';

export function toIsoFromUnix(value) {
  if (!value) return null;
  try {
    return new Date(value * 1000).toISOString();
  } catch {
    return null;
  }
}

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return import('stripe').then((mod) => {
    const Stripe = mod.default;
    return new Stripe(secretKey);
  });
}

export function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function mapStripeSubscriptionToEntitlement({ subscription, sessionId = null, fallbackCustomerId = null, fallbackPriceId = null, eventCreated = null }) {
  const status = String(subscription?.status || 'inactive').toLowerCase();
  const verified = ['active', 'trialing'].includes(status);
  return normalizeEntitlement({
    status,
    verified,
    source: 'stripe',
    customerId: typeof subscription?.customer === 'string' ? subscription.customer : (subscription?.customer?.id || fallbackCustomerId || null),
    subscriptionId: subscription?.id || null,
    checkoutSessionId: sessionId || null,
    priceId: subscription?.items?.data?.[0]?.price?.id || fallbackPriceId || null,
    currentPeriodEnd: toIsoFromUnix(subscription?.current_period_end),
    checkedAt: new Date().toISOString(),
    lastEventAt: eventCreated ? toIsoFromUnix(eventCreated) : new Date().toISOString(),
    lastError: '',
  });
}

export function mapStripeSessionToEntitlement(session) {
  const subscription = session?.subscription && typeof session.subscription === 'object'
    ? session.subscription
    : null;
  const subscriptionStatus = String(subscription?.status || '').toLowerCase();
  const paymentStatus = String(session?.payment_status || '').toLowerCase();
  const sessionStatus = String(session?.status || '').toLowerCase();
  const status = subscriptionStatus || (sessionStatus === 'open' ? 'pending' : 'inactive');
  const verified = Boolean(sessionStatus === 'complete' && paymentStatus === 'paid' && ['active', 'trialing'].includes(subscriptionStatus));

  return normalizeEntitlement({
    status,
    verified,
    source: 'stripe',
    customerId: typeof session?.customer === 'string' ? session.customer : session?.customer?.id || null,
    subscriptionId: typeof session?.subscription === 'string' ? session.subscription : session?.subscription?.id || null,
    checkoutSessionId: session?.id || null,
    priceId: subscription?.items?.data?.[0]?.price?.id || session?.line_items?.data?.[0]?.price?.id || null,
    currentPeriodEnd: toIsoFromUnix(subscription?.current_period_end),
    checkedAt: new Date().toISOString(),
    lastEventAt: new Date().toISOString(),
    lastError: '',
  });
}

export async function persistEntitlementForUserIds(userIds = [], entitlementInput) {
  const supabase = getServiceSupabase();
  if (!supabase || !Array.isArray(userIds) || !userIds.length) return { ok: false, updated: 0 };

  const cleanIds = Array.from(new Set(userIds.filter(Boolean)));
  if (!cleanIds.length) return { ok: false, updated: 0 };

  const entitlement = normalizeEntitlement(entitlementInput);
  const { data, error } = await supabase
    .from('user_state')
    .select('user_id, state')
    .in('user_id', cleanIds);

  if (error) {
    return { ok: false, updated: 0, error };
  }

  for (const row of data || []) {
    const currentState = row?.state && typeof row.state === 'object' ? row.state : {};
    const nextState = {
      ...DEFAULT_STATE,
      ...currentState,
      entitlement,
      planTier: entitlement.verified ? 'pro' : 'basic',
      updatedAt: new Date().toISOString(),
    };
    const { error: updateError } = await supabase
      .from('user_state')
      .upsert({ user_id: row.user_id, state: nextState, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (updateError) {
      return { ok: false, updated: 0, error: updateError };
    }
  }

  return { ok: true, updated: cleanIds.length };
}

export async function findMatchingUserIdsByEntitlement(entitlementInput) {
  const supabase = getServiceSupabase();
  const entitlement = normalizeEntitlement(entitlementInput);
  if (!supabase) return [];

  const { data, error } = await supabase.from('user_state').select('user_id, state');
  if (error || !Array.isArray(data)) return [];

  const matches = data.filter((row) => {
    const existing = normalizeEntitlement(row?.state?.entitlement || {});
    return Boolean(
      (entitlement.subscriptionId && existing.subscriptionId === entitlement.subscriptionId) ||
      (entitlement.customerId && existing.customerId === entitlement.customerId) ||
      (entitlement.checkoutSessionId && existing.checkoutSessionId === entitlement.checkoutSessionId)
    );
  });

  return matches.map((row) => row.user_id).filter(Boolean);
}
