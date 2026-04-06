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
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [state, setState] = useState(DEFAULT_STATE);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('Saved locally');
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const saveTimer = useRef(null);
  const hydrated = useRef(false);

  const persistLocal = useCallback((next) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const pushRemote = useCallback(async (draftState, currentUser) => {
    if (!supabase || !currentUser) return;
    setSyncing(true);
    const payload = {
      user_id: currentUser.id,
      state: {
        ...draftState,
        updatedAt: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('user_state').upsert(payload, { onConflict: 'user_id' });
    if (!error) {
      setLastSyncedAt(payload.updated_at);
      setStatus('Synced just now');
    } else {
      setStatus('Saved locally');
      console.error(error);
    }
    setSyncing(false);
  }, [supabase]);

  const pullRemote = useCallback(async (currentUser, localState) => {
    if (!supabase || !currentUser) return localState;
    setStatus('Connecting…');
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
    setStatus('Synced just now');
    return remoteState;
  }, [pushRemote, supabase]);

  const scheduleRemoteSave = useCallback((nextState, currentUser) => {
    if (!currentUser) return;
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
      if (typeof window !== 'undefined' && user) {
        scheduleRemoteSave(next, user);
      }
      return next;
    });
  }, [persistLocal, scheduleRemoteSave, user]);

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
    setStatus('Saved locally');
  }, [supabase]);

  const refreshFromCloud = useCallback(async () => {
    if (!user) return;
    setSyncing(true);
    const refreshed = await pullRemote(user, state);
    setState(refreshed);
    persistLocal(refreshed);
    setSyncing(false);
  }, [persistLocal, pullRemote, state, user]);

  useEffect(() => {
    const local = readLocalState();
    setState(local);
    hydrated.current = true;
  }, []);

  const userRef = useRef(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!supabase || !hydrated.current) return;

    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      const currentUser = data?.session?.user || null;
      if (!mounted) return;
      setUser(currentUser);
      if (!currentUser) {
        setStatus('Saved locally');
        return;
      }
      const local = readLocalState();
      const merged = await pullRemote(currentUser, local);
      if (!mounted) return;
      setState(merged);
      persistLocal(merged);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user || null;
      if (!mounted) return;
      setUser(currentUser);
      if (!currentUser) {
        setStatus('Saved locally');
        return;
      }
      const local = readLocalState();
      const merged = await pullRemote(currentUser, local);
      if (!mounted) return;
      setState(merged);
      persistLocal(merged);
    });

    const poll = window.setInterval(() => {
      if (userRef.current) {
        refreshFromCloud();
      }
    }, 30000);

    return () => {
      mounted = false;
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
    supabaseReady: !!supabase
  };
}
