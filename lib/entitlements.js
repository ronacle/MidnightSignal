export const ENTITLEMENT_STATUS = {
  inactive: 'inactive',
  pending: 'pending',
  active: 'active',
  canceled: 'canceled',
  past_due: 'past_due',
  unpaid: 'unpaid',
  unknown: 'unknown',
};

export function normalizeEntitlement(input) {
  const next = input && typeof input === 'object' ? input : {};
  const status = String(next.status || ENTITLEMENT_STATUS.inactive).toLowerCase();
  const normalizedStatus = Object.values(ENTITLEMENT_STATUS).includes(status)
    ? status
    : ENTITLEMENT_STATUS.unknown;

  return {
    status: normalizedStatus,
    verified: Boolean(next.verified),
    source: next.source || 'local',
    customerId: next.customerId || null,
    subscriptionId: next.subscriptionId || null,
    checkoutSessionId: next.checkoutSessionId || null,
    priceId: next.priceId || null,
    currentPeriodEnd: next.currentPeriodEnd || null,
    checkedAt: next.checkedAt || null,
    lastEventAt: next.lastEventAt || null,
    lastError: next.lastError || '',
  };
}

export function derivePlanTier(entitlement, fallbackPlan = 'basic') {
  const normalized = normalizeEntitlement(entitlement);
  if (normalized.verified && normalized.status === ENTITLEMENT_STATUS.active) {
    return 'pro';
  }
  return fallbackPlan === 'pro' ? 'basic' : 'basic';
}
