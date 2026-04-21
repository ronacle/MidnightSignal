export const ENTITLEMENT_STATUS = {
  inactive: 'inactive',
  pending: 'pending',
  active: 'active',
  canceled: 'canceled',
  past_due: 'past_due',
  unpaid: 'unpaid',
  incomplete: 'incomplete',
  incomplete_expired: 'incomplete_expired',
  trialing: 'trialing',
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
  if (normalized.verified && [ENTITLEMENT_STATUS.active, ENTITLEMENT_STATUS.trialing].includes(normalized.status)) {
    return 'pro';
  }
  return fallbackPlan === 'pro' ? 'basic' : 'basic';
}

export function shouldRefreshEntitlement(entitlement, maxAgeMs = 15 * 60 * 1000) {
  const normalized = normalizeEntitlement(entitlement);
  if (normalized.source !== 'stripe') return false;
  if (!normalized.subscriptionId && !normalized.customerId && !normalized.checkoutSessionId) return false;
  if (!normalized.checkedAt) return true;
  const checkedAt = new Date(normalized.checkedAt).getTime();
  if (!Number.isFinite(checkedAt)) return true;
  return Date.now() - checkedAt >= maxAgeMs;
}


export const FREE_ALERT_RULE_LIMIT = 2;
export const PRO_ALERT_RULE_LIMIT = 999;

export function getAlertRuleLimit(planTier = 'basic') {
  return planTier === 'pro' ? PRO_ALERT_RULE_LIMIT : FREE_ALERT_RULE_LIMIT;
}

export function hasUnlimitedAlerts(planTier = 'basic') {
  return planTier === 'pro';
}
