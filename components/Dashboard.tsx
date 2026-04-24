'use client';

import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronDown, Clock3, DatabaseZap, Info, Lock, Mail, Moon, RefreshCw, Settings2, Sparkles, Star, Trophy, UserRound, Volume2, VolumeX, Zap } from 'lucide-react';
import { AssetSignal, Experience, TraderMode, buildSignals, formatPrice } from '@/lib/signals';
import { BUILD } from '@/lib/build';
import { MarketCondition, TrustSnapshot, getMarketSnapshot } from '@/lib/market';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type AccessMode = 'unset' | 'guest' | 'early';
type Plan = 'free' | 'pro';
type AuthUser = { id: string; email: string } | null;
type Stored = {
  agreed?: boolean;
  accessMode?: AccessMode;
  earlyEmail?: string;
  mode?: TraderMode;
  experience?: Experience;
  currency?: string;
  sound?: boolean;
  watchlist?: string[];
  selected?: string;
  lastTop?: AssetSignal;
  visits?: number;
  ritual?: RitualState;
};

type RitualState = { topSignal: boolean; confidence: boolean; watchlist: boolean; market: boolean };

const storageKey = 'midnight-signal-v13-3-3';
const currencies = ['USD', 'CAD', 'EUR'];
const defaultRitual: RitualState = { topSignal: false, confidence: false, watchlist: false, market: false };

function readStored(): Stored {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; }
}
function writeStored(next: Stored) {
  if (typeof window !== 'undefined') localStorage.setItem(storageKey, JSON.stringify(next));
}
function labelClass(label: AssetSignal['label']) {
  if (label === 'Bullish') return 'text-signal-green bg-signal-green/10 border-signal-green/30';
  if (label === 'Bearish') return 'text-signal-red bg-signal-red/10 border-signal-red/30';
  return 'text-signal-amber bg-signal-amber/10 border-signal-amber/30';
}
function conditionCopy(condition: MarketCondition) {
  return condition === 'volatile' ? 'Fast moves, wider risk bands' : condition === 'active' ? 'Readable movement, good for learning' : 'Slower tape, fewer strong confirmations';
}
function journeyLevel(visits: number, watchlistCount: number, completed: number) {
  const score = visits * 12 + watchlistCount * 8 + completed * 10;
  if (score >= 90) return { title: 'Advanced Signal Reader', stage: 4, progress: 100, note: 'You are building a repeatable signal-reading habit.' };
  if (score >= 60) return { title: 'Confident Reader', stage: 3, progress: 76, note: 'You are connecting confidence, trend, and market condition.' };
  if (score >= 30) return { title: 'Signal Reader', stage: 2, progress: 48, note: 'You are starting to recognize why signals move.' };
  return { title: 'Beginner', stage: 1, progress: 22, note: 'Start with the top signal, confidence, and glossary.' };
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [confirmedLearning, setConfirmedLearning] = useState(false);
  const [confirmedRisk, setConfirmedRisk] = useState(false);
  const [accessMode, setAccessMode] = useState<AccessMode>('unset');
  const [earlyEmail, setEarlyEmail] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authUser, setAuthUser] = useState<AuthUser>(null);
  const [plan, setPlan] = useState<Plan>('free');
  const [authMessage, setAuthMessage] = useState('');
  const [upgrading, setUpgrading] = useState(false);
  const [checkoutSyncing, setCheckoutSyncing] = useState(false);
  const checkoutReturnHandled = useRef(false);
  const [mode, setMode] = useState<TraderMode>('swing');
  const [experience, setExperience] = useState<Experience>('beginner');
  const [currency, setCurrency] = useState('USD');
  const [sound, setSound] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>(['ADA', 'MID', 'BTC']);
  const [selected, setSelected] = useState('ADA');
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [signalChanged, setSignalChanged] = useState(false);
  const [visits, setVisits] = useState(1);
  const [ritual, setRitual] = useState<RitualState>(defaultRitual);
  const [snapshot, setSnapshot] = useState<TrustSnapshot>(() => {
    const signals = buildSignals('swing');
    return { signals, source: 'Fallback demo data', updatedAt: BUILD.deployedAt, marketCondition: 'active', confidenceReason: `${signals[0].symbol} leads because trend and momentum are currently the strongest combined readings.` };
  });
  const [loadingLive, setLoadingLive] = useState(false);
  const [lastTop, setLastTop] = useState<AssetSignal | undefined>();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const stored = readStored();
    setAgreed(Boolean(stored.agreed));
    setAccessMode(stored.accessMode || 'unset');
    setEarlyEmail(stored.earlyEmail || '');
    setMode(stored.mode || 'swing');
    setExperience(stored.experience || 'beginner');
    setCurrency(stored.currency || 'USD');
    setSound(Boolean(stored.sound));
    setWatchlist(stored.watchlist?.length ? stored.watchlist : ['ADA', 'MID', 'BTC']);
    setSelected(stored.selected || 'ADA');
    setLastTop(stored.lastTop);
    setVisits((stored.visits || 0) + 1);
    setRitual(stored.ritual || defaultRitual);
  }, []);

  useEffect(() => {
    writeStored({ agreed, accessMode, earlyEmail, mode, experience, currency, sound, watchlist, selected, lastTop: snapshot.signals[0], visits, ritual });
  }, [agreed, accessMode, earlyEmail, mode, experience, currency, sound, watchlist, selected, snapshot, visits, ritual]);

  async function refreshMarket() {
    setLoadingLive(true);
    const next = await getMarketSnapshot(mode, currency, lastTop);
    setSnapshot(next);
    setLastTop(next.signals[0]);
    setLoadingLive(false);
  }

  useEffect(() => { refreshMarket(); }, [mode, currency]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthMessage('Supabase env vars are not set yet. Guest mode still works.');
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (user?.email) {
        setAuthUser({ id: user.id, email: user.email });
        setAccessMode('early');
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      setAuthUser(user?.email ? { id: user.id, email: user.email } : null);
      if (user?.email) setAccessMode('early');
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function refreshPlan(): Promise<Plan> {
    const email = authUser?.email || earlyEmail || authEmail;
    const userId = authUser?.id;
    if (!email && !userId) { setPlan('free'); return 'free'; }
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email })
      });
      const data = await response.json().catch(() => ({}));
      const nextPlan: Plan = data.plan === 'pro' ? 'pro' : 'free';
      setPlan(nextPlan);
      if (nextPlan === 'pro') setAuthMessage('Pro active — deeper signal intelligence is unlocked.');
      return nextPlan;
    } catch {
      setPlan('free');
      return 'free';
    }
  }

  useEffect(() => { refreshPlan(); }, [authUser, earlyEmail, authEmail]);

  useEffect(() => {
    if (typeof window === 'undefined' || checkoutReturnHandled.current) return;
    const params = new URLSearchParams(window.location.search);

    if (params.get('checkout') === 'success') {
      checkoutReturnHandled.current = true;
      setCheckoutSyncing(true);
      setAuthMessage('Finalizing your Pro access…');
      window.history.replaceState({}, '', window.location.pathname);

      let attempts = 0;
      let interval: ReturnType<typeof setInterval> | undefined;
      const syncPlan = async () => {
        attempts += 1;
        const nextPlan = await refreshPlan();
        if (nextPlan === 'pro') {
          setCheckoutSyncing(false);
          setAuthMessage('Pro active — deeper signal intelligence is unlocked.');
          if (interval) clearInterval(interval);
          return;
        }
        if (attempts >= 10) {
          setCheckoutSyncing(false);
          setAuthMessage('Payment received. Pro is still syncing — refresh once or try Sync Plan in a few seconds.');
          if (interval) clearInterval(interval);
        }
      };

      syncPlan();
      interval = setInterval(syncPlan, 1500);
      return () => { if (interval) clearInterval(interval); };
    }

    if (params.get('checkout') === 'cancelled') {
      checkoutReturnHandled.current = true;
      setAuthMessage('Checkout cancelled. Your Free Plan is still active.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [authUser, earlyEmail, authEmail]);

  const signals = snapshot.signals;
  const pinned = useMemo(() => signals.filter(s => watchlist.includes(s.symbol)), [signals, watchlist]);
  const top = signals[0];
  const active = signals.find(s => s.symbol === selected) || top;
  const completedRitual = Object.values(ritual).filter(Boolean).length;
  const journey = journeyLevel(visits, watchlist.length, completedRitual);

  useEffect(() => {
    setSignalChanged(true);
    const id = setTimeout(() => setSignalChanged(false), 900);
    return () => clearTimeout(id);
  }, [top.symbol, top.confidence, mode]);

  function markRitual(key: keyof RitualState) { setRitual(r => ({ ...r, [key]: true })); }
  function toggleWatch(symbol: string) {
    setWatchlist(list => list.includes(symbol) ? list.filter(item => item !== symbol) : [symbol, ...list]);
    markRitual('watchlist');
  }
  function selectSignal(symbol: string) { setSelected(symbol); markRitual('topSignal'); }
  function acceptAgreement() { if (confirmedLearning && confirmedRisk) setAgreed(true); }
  function joinEarlyAccess() { setAccessMode('early'); }
  async function sendMagicLink() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setAuthMessage('Add Supabase env vars in Vercel to enable magic links.'); return; }
    const email = authEmail || earlyEmail;
    if (!email.includes('@')) { setAuthMessage('Enter a valid email first.'); return; }
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined } });
    setAuthMessage(error ? error.message : 'Magic link sent. Check your email to sign in.');
  }
  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    setAuthUser(null);
    setPlan('free');
  }
  async function upgradeToPro() {
    setUpgrading(true);
    setAuthMessage('');
    try {
      const checkoutEmail = authUser?.email || earlyEmail || authEmail;
      if (!checkoutEmail || !checkoutEmail.includes('@')) {
        setAuthMessage('Enter an email first so Pro access can sync after checkout.');
        setUpgrading(false);
        return;
      }
      if (!earlyEmail) setEarlyEmail(checkoutEmail);
      writeStored({ ...readStored(), earlyEmail: checkoutEmail, accessMode: 'early' });
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: checkoutEmail, userId: authUser?.id })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Checkout failed with status ${response.status}`);
      if (data.url) window.location.href = data.url;
      else throw new Error('Stripe checkout did not return a URL. Check STRIPE_PRICE_ID and NEXT_PUBLIC_SITE_URL / NEXT_PUBLIC_APP_URL.');
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Stripe checkout is not configured yet.');
    } finally {
      setUpgrading(false);
    }
  }

  if (!mounted) {
    return (
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-5 sm:px-6 lg:px-8" suppressHydrationWarning>
        <section className="card rounded-3xl p-6">
          <p className="text-sm font-semibold uppercase tracking-[.2em] text-signal-blue">Midnight Signal</p>
          <h1 className="mt-2 text-3xl font-black">Loading signal dashboard…</h1>
          <p className="mt-2 text-slate-300">Preparing your saved session and live market layer.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      {!agreed && <AgreementModal confirmedLearning={confirmedLearning} confirmedRisk={confirmedRisk} setConfirmedLearning={setConfirmedLearning} setConfirmedRisk={setConfirmedRisk} onAccept={acceptAgreement} />}
      {agreed && accessMode === 'unset' && <AccessModal earlyEmail={earlyEmail} setEarlyEmail={setEarlyEmail} onGuest={() => setAccessMode('guest')} onJoin={joinEarlyAccess} />}

      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-signal-blue/20 bg-signal-blue/10 px-3 py-1 text-xs font-semibold text-signal-blue"><Sparkles size={14} /> v{BUILD.version} · {BUILD.name}</div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">What’s the signal tonight? <span className="text-signal-blue">🌙</span></h1>
          <p className="mt-2 max-w-2xl text-slate-300">Explainable market posture with trust cues, a daily ritual, and a clear path from guest to early access.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300"><strong className={plan === 'pro' ? 'text-signal-green' : 'text-white'}>{checkoutSyncing ? 'Finalizing Pro Access…' : plan === 'pro' ? 'Pro Unlocked' : authUser ? `Signed in · ${plan.toUpperCase()}` : accessMode === 'early' ? 'Early Access' : 'Guest Mode'}</strong><br />Build {BUILD.version}</div>
      </header>

      {checkoutSyncing && (
        <section className="mb-4 rounded-3xl border border-signal-blue/30 bg-signal-blue/10 p-4 text-sm text-slate-100">
          <strong className="text-signal-blue">Finalizing your Pro access…</strong> Stripe confirmed your checkout. Midnight Signal is waiting for the webhook to finish syncing your Supabase plan.
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-[1.35fr_.85fr]">
        <div className="card rounded-3xl p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-[.2em] text-signal-blue">Midnight Signal Panel</p><h2 className="text-2xl font-bold">Tonight’s Brief</h2></div><button onClick={() => setSound(!sound)} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-200 hover:bg-white/10" aria-label="Toggle sound">{sound ? <Volume2 /> : <VolumeX />}</button></div>
          <div className="grid gap-4 md:grid-cols-3">
            <BriefCard label="Market posture" value={top.label} detail={`${top.symbol} leads with ${top.confidence}% confidence`} />
            <BriefCard label="Since your last visit" value="Confidence tracked" detail={snapshot.confidenceReason} />
            <BriefCard label="Learning focus" value={experience === 'beginner' ? 'Clean Learning' : 'Pro View'} detail="Glossary stays available without clutter" />
          </div>
        </div>

        <div className="card rounded-3xl p-5">
          <div className="mb-4 flex items-center gap-2"><Settings2 className="text-signal-blue" /><h2 className="text-xl font-bold">Session Settings</h2></div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <Select label="Trader type" value={mode} onChange={v => setMode(v as TraderMode)} options={['scalp', 'swing', 'position']} />
            <Select label="Experience" value={experience} onChange={v => setExperience(v as Experience)} options={['beginner', 'pro']} />
            <Select label="Currency" value={currency} onChange={setCurrency} options={currencies} />
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <TrustCard icon={<DatabaseZap size={18} />} label="Data source" value={snapshot.source} detail={snapshot.source === 'CoinGecko live' ? 'Live prices loaded successfully' : 'Safe fallback is active'} />
        <TrustCard icon={<Clock3 size={18} />} label="Data last updated" value={new Date(snapshot.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} detail="Refreshes when mode or currency changes" onClick={() => { refreshMarket(); markRitual('market'); }} action={loadingLive ? 'Refreshing...' : 'Refresh'} />
        <TrustCard icon={<Zap size={18} />} label="Market condition" value={snapshot.marketCondition} detail={conditionCopy(snapshot.marketCondition)} onClick={() => markRitual('market')} />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[.85fr_1.15fr]">
        <div className="space-y-4">
          <div className="card rounded-3xl p-5">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Pinned Signals</h2><span className="text-xs text-slate-400">Watchlist first</span></div>
            <div className="space-y-3">{pinned.map(item => <SignalRow key={item.symbol} signal={item} active={item.symbol === active.symbol} currency={currency} onSelect={() => selectSignal(item.symbol)} onStar={() => toggleWatch(item.symbol)} starred />)}</div>
          </div>
          <AuthPanel authUser={authUser} plan={plan} authEmail={authEmail} setAuthEmail={setAuthEmail} authMessage={authMessage} onMagicLink={sendMagicLink} onSignOut={signOut} onUpgrade={upgradeToPro} upgrading={upgrading} checkoutSyncing={checkoutSyncing} />
          <JourneyCard visits={visits} journey={journey} completed={completedRitual} />
          <RitualCard ritual={ritual} mark={markRitual} />
        </div>

        <div className={`card rounded-3xl p-5 ${signalChanged ? 'animate-pulseSignal' : ''}`}>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-[.2em] text-signal-blue">Tonight’s Top Signal</p><h2 className="text-4xl font-black">{top.symbol} <span className="text-lg font-medium text-slate-400">{top.name}</span></h2></div><span className={`rounded-full border px-4 py-2 text-sm font-bold ${labelClass(top.label)}`}>{top.label}</span></div>
          <p className="mb-4 rounded-2xl border border-signal-blue/20 bg-signal-blue/10 p-4 text-slate-100">{top.why}</p>
          <Breakdown signal={top} />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ProLock isPro={plan === 'pro'} onUpgrade={upgradeToPro} title="Advanced MTF Weighting" body="Compare short, swing, and position posture in one combined Pro view." />
            <ProLock isPro={plan === 'pro'} onUpgrade={upgradeToPro} title="Signal History" body="Track how confidence changed over time and what triggered the shift." />
          </div>
        </div>
      </section>

      <section className="mt-4 card rounded-3xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black">Top 20 Signal Grid</h2><p className="text-sm text-slate-400">Tap a card to open its signal breakdown. Star it to pin it.</p></div><button onClick={() => setGlossaryOpen(true)} className="rounded-2xl border border-signal-blue/30 bg-signal-blue/10 px-4 py-3 font-bold text-signal-blue"><BookOpen className="mr-2 inline" size={18} /> Glossary</button></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">{signals.map(signal => <AssetCard key={signal.symbol} signal={signal} currency={currency} active={signal.symbol === active.symbol} starred={watchlist.includes(signal.symbol)} onSelect={() => selectSignal(signal.symbol)} onStar={() => toggleWatch(signal.symbol)} />)}</div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_.8fr]">
        <div className="card rounded-3xl p-5"><h2 className="text-2xl font-black">Selected Signal: {active.symbol}</h2><p className="mt-1 text-slate-300">{active.why}</p><div className="mt-4"><Breakdown signal={active} compact /></div></div>
        <div className="card rounded-3xl p-5"><h2 className="text-2xl font-black">Founder Pro Access</h2><p className="mt-2 text-slate-300">$9/month founder plan. Enter an email, checkout through Stripe, and Midnight Signal will sync Pro from Supabase.</p><button onClick={plan === 'pro' ? refreshPlan : upgradeToPro} className="mt-4 w-full rounded-2xl border border-signal-blue/30 bg-signal-blue/10 px-4 py-3 font-bold text-signal-blue">{checkoutSyncing ? 'Finalizing Pro access...' : plan === 'pro' ? 'Pro Active' : upgrading ? 'Opening Checkout...' : 'Upgrade to Pro'}</button></div>
      </section>

      {glossaryOpen && <Glossary onClose={() => setGlossaryOpen(false)} />}
      <footer className="py-8 text-center text-xs text-slate-500">Midnight Signal v{BUILD.version} · {snapshot.source} · Educational use only · Not financial advice</footer>
    </main>
  );
}

function AgreementModal({ confirmedLearning, confirmedRisk, setConfirmedLearning, setConfirmedRisk, onAccept }: { confirmedLearning: boolean; confirmedRisk: boolean; setConfirmedLearning: (v: boolean) => void; setConfirmedRisk: (v: boolean) => void; onAccept: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"><section className="card max-w-xl rounded-3xl p-6"><div className="mb-4 flex items-center gap-3"><span className="rounded-2xl bg-midnight-500/20 p-3 text-signal-blue"><Moon /></span><div><h1 className="text-2xl font-bold">Agreement of Understanding</h1><p className="text-sm text-slate-300">Midnight Signal is educational market guidance, not financial advice.</p></div></div><div className="space-y-3 text-sm text-slate-300"><label className="flex gap-3 rounded-2xl border border-white/10 p-3"><input type="checkbox" checked={confirmedLearning} onChange={e => setConfirmedLearning(e.target.checked)} /> I understand this app is for learning and signal context.</label><label className="flex gap-3 rounded-2xl border border-white/10 p-3"><input type="checkbox" checked={confirmedRisk} onChange={e => setConfirmedRisk(e.target.checked)} /> I understand crypto markets are risky and I make my own decisions.</label></div><button onClick={onAccept} disabled={!confirmedLearning || !confirmedRisk} className="mt-5 w-full rounded-2xl bg-signal-blue px-4 py-3 font-bold text-midnight-950 disabled:cursor-not-allowed disabled:opacity-40">Agree and Enter</button></section></div>;
}
function AccessModal({ earlyEmail, setEarlyEmail, onGuest, onJoin }: { earlyEmail: string; setEarlyEmail: (v: string) => void; onGuest: () => void; onJoin: () => void }) {
  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-4 backdrop-blur-md"><section className="card max-w-2xl rounded-3xl p-6"><div className="mb-4 flex items-center gap-3"><span className="rounded-2xl bg-signal-blue/10 p-3 text-signal-blue"><Mail /></span><div><h1 className="text-2xl font-black">Join Early Access</h1><p className="text-sm text-slate-300">Save your place for real accounts, Pro insights, and founder pricing.</p></div></div><input value={earlyEmail} onChange={e => setEarlyEmail(e.target.value)} placeholder="email@example.com" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-4 focus:ring-signal-blue/20" /><div className="mt-4 grid gap-3 sm:grid-cols-2"><button onClick={onJoin} disabled={!earlyEmail.includes('@')} className="rounded-2xl bg-signal-blue px-4 py-3 font-bold text-midnight-950 disabled:opacity-40">Join Early Access</button><button onClick={onGuest} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-white">Continue as Guest</button></div></section></div>;
}
function BriefCard({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-3xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs uppercase tracking-[.16em] text-slate-400">{label}</p><p className="mt-2 text-lg font-bold">{value}</p><p className="mt-1 text-sm text-slate-300">{detail}</p></div>; }
function TrustCard({ icon, label, value, detail, onClick, action }: { icon: React.ReactNode; label: string; value: string; detail: string; onClick?: () => void; action?: string }) { return <div className="card rounded-3xl p-4"><div className="mb-2 flex items-center gap-2 text-signal-blue">{icon}<span className="text-xs font-bold uppercase tracking-[.16em]">{label}</span></div><p className="text-xl font-black capitalize">{value}</p><p className="mt-1 text-sm text-slate-300">{detail}</p>{onClick && <button onClick={onClick} className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10">{action || 'Mark reviewed'}</button>}</div>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) { return <label className="block"><span className="mb-1 block text-xs uppercase tracking-[.16em] text-slate-400">{label}</span><div className="relative"><select value={value} onChange={e => onChange(e.target.value)} className="w-full appearance-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 capitalize text-white outline-none ring-signal-blue/0 transition focus:ring-4">{options.map(option => <option key={option} value={option} className="bg-midnight-900">{option}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 text-slate-400" /></div></label>; }
function SignalRow({ signal, currency, active, starred, onSelect, onStar }: { signal: AssetSignal; currency: string; active: boolean; starred: boolean; onSelect: () => void; onStar: () => void }) { return <div className={`flex items-center justify-between rounded-2xl border p-3 ${active ? 'border-signal-blue/50 bg-signal-blue/10' : 'border-white/10 bg-white/[.04]'}`}><button onClick={onSelect} className="text-left"><p className="font-bold">{signal.symbol} <span className="text-sm font-normal text-slate-400">{signal.name}</span></p><p className="text-sm text-slate-300">{formatPrice(signal.price, currency)} · {signal.confidence}%</p></button><button onClick={onStar} className="rounded-xl p-2 text-signal-amber hover:bg-white/10"><Star fill={starred ? 'currentColor' : 'none'} /></button></div>; }
function AssetCard({ signal, currency, active, starred, onSelect, onStar }: { signal: AssetSignal; currency: string; active: boolean; starred: boolean; onSelect: () => void; onStar: () => void }) { return <div className={`group rounded-3xl border p-4 transition hover:-translate-y-0.5 hover:bg-white/[.07] ${active ? 'border-signal-blue/50 bg-signal-blue/10' : 'border-white/10 bg-white/[.04]'}`}><div className="flex items-start justify-between"><button onClick={onSelect} className="text-left"><p className="text-lg font-black">{signal.symbol}</p><p className="text-sm text-slate-400">{signal.name}</p></button><button onClick={onStar} className="rounded-xl p-2 text-signal-amber transition group-hover:scale-110"><Star fill={starred ? 'currentColor' : 'none'} /></button></div><div className="mt-4 flex items-end justify-between"><div><p className="font-bold">{formatPrice(signal.price, currency)}</p><p className={signal.change24h >= 0 ? 'text-sm text-signal-green' : 'text-sm text-signal-red'}>{signal.change24h >= 0 ? '+' : ''}{signal.change24h}%</p></div><span className={`rounded-full border px-3 py-1 text-xs font-bold ${labelClass(signal.label)}`}>{signal.confidence}%</span></div></div>; }
function Breakdown({ signal, compact = false }: { signal: AssetSignal; compact?: boolean }) { const rows = [['Momentum', signal.momentum], ['Trend', signal.trend], ['Volatility', signal.volatility], ['MTF Weight', signal.mtf]] as const; return <div className="rounded-3xl border border-white/10 bg-white/[.04] p-4"><div className="mb-3 flex items-center gap-2"><Zap className="text-signal-blue" size={18} /><h3 className="font-bold">Signal Breakdown</h3></div><div className="space-y-3">{rows.map(([label, value]) => <div key={label}><div className="mb-1 flex justify-between text-sm"><span className="text-slate-300">{label}</span><span className="font-bold">{value}%</span></div><div className="h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-signal-blue" style={{ width: `${value}%` }} /></div></div>)}</div>{!compact && <p className="mt-4 rounded-2xl border border-signal-blue/20 bg-signal-blue/10 p-3 text-sm text-slate-200"><Info className="mr-2 inline text-signal-blue" size={16} />Heuristic education signal: trend + momentum + volatility + multi-timeframe posture.</p>}</div>; }
function ProLock({ title, body, isPro, onUpgrade }: { title: string; body: string; isPro: boolean; onUpgrade: () => void }) { return <div className="rounded-3xl border border-white/10 bg-white/[.04] p-4"><div className={`mb-2 flex items-center gap-2 ${isPro ? 'text-signal-green' : 'text-signal-amber'}`}>{isPro ? <CheckCircle2 size={18} /> : <Lock size={18} />}<p className="font-bold">{title}</p></div><p className="text-sm text-slate-300">{isPro ? `${body} Unlocked for your Pro account.` : body}</p>{isPro ? <span className="mt-3 inline-block rounded-xl border border-signal-green/30 bg-signal-green/10 px-3 py-2 text-xs font-bold text-signal-green">Pro unlocked</span> : <button onClick={onUpgrade} className="mt-3 rounded-xl border border-signal-amber/30 bg-signal-amber/10 px-3 py-2 text-xs font-bold text-signal-amber">Unlock deeper signal intelligence</button>}</div>; }
function AuthPanel({ authUser, plan, authEmail, setAuthEmail, authMessage, onMagicLink, onSignOut, onUpgrade, upgrading, checkoutSyncing }: { authUser: AuthUser; plan: Plan; authEmail: string; setAuthEmail: (v: string) => void; authMessage: string; onMagicLink: () => void; onSignOut: () => void; onUpgrade: () => void; upgrading: boolean; checkoutSyncing: boolean }) { return <div className="card rounded-3xl p-5"><div className="mb-3 flex items-center gap-2 text-signal-blue"><UserRound size={18} /><h2 className="text-xl font-bold">Account + Pro</h2></div>{authUser ? <><p className="text-sm text-slate-300">Signed in as <strong className="text-white">{authUser.email}</strong></p><p className="mt-2 text-2xl font-black">Plan: <span className={plan === 'pro' ? 'text-signal-green' : ''}>{checkoutSyncing ? 'SYNCING' : plan.toUpperCase()}</span></p><div className="mt-4 grid gap-2 sm:grid-cols-2"><button onClick={onUpgrade} disabled={plan === 'pro' || checkoutSyncing} className="rounded-2xl bg-signal-blue px-4 py-3 font-bold text-midnight-950 disabled:opacity-40">{checkoutSyncing ? 'Finalizing...' : plan === 'pro' ? 'Pro Active' : upgrading ? 'Opening...' : 'Upgrade $9/mo'}</button><button onClick={onSignOut} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-bold">Sign out</button></div></> : <><p className="text-sm text-slate-300">Enter the same email you use at checkout. Magic link is optional; Pro can sync by email.</p><input value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="email@example.com" className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-4 focus:ring-signal-blue/20" /><div className="mt-3 grid gap-2 sm:grid-cols-2"><button onClick={onMagicLink} className="rounded-2xl bg-signal-blue px-4 py-3 font-bold text-midnight-950">Send Magic Link</button><button onClick={onUpgrade} disabled={checkoutSyncing} className="rounded-2xl border border-signal-amber/30 bg-signal-amber/10 px-4 py-3 font-bold text-signal-amber disabled:opacity-50">{checkoutSyncing ? 'Finalizing...' : upgrading ? 'Opening...' : 'Upgrade $9/mo'}</button></div></>}{authMessage && <p className="mt-3 text-xs text-slate-400">{authMessage}</p>}</div>; }
function JourneyCard({ visits, journey, completed }: { visits: number; journey: { title: string; stage: number; progress: number; note: string }; completed: number }) { return <div className="card rounded-3xl p-5"><div className="mb-3 flex items-center gap-2 text-signal-blue"><Trophy size={18} /><h2 className="text-xl font-bold">Your Signal Journey</h2></div><p className="text-2xl font-black">{journey.title}</p><p className="mt-1 text-sm text-slate-300">Stage {journey.stage} · {visits} visits · {completed}/4 ritual steps</p><div className="mt-4 h-3 rounded-full bg-white/10"><div className="h-3 rounded-full bg-signal-blue" style={{ width: `${journey.progress}%` }} /></div><p className="mt-3 text-sm text-slate-300">{journey.note}</p></div>; }
function RitualCard({ ritual, mark }: { ritual: RitualState; mark: (key: keyof RitualState) => void }) { const items: [keyof RitualState, string][] = [['topSignal', 'Check Top Signal'], ['confidence', 'Review Confidence'], ['watchlist', 'Scan Watchlist'], ['market', 'Read Market Condition']]; return <div className="card rounded-3xl p-5"><div className="mb-3 flex items-center gap-2 text-signal-blue"><CheckCircle2 size={18} /><h2 className="text-xl font-bold">Tonight’s Ritual</h2></div><div className="space-y-2">{items.map(([key, label]) => <button key={key} onClick={() => mark(key)} className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left ${ritual[key] ? 'border-signal-green/30 bg-signal-green/10 text-signal-green' : 'border-white/10 bg-white/[.04] text-slate-200'}`}><span>{label}</span><CheckCircle2 size={18} /></button>)}</div></div>; }
function Glossary({ onClose }: { onClose: () => void }) { const terms = [['Signal', 'A simplified read of current market posture.'], ['Confidence', 'How strongly the heuristic agrees with itself.'], ['Journey', 'A lightweight progression system that rewards repeated learning behavior.'], ['Daily Ritual', 'A repeatable checklist that teaches users what to review before reacting.'], ['Market condition', 'A plain-English read of whether the current tape is calm, active, or volatile.'], ['Data source', 'Shows whether live CoinGecko prices loaded or the fallback dataset is protecting the app.'], ['Momentum', 'How much energy price action appears to have.'], ['MTF', 'Multi-timeframe weighting across short and longer views.']]; return <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm"><aside className="h-full w-full max-w-md overflow-auto border-l border-white/10 bg-midnight-950 p-6 shadow-soft"><div className="mb-5 flex items-center justify-between"><h2 className="text-2xl font-black">Floating Glossary</h2><button onClick={onClose} className="rounded-xl border border-white/10 px-3 py-2">Close</button></div><div className="space-y-3">{terms.map(([term, definition]) => <div key={term} className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><p className="font-bold text-signal-blue">{term}</p><p className="mt-1 text-sm text-slate-300">{definition}</p></div>)}</div></aside></div>; }
