'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_STATE } from '@/lib/default-state';
import { derivePlanTier, normalizeEntitlement } from '@/lib/entitlements';
import { mergeState } from '@/lib/utils';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { readAlertMemory, readDigestMemory, writeAlertMemory, writeDigestMemory } from '@/lib/alert-engine';

const STORAGE_KEY = 'midnight-signal-local-state-v11.46';
const LEGACY_STORAGE_KEYS = ['midnight-signal-local-state-v11.45', 'midnight-signal-local-state-v11.44', 'midnight-signal-local-state-v11.43'];
const POLL_INTERVAL_MS = 60000;

function deriveDeviceLabel() {
  if (typeof navigator === 'undefined') return DEFAULT_STATE.deviceLabel;
  const platform = navigator.platform || navigator.userAgent || '';
  if (/android/i.test(platform)) return 'Android device';
  if (/iphone|ipad|ios/i.test(platform)) return 'iPhone or iPad';
  if (/mac/i.test(platform)) return 'Mac';
  if (/win/i.test(platform)) return 'Windows PC';
  return DEFAULT_STATE.deviceLabel;
}

function readLocalState() {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) || LEGACY_STORAGE_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean);
    const parsed = raw ? JSON.parse(raw) : {};
    return mergeState(DEFAULT_STATE, {
      ...parsed,
      deviceLabel: parsed?.deviceLabel || deriveDeviceLabel(),
      alertMemory: readAlertMemory(),
      alertDigestMemory: readDigestMemory(),
    });
  } catch {
    return mergeState(DEFAULT_STATE, {
      deviceLabel: deriveDeviceLabel(),
      alertMemory: readAlertMemory(),
      alertDigestMemory: readDigestMemory(),
    });
  }
}

export function useAccountSync() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [state, setState] = useState(DEFAULT_STATE);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('Saved locally');
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const saveTimer = useRef(null);
  const hydrated = useRef(false);
  const userRef = useRef(null);
  const stateRef = useRef(DEFAULT_STATE);
  const mountedRef = useRef(false);
  const pullInFlightRef = useRef(false);
  const pushInFlightRef = useRef(false);
  const pendingPushRef = useRef(null);

  const persistLocal = useCallback((next) => {
    if (typeof window === 'undefined') return;
    const normalizedEntitlement = normalizeEntitlement(next?.entitlement || DEFAULT_STATE.entitlement);
    const enriched = mergeState(DEFAULT_STATE, {
      ...next,
      entitlement: normalizedEntitlement,
      planTier: derivePlanTier(normalizedEntitlement, next?.planTier || DEFAULT_STATE.planTier),
      alertMemory: next?.alertMemory || readAlertMemory(),
      alertDigestMemory: next?.alertDigestMemory || readDigestMemory(),
      deviceLabel: next?.deviceLabel || deriveDeviceLabel(),
    });
    writeAlertMemory(enriched.alertMemory);
    writeDigestMemory(enriched.alertDigestMemory);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(enriched));
    window.localStorage.setItem('midnight-signal-plan', enriched.planTier || 'basic');
  }, []);

  const pushRemote = useCallback(async (draftState, currentUser) => {
    if (!supabase || !currentUser) return false;
    if (pushInFlightRef.current) {
      pendingPushRef.current = { draftState, currentUser };
      return false;
    }

    pushInFlightRef.current = true;
    setSyncing(true);

    try {
      const timestamp = new Date().toISOString();
      const normalizedEntitlement = normalizeEntitlement(draftState?.entitlement || DEFAULT_STATE.entitlement);
      const payload = {
        user_id: currentUser.id,
        state: mergeState(DEFAULT_STATE, {
          ...draftState,
          entitlement: normalizedEntitlement,
          planTier: derivePlanTier(normalizedEntitlement, draftState?.planTier || DEFAULT_STATE.planTier),
          deviceLabel: draftState?.deviceLabel || deriveDeviceLabel(),
          alertMemory: draftState?.alertMemory || readAlertMemory(),
          alertDigestMemory: draftState?.alertDigestMemory || readDigestMemory(),
          updatedAt: timestamp,
        }),
        updated_at: timestamp
      };

      const { error } = await supabase.from('user_state').upsert(payload, { onConflict: 'user_id' });
      if (error) {
        console.error(error);
        setStatus('Saved locally');
        return false;
      }

      if (mountedRef.current) {
        setLastSyncedAt(timestamp);
        setStatus('Synced just now');
      }
      return true;
    } finally {
      pushInFlightRef.current = false;
      if (!pullInFlightRef.current) {
        setSyncing(false);
      }

      const pending = pendingPushRef.current;
      pendingPushRef.current = null;
      if (pending && pending.currentUser?.id === currentUser.id) {
        void pushRemote(pending.draftState, pending.currentUser);
      }
    }
  }, [supabase]);

  const pullRemote = useCallback(async (currentUser, localStateOverride) => {
    if (!supabase || !currentUser) return localStateOverride || stateRef.current;
    if (pullInFlightRef.current) return stateRef.current;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return stateRef.current;
    }

    pullInFlightRef.current = true;
    setSyncing(true);
    setStatus((previous) => (previous === 'Synced just now' ? previous : 'Connecting…'));

    try {
      const localState = localStateOverride || stateRef.current;
      const { data, error } = await supabase
        .from('user_state')
        .select('state, updated_at')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (error) {
        console.error(error);
        setStatus('Saved locally');
        return localState;
      }

      if (!data) {
        await pushRemote(localState, currentUser);
        return localState;
      }

      const remoteEntitlement = normalizeEntitlement(data?.state?.entitlement || DEFAULT_STATE.entitlement);
      const remoteState = mergeState(DEFAULT_STATE, data.state || {}, {
        entitlement: remoteEntitlement,
        planTier: derivePlanTier(remoteEntitlement, data?.state?.planTier || DEFAULT_STATE.planTier),
      });
      writeAlertMemory(remoteState.alertMemory || {});
      writeDigestMemory(remoteState.alertDigestMemory || {});
      const remoteStamp = new Date(remoteState.updatedAt || data.updated_at || 0).getTime();
      const localStamp = new Date(localState.updatedAt || 0).getTime();

      if (localStamp > remoteStamp) {
        await pushRemote(localState, currentUser);
        return localState;
      }

      setLastSyncedAt(remoteState.updatedAt || data.updated_at || null);
      setStatus('Synced just now');
      return remoteState;
    } finally {
      pullInFlightRef.current = false;
      if (!pushInFlightRef.current) {
        setSyncing(false);
      }
    }
  }, [pushRemote, supabase]);

  const scheduleRemoteSave = useCallback((nextState, currentUser) => {
    if (typeof window === 'undefined' || !currentUser) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void pushRemote(nextState, currentUser);
    }, 900);
  }, [pushRemote]);

  const updateState = useCallback((updater) => {
    setState((previous) => {
      const resolved = typeof updater === 'function' ? updater(previous) : updater;
      const now = new Date().toISOString();
      const normalizedEntitlement = normalizeEntitlement(resolved?.entitlement || previous?.entitlement || DEFAULT_STATE.entitlement);
      const next = mergeState(DEFAULT_STATE, {
        ...resolved,
        entitlement: normalizedEntitlement,
        planTier: derivePlanTier(normalizedEntitlement, resolved?.planTier || previous?.planTier || DEFAULT_STATE.planTier),
        deviceLabel: resolved?.deviceLabel || previous?.deviceLabel || deriveDeviceLabel(),
        alertMemory: resolved?.alertMemory || previous?.alertMemory || readAlertMemory(),
        alertDigestMemory: resolved?.alertDigestMemory || previous?.alertDigestMemory || readDigestMemory(),
        updatedAt: now,
        lastViewedAt: now
      });
      stateRef.current = next;
      persistLocal(next);
      if (typeof window !== 'undefined' && userRef.current) {
        scheduleRemoteSave(next, userRef.current);
      }
      return next;
    });
  }, [persistLocal, scheduleRemoteSave]);

  const signInWithEmail = useCallback(async (email) => {
    if (!supabase) {
      setStatus('Saved locally');
      return { error: new Error('Missing Supabase credentials') };
    }
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    const result = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });
    if (!result.error) {
      setStatus('Magic link sent');
    }
    return result;
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    userRef.current = null;
    const local = readLocalState();
    persistLocal(local);
    setStatus('Saved locally');
    setSyncing(false);
  }, [supabase]);

  const refreshFromCloud = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    const refreshed = await pullRemote(currentUser, stateRef.current);
    stateRef.current = refreshed;
    setState(refreshed);
    persistLocal(refreshed);
  }, [persistLocal, pullRemote]);

  useEffect(() => {
    const local = readLocalState();
    stateRef.current = local;
    setState(local);
    persistLocal(local);
    hydrated.current = true;
  }, [persistLocal]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!supabase || !hydrated.current) return;

    let unsubscribed = false;

    const bootstrap = async (sessionUser) => {
      if (unsubscribed) return;
      setUser(sessionUser);
      userRef.current = sessionUser;

      if (!sessionUser) {
        setStatus('Saved locally');
        setSyncing(false);
        return;
      }

      const local = readLocalState();
      stateRef.current = local;
      const merged = await pullRemote(sessionUser, local);
      if (unsubscribed) return;
      stateRef.current = merged;
      setState(merged);
      persistLocal(merged);
    };

    supabase.auth.getSession().then(({ data }) => {
      void bootstrap(data?.session?.user || null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void bootstrap(session?.user || null);
    });

    const poll = window.setInterval(() => {
      if (!userRef.current) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (pullInFlightRef.current || pushInFlightRef.current) return;
      void refreshFromCloud();
    }, POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userRef.current && !pullInFlightRef.current && !pushInFlightRef.current) {
        void refreshFromCloud();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubscribed = true;
      listener.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(poll);
      window.clearTimeout(saveTimer.current);
    };
  }, [persistLocal, pullRemote, refreshFromCloud, supabase]);

  return {
    state,
    setState: updateState,
    user,
    status,
    syncing,
    lastSyncedAt,
    signInWithEmail,
    signOut,
    refreshFromCloud,
    supabaseReady: !!supabase
  };
}
