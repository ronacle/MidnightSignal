'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_STATE } from '@/lib/default-state';
import { mergeState } from '@/lib/utils';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

const STORAGE_KEY = 'midnight-signal-local-state-v11.9';

function readLocalState() {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return mergeState(DEFAULT_STATE, JSON.parse(raw));
  } catch {
    return DEFAULT_STATE;
  }
}

export function useAccountSync() {
  const supabase = useMemo(() => {
    try {
      return getSupabaseBrowser();
    } catch (error) {
      console.error(error);
      return null;
    }
  }, []);

  const [state, setState] = useState(DEFAULT_STATE);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('Local-only');
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [authFeedback, setAuthFeedback] = useState('');
  const [authError, setAuthError] = useState('');
  const [linkSentTo, setLinkSentTo] = useState('');

  const saveTimer = useRef(null);
  const hydrated = useRef(false);
  const mountedRef = useRef(false);
  const userRef = useRef(null);
  const stateRef = useRef(DEFAULT_STATE);
  const pullInFlight = useRef(false);
  const pushInFlight = useRef(false);

  const persistLocal = useCallback((next) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const clearAuthMessages = useCallback(() => {
    setAuthFeedback('');
    setAuthError('');
  }, []);

  const pushRemote = useCallback(async (draftState, currentUser) => {
    if (!supabase || !currentUser || pushInFlight.current) return;
    pushInFlight.current = true;
    setSyncing(true);
    const now = new Date().toISOString();
    const payload = {
      user_id: currentUser.id,
      state: {
        ...draftState,
        updatedAt: now
      },
      updated_at: now
    };

    const { error } = await supabase.from('user_state').upsert(payload, { onConflict: 'user_id' });
    if (!mountedRef.current) return;

    if (error) {
      setStatus('Sync error — using local fallback');
      setAuthError(error.message || 'Cloud sync failed.');
      console.error(error);
    } else {
      setLastSyncedAt(now);
      setStatus('Synced across devices');
    }

    pushInFlight.current = false;
    setSyncing(false);
  }, [supabase]);

  const pullRemote = useCallback(async (currentUser, localState) => {
    if (!supabase || !currentUser || pullInFlight.current) return localState;
    pullInFlight.current = true;
    setStatus('Checking cloud state…');

    const { data, error } = await supabase
      .from('user_state')
      .select('state, updated_at')
      .eq('user_id', currentUser.id)
      .maybeSingle();

    pullInFlight.current = false;

    if (error) {
      console.error(error);
      setStatus('Sync error — using local fallback');
      setAuthError(error.message || 'Could not load cloud state.');
      return localState;
    }

    const remoteState = mergeState(DEFAULT_STATE, data?.state || {});
    const remoteStamp = new Date(remoteState.updatedAt || data?.updated_at || 0).getTime();
    const localStamp = new Date(localState.updatedAt || 0).getTime();

    if (!data) {
      await pushRemote(localState, currentUser);
      return localState;
    }

    if (localStamp > remoteStamp) {
      await pushRemote(localState, currentUser);
      return localState;
    }

    setLastSyncedAt(remoteState.updatedAt || data?.updated_at || null);
    setStatus('Synced across devices');
    return remoteState;
  }, [pushRemote, supabase]);

  const scheduleRemoteSave = useCallback((nextState, currentUser) => {
    if (!currentUser || typeof window === 'undefined') return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      pushRemote(nextState, currentUser);
    }, 700);
  }, [pushRemote]);

  const updateState = useCallback((updater) => {
    setState((previous) => {
      const resolved = typeof updater === 'function' ? updater(previous) : updater;
      const next = {
        ...resolved,
        updatedAt: new Date().toISOString(),
        lastViewedAt: new Date().toISOString()
      };
      stateRef.current = next;
      persistLocal(next);
      if (userRef.current) {
        scheduleRemoteSave(next, userRef.current);
      }
      return next;
    });
  }, [persistLocal, scheduleRemoteSave]);

  const signInWithEmail = useCallback(async (email) => {
    clearAuthMessages();

    if (!supabase) {
      setStatus('Add Supabase keys to enable account sync');
      setAuthError('Missing Supabase credentials in this deployment.');
      return { error: new Error('Missing Supabase credentials') };
    }

    const normalized = email.trim().toLowerCase();
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;

    const result = await supabase.auth.signInWithOtp({
      email: normalized,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true
      }
    });

    if (result.error) {
      setAuthError(result.error.message);
      setStatus('Magic link failed');
    } else {
      setLinkSentTo(normalized);
      setAuthFeedback(`Sign-in link sent to ${normalized}. Open it on the device you want signed in.`);
      setStatus('Magic link sent');
    }

    return result;
  }, [clearAuthMessages, supabase]);

  const signOut = useCallback(async () => {
    clearAuthMessages();
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    userRef.current = null;
    setStatus('Local-only');
  }, [clearAuthMessages, supabase]);

  const refreshFromCloud = useCallback(async () => {
    if (!userRef.current) return;
    setSyncing(true);
    clearAuthMessages();
    const refreshed = await pullRemote(userRef.current, stateRef.current);
    if (!mountedRef.current) return;
    stateRef.current = refreshed;
    setState(refreshed);
    persistLocal(refreshed);
    setSyncing(false);
  }, [clearAuthMessages, persistLocal, pullRemote]);

  useEffect(() => {
    const local = readLocalState();
    stateRef.current = local;
    setState(local);
    hydrated.current = true;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!supabase || !hydrated.current) return;

    let cancelled = false;

    async function bootstrap() {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled || !mountedRef.current) return;

      if (error) {
        setAuthError(error.message || 'Could not restore session.');
        setStatus('Local-only');
        return;
      }

      const currentUser = data?.session?.user || null;
      setUser(currentUser);
      userRef.current = currentUser;

      if (!currentUser) {
        setStatus('Local-only');
        return;
      }

      setAuthFeedback('Signed in successfully. Sync is active on this device.');
      const local = readLocalState();
      const merged = await pullRemote(currentUser, local);
      if (cancelled || !mountedRef.current) return;
      stateRef.current = merged;
      setState(merged);
      persistLocal(merged);
    }

    bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;
      const currentUser = session?.user || null;
      setUser(currentUser);
      userRef.current = currentUser;

      if (!currentUser) {
        setStatus('Local-only');
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        setAuthFeedback('Signed in successfully. Sync is active on this device.');
      }

      const local = readLocalState();
      const merged = await pullRemote(currentUser, local);
      if (!mountedRef.current) return;
      stateRef.current = merged;
      setState(merged);
      persistLocal(merged);
    });

    const poll = window.setInterval(() => {
      if (userRef.current && !pullInFlight.current && !pushInFlight.current) {
        refreshFromCloud();
      }
    }, 45000);

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
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
    supabaseReady: !!supabase,
    authFeedback,
    authError,
    linkSentTo,
    clearAuthMessages
  };
}
