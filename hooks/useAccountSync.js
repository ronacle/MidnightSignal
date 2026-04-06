'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_STATE } from '@/lib/default-state';
import { mergeState } from '@/lib/utils';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

const STORAGE_KEY = 'midnight-signal-local-state-v11.8';

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
  const [clientError, setClientError] = useState(null);
  const supabase = useMemo(() => {
    try {
      return getSupabaseBrowser();
    } catch (error) {
      setClientError(error);
      return null;
    }
  }, []);

  const [state, setState] = useState(DEFAULT_STATE);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(clientError ? 'Supabase config missing' : 'Local-only');
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const saveTimer = useRef(null);
  const hydrated = useRef(false);
  const mountedRef = useRef(false);
  const userRef = useRef(null);
  const syncInFlight = useRef(false);

  const persistLocal = useCallback((next) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const pushRemote = useCallback(async (draftState, currentUser) => {
    if (!supabase || !currentUser || syncInFlight.current) return;
    syncInFlight.current = true;
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

    if (!error) {
      setLastSyncedAt(payload.updated_at);
      setStatus('Synced across devices');
    } else {
      setStatus('Sync error — using local fallback');
      console.error('pushRemote failed', error);
    }

    syncInFlight.current = false;
    setSyncing(false);
  }, [supabase]);

  const pullRemote = useCallback(async (currentUser, localState) => {
    if (!supabase || !currentUser || syncInFlight.current) return localState;
    syncInFlight.current = true;
    setStatus('Checking cloud state…');

    const { data, error } = await supabase
      .from('user_state')
      .select('state, updated_at')
      .eq('user_id', currentUser.id)
      .maybeSingle();

    if (!mountedRef.current) return localState;

    if (error) {
      console.error('pullRemote failed', error);
      setStatus('Sync error — using local fallback');
      syncInFlight.current = false;
      return localState;
    }

    const remoteState = mergeState(DEFAULT_STATE, data?.state || {});
    const remoteStamp = new Date(remoteState.updatedAt || data?.updated_at || 0).getTime();
    const localStamp = new Date(localState.updatedAt || 0).getTime();

    if (!data || localStamp > remoteStamp) {
      syncInFlight.current = false;
      await pushRemote(localState, currentUser);
      return localState;
    }

    setLastSyncedAt(remoteState.updatedAt || data?.updated_at || null);
    setStatus('Synced across devices');
    syncInFlight.current = false;
    return remoteState;
  }, [pushRemote, supabase]);

  const scheduleRemoteSave = useCallback((nextState, currentUser) => {
    if (!currentUser || typeof window === 'undefined') return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      pushRemote(nextState, currentUser);
    }, 650);
  }, [pushRemote]);

  const updateState = useCallback((updater) => {
    setState((previous) => {
      const resolved = typeof updater === 'function' ? updater(previous) : updater;
      const next = {
        ...resolved,
        updatedAt: new Date().toISOString(),
        lastViewedAt: new Date().toISOString()
      };
      persistLocal(next);
      if (typeof window !== 'undefined' && userRef.current) {
        scheduleRemoteSave(next, userRef.current);
      }
      return next;
    });
  }, [persistLocal, scheduleRemoteSave]);

  const signInWithEmail = useCallback(async (email) => {
    if (!supabase) {
      const error = new Error(clientError?.message || 'Missing Supabase credentials');
      setStatus('Add Supabase keys to enable account sync');
      return { error };
    }

    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
    const result = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });

    if (!result.error) {
      setStatus('Magic link sent');
    }
    return result;
  }, [clientError, supabase]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    userRef.current = null;
    setUser(null);
    setStatus('Local-only');
  }, [supabase]);

  const refreshFromCloud = useCallback(async () => {
    if (!userRef.current || syncInFlight.current) return;
    setSyncing(true);
    const refreshed = await pullRemote(userRef.current, state);
    if (!mountedRef.current) return;
    setState(refreshed);
    persistLocal(refreshed);
    setSyncing(false);
  }, [persistLocal, pullRemote, state]);

  useEffect(() => {
    const local = readLocalState();
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
    if (!supabase || !hydrated.current) {
      if (clientError) setStatus('Supabase config missing');
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled || !mountedRef.current) return;
      if (error) {
        console.error('getSession failed', error);
        setStatus('Auth session error');
        return;
      }

      const currentUser = data.session?.user || null;
      userRef.current = currentUser;
      setUser(currentUser);

      if (!currentUser) {
        setStatus('Local-only');
        return;
      }

      const local = readLocalState();
      const merged = await pullRemote(currentUser, local);
      if (cancelled || !mountedRef.current) return;
      setState(merged);
      persistLocal(merged);
    }

    bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled || !mountedRef.current) return;
      const currentUser = session?.user || null;
      userRef.current = currentUser;
      setUser(currentUser);

      if (!currentUser) {
        setStatus('Local-only');
        return;
      }

      const local = readLocalState();
      const merged = await pullRemote(currentUser, local);
      if (cancelled || !mountedRef.current) return;
      setState(merged);
      persistLocal(merged);
    });

    const poll = typeof window !== 'undefined'
      ? window.setInterval(() => {
          if (userRef.current && !syncInFlight.current) {
            refreshFromCloud();
          }
        }, 30000)
      : null;

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
      if (poll) window.clearInterval(poll);
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [clientError, persistLocal, pullRemote, refreshFromCloud, supabase]);

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
    clientError
  };
}
