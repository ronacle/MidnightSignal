import { normalizeSavedProfiles } from '@/lib/profiles';
import { derivePlanTier, normalizeEntitlement } from '@/lib/entitlements';
import { normalizeSignalStreamPreferences } from '@/lib/alert-engine';

export function mergeState(base, incoming) {
  const next = incoming || {};
  const alerts = Array.isArray(next.alerts)
    ? next.alerts.filter(Boolean).map((alert) => ({
        ...alert,
        symbol: String(alert.symbol || '').toUpperCase(),
      }))
    : base.alerts;
  const recentAlertEvents = Array.isArray(next.recentAlertEvents)
    ? next.recentAlertEvents.filter(Boolean).slice(0, 25)
    : base.recentAlertEvents;
  const entitlement = normalizeEntitlement(next.entitlement || base.entitlement);
  const planTier = derivePlanTier(entitlement, next.planTier || base.planTier || 'basic');

  return {
    ...base,
    ...next,
    entitlement,
    planTier,
    profileId: next.profileId || base.profileId || null,
    profileName: next.profileName || base.profileName || 'My setup',
    watchlist: Array.isArray(next.watchlist) && next.watchlist.length
      ? [...new Set(next.watchlist.map((item) => String(item).toUpperCase()))]
      : base.watchlist,
    savedProfiles: normalizeSavedProfiles(next.savedProfiles || base.savedProfiles),
    alerts,
    recentAlertEvents,
    signalStreamPreferences: normalizeSignalStreamPreferences(next.signalStreamPreferences || base.signalStreamPreferences),
    alertMemory: next.alertMemory && typeof next.alertMemory === 'object'
      ? {
          assetMap: next.alertMemory.assetMap || {},
          triggerLog: next.alertMemory.triggerLog || {},
        }
      : base.alertMemory,
    alertDigestMemory: next.alertDigestMemory && typeof next.alertDigestMemory === 'object'
      ? {
          queued: Array.isArray(next.alertDigestMemory.queued) ? next.alertDigestMemory.queued.slice(0, 20) : [],
          lastSentAt: next.alertDigestMemory.lastSentAt || null,
        }
      : base.alertDigestMemory,
  };
}

export function formatTime(value) {
  if (!value) return 'Not yet synced';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  } catch {
    return 'Not yet synced';
  }
}

export function formatPrice(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  if (value >= 1000) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(value);
  }
  if (value >= 1) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(value);
  }
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 6
  }).format(value);
}

export function formatPct(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatCompactNumber(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: value >= 1_000_000_000 ? 2 : 1,
  }).format(value);
}

export function getConvictionTier(value) {
  if (value >= 75) return 'High conviction';
  if (value >= 55) return 'Moderate conviction';
  return 'Cautious conviction';
}
