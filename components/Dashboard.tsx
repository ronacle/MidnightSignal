'use client';

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronDown, Clock3, DatabaseZap, Info, Lock, Moon, RefreshCw, Settings2, Sparkles, Star, Volume2, VolumeX, Zap } from 'lucide-react';
import { AssetSignal, Experience, TraderMode, buildSignals, formatPrice } from '@/lib/signals';
import { BUILD } from '@/lib/build';
import { MarketCondition, TrustSnapshot, getMarketSnapshot } from '@/lib/market';

type Stored = { agreed?: boolean; mode?: TraderMode; experience?: Experience; currency?: string; sound?: boolean; watchlist?: string[]; selected?: string; lastTop?: AssetSignal };
const storageKey = 'midnight-signal-v13-1';
const currencies = ['USD', 'CAD', 'EUR'];

function readStored(): Stored {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; }
}
function writeStored(next: Stored) { if (typeof window !== 'undefined') localStorage.setItem(storageKey, JSON.stringify(next)); }
function labelClass(label: AssetSignal['label']) {
  if (label === 'Bullish') return 'text-signal-green bg-signal-green/10 border-signal-green/30';
  if (label === 'Bearish') return 'text-signal-red bg-signal-red/10 border-signal-red/30';
  return 'text-signal-amber bg-signal-amber/10 border-signal-amber/30';
}
function conditionCopy(condition: MarketCondition) {
  return condition === 'volatile' ? 'Fast moves, wider risk bands' : condition === 'active' ? 'Readable movement, good for learning' : 'Slower tape, fewer strong confirmations';
}

export default function Dashboard() {
  const [agreed, setAgreed] = useState(false);
  const [confirmedLearning, setConfirmedLearning] = useState(false);
  const [confirmedRisk, setConfirmedRisk] = useState(false);
  const [mode, setMode] = useState<TraderMode>('swing');
  const [experience, setExperience] = useState<Experience>('beginner');
  const [currency, setCurrency] = useState('USD');
  const [sound, setSound] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>(['ADA', 'MID', 'BTC']);
  const [selected, setSelected] = useState('ADA');
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [signalChanged, setSignalChanged] = useState(false);
  const [snapshot, setSnapshot] = useState<TrustSnapshot>(() => {
    const signals = buildSignals('swing');
    return { signals, source: 'Fallback demo data', updatedAt: new Date().toISOString(), marketCondition: 'active', confidenceReason: `${signals[0].symbol} leads because trend and momentum are currently the strongest combined readings.` };
  });
  const [loadingLive, setLoadingLive] = useState(false);
  const [lastTop, setLastTop] = useState<AssetSignal | undefined>();

  useEffect(() => {
    const stored = readStored();
    setAgreed(Boolean(stored.agreed));
    setMode(stored.mode || 'swing');
    setExperience(stored.experience || 'beginner');
    setCurrency(stored.currency || 'USD');
    setSound(Boolean(stored.sound));
    setWatchlist(stored.watchlist?.length ? stored.watchlist : ['ADA', 'MID', 'BTC']);
    setSelected(stored.selected || 'ADA');
    setLastTop(stored.lastTop);
  }, []);

  useEffect(() => { writeStored({ agreed, mode, experience, currency, sound, watchlist, selected, lastTop: snapshot.signals[0] }); }, [agreed, mode, experience, currency, sound, watchlist, selected, snapshot]);

  async function refreshMarket() {
    setLoadingLive(true);
    const next = await getMarketSnapshot(mode, currency, lastTop);
    setSnapshot(next);
    setLastTop(next.signals[0]);
    setLoadingLive(false);
  }

  useEffect(() => { refreshMarket(); }, [mode, currency]);

  const signals = snapshot.signals;
  const pinned = useMemo(() => signals.filter(s => watchlist.includes(s.symbol)), [signals, watchlist]);
  const top = signals[0];
  const active = signals.find(s => s.symbol === selected) || top;

  useEffect(() => {
    setSignalChanged(true);
    const id = setTimeout(() => setSignalChanged(false), 900);
    return () => clearTimeout(id);
  }, [top.symbol, top.confidence, mode]);

  function toggleWatch(symbol: string) { setWatchlist(list => list.includes(symbol) ? list.filter(item => item !== symbol) : [symbol, ...list]); }
  function acceptAgreement() { if (confirmedLearning && confirmedRisk) setAgreed(true); }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      {!agreed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <section className="card max-w-xl rounded-3xl p-6">
            <div className="mb-4 flex items-center gap-3"><span className="rounded-2xl bg-midnight-500/20 p-3 text-signal-blue"><Moon /></span><div><h1 className="text-2xl font-bold">Agreement of Understanding</h1><p className="text-sm text-slate-300">Midnight Signal is educational market guidance, not financial advice.</p></div></div>
            <div className="space-y-3 text-sm text-slate-300">
              <label className="flex gap-3 rounded-2xl border border-white/10 p-3"><input type="checkbox" checked={confirmedLearning} onChange={e => setConfirmedLearning(e.target.checked)} /> I understand this app is for learning and signal context.</label>
              <label className="flex gap-3 rounded-2xl border border-white/10 p-3"><input type="checkbox" checked={confirmedRisk} onChange={e => setConfirmedRisk(e.target.checked)} /> I understand crypto markets are risky and I make my own decisions.</label>
            </div>
            <button onClick={acceptAgreement} disabled={!confirmedLearning || !confirmedRisk} className="mt-5 w-full rounded-2xl bg-signal-blue px-4 py-3 font-bold text-midnight-950 disabled:cursor-not-allowed disabled:opacity-40">Agree and Enter</button>
          </section>
        </div>
      )}

      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-signal-blue/20 bg-signal-blue/10 px-3 py-1 text-xs font-semibold text-signal-blue"><Sparkles size={14} /> v{BUILD.version} · {BUILD.name}</div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">What’s the signal tonight? <span className="text-signal-blue">🌙</span></h1>
          <p className="mt-2 max-w-2xl text-slate-300">Explainable market posture with live-data awareness, fallback protection, and clearer trust cues.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300"><strong className="text-white">Build {BUILD.version}</strong><br />Created {BUILD.createdAt}</div>
      </header>

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
        <TrustCard icon={<Clock3 size={18} />} label="Data last updated" value={new Date(snapshot.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} detail="Refreshes when mode or currency changes" />
        <TrustCard icon={<Zap size={18} />} label="Market condition" value={snapshot.marketCondition} detail={conditionCopy(snapshot.marketCondition)} />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[.85fr_1.15fr]">
        <div className="card rounded-3xl p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Pinned Signals</h2><span className="text-xs text-slate-400">Watchlist first</span></div>
          <div className="space-y-3">{pinned.map(item => <SignalRow key={item.symbol} signal={item} active={item.symbol === active.symbol} currency={currency} onSelect={() => setSelected(item.symbol)} onStar={() => toggleWatch(item.symbol)} starred />)}</div>
        </div>

        <div className={`card rounded-3xl p-5 ${signalChanged ? 'animate-pulseSignal' : ''}`}>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-[.2em] text-signal-blue">Tonight’s Top Signal</p><h2 className="text-3xl font-black">{top.name} <span className="text-slate-400">{top.symbol}</span></h2></div><span className={`rounded-full border px-4 py-2 text-sm font-bold ${labelClass(top.label)}`}>{top.label}</span></div>
          <div className="grid gap-4 md:grid-cols-[.8fr_1.2fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[.04] p-4"><p className="text-sm text-slate-400">Confidence</p><div className="mt-1 text-5xl font-black">{top.confidence}%</div><div className="mt-4 h-3 rounded-full bg-white/10"><div className="h-3 rounded-full bg-signal-blue" style={{ width: `${top.confidence}%` }} /></div><p className="mt-4 text-sm text-slate-300">{top.why}</p><p className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">{snapshot.confidenceReason}</p></div>
            <Breakdown signal={top} />
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div className="card rounded-3xl p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Top 20 Signals</h2><button onClick={refreshMarket} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"><RefreshCw size={14} className={loadingLive ? 'animate-spin' : ''} /> Refresh data</button></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{signals.map(item => <AssetCard key={item.symbol} signal={item} currency={currency} starred={watchlist.includes(item.symbol)} active={item.symbol === active.symbol} onSelect={() => setSelected(item.symbol)} onStar={() => toggleWatch(item.symbol)} />)}</div>
        </div>

        <aside className="space-y-4">
          <div className="card rounded-3xl p-5"><h2 className="mb-3 text-xl font-bold">Selected Detail</h2><div className="mb-4 flex items-center justify-between"><div><p className="text-2xl font-black">{active.symbol}</p><p className="text-slate-400">{active.name}</p></div><span className={`rounded-full border px-3 py-1 text-xs font-bold ${labelClass(active.label)}`}>{active.label}</span></div><Breakdown signal={active} compact /></div>
          <div className="card rounded-3xl p-5"><div className="mb-3 flex items-center gap-2"><Lock className="text-signal-blue" /><h2 className="text-xl font-bold">Pro Insight Preview</h2></div><div className="rounded-3xl border border-white/10 bg-white/[.04] p-4"><p className="font-bold text-white">Unlock deeper insights</p><p className="mt-1 text-sm text-slate-300">Deeper MTF reasoning, historical confidence drift, and best-entry education.</p><div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">MTF reasoning · habit layer · ritual recap</div></div><button className="mt-5 w-full rounded-2xl border border-signal-blue/40 bg-signal-blue/10 px-4 py-3 font-bold text-signal-blue hover:bg-signal-blue/20">Unlock deeper insights</button></div>
        </aside>
      </section>

      <button onClick={() => setGlossaryOpen(true)} className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-2xl bg-signal-blue px-4 py-3 font-bold text-midnight-950 shadow-glow"><BookOpen size={18} /> Glossary</button>
      {glossaryOpen && <Glossary onClose={() => setGlossaryOpen(false)} />}
      <footer className="py-8 text-center text-xs text-slate-500">Midnight Signal v{BUILD.version} · {snapshot.source} · Educational use only · Not financial advice</footer>
    </main>
  );
}

function BriefCard({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-3xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs uppercase tracking-[.16em] text-slate-400">{label}</p><p className="mt-2 text-lg font-bold">{value}</p><p className="mt-1 text-sm text-slate-300">{detail}</p></div>; }
function TrustCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) { return <div className="card rounded-3xl p-4"><div className="mb-2 flex items-center gap-2 text-signal-blue">{icon}<span className="text-xs font-bold uppercase tracking-[.16em]">{label}</span></div><p className="text-xl font-black capitalize">{value}</p><p className="mt-1 text-sm text-slate-300">{detail}</p></div>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) { return <label className="block"><span className="mb-1 block text-xs uppercase tracking-[.16em] text-slate-400">{label}</span><div className="relative"><select value={value} onChange={e => onChange(e.target.value)} className="w-full appearance-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 capitalize text-white outline-none ring-signal-blue/0 transition focus:ring-4">{options.map(option => <option key={option} value={option} className="bg-midnight-900">{option}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 text-slate-400" /></div></label>; }
function SignalRow({ signal, currency, active, starred, onSelect, onStar }: { signal: AssetSignal; currency: string; active: boolean; starred: boolean; onSelect: () => void; onStar: () => void }) { return <div className={`flex items-center justify-between rounded-2xl border p-3 ${active ? 'border-signal-blue/50 bg-signal-blue/10' : 'border-white/10 bg-white/[.04]'}`}><button onClick={onSelect} className="text-left"><p className="font-bold">{signal.symbol} <span className="text-sm font-normal text-slate-400">{signal.name}</span></p><p className="text-sm text-slate-300">{formatPrice(signal.price, currency)} · {signal.confidence}%</p></button><button onClick={onStar} className="rounded-xl p-2 text-signal-amber hover:bg-white/10"><Star fill={starred ? 'currentColor' : 'none'} /></button></div>; }
function AssetCard({ signal, currency, active, starred, onSelect, onStar }: { signal: AssetSignal; currency: string; active: boolean; starred: boolean; onSelect: () => void; onStar: () => void }) { return <div className={`group rounded-3xl border p-4 transition hover:-translate-y-0.5 hover:bg-white/[.07] ${active ? 'border-signal-blue/50 bg-signal-blue/10' : 'border-white/10 bg-white/[.04]'}`}><div className="flex items-start justify-between"><button onClick={onSelect} className="text-left"><p className="text-lg font-black">{signal.symbol}</p><p className="text-sm text-slate-400">{signal.name}</p></button><button onClick={onStar} className="rounded-xl p-2 text-signal-amber transition group-hover:scale-110"><Star fill={starred ? 'currentColor' : 'none'} /></button></div><div className="mt-4 flex items-end justify-between"><div><p className="font-bold">{formatPrice(signal.price, currency)}</p><p className={signal.change24h >= 0 ? 'text-sm text-signal-green' : 'text-sm text-signal-red'}>{signal.change24h >= 0 ? '+' : ''}{signal.change24h}%</p></div><span className={`rounded-full border px-3 py-1 text-xs font-bold ${labelClass(signal.label)}`}>{signal.confidence}%</span></div></div>; }
function Breakdown({ signal, compact = false }: { signal: AssetSignal; compact?: boolean }) { const rows = [['Momentum', signal.momentum], ['Trend', signal.trend], ['Volatility', signal.volatility], ['MTF Weight', signal.mtf]] as const; return <div className="rounded-3xl border border-white/10 bg-white/[.04] p-4"><div className="mb-3 flex items-center gap-2"><Zap className="text-signal-blue" size={18} /><h3 className="font-bold">Signal Breakdown</h3></div><div className="space-y-3">{rows.map(([label, value]) => <div key={label}><div className="mb-1 flex justify-between text-sm"><span className="text-slate-300">{label}</span><span className="font-bold">{value}%</span></div><div className="h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-signal-blue" style={{ width: `${value}%` }} /></div></div>)}</div>{!compact && <p className="mt-4 rounded-2xl border border-signal-blue/20 bg-signal-blue/10 p-3 text-sm text-slate-200"><Info className="mr-2 inline text-signal-blue" size={16} />Heuristic education signal: trend + momentum + volatility + multi-timeframe posture.</p>}</div>; }
function Glossary({ onClose }: { onClose: () => void }) { const terms = [['Signal', 'A simplified read of current market posture.'], ['Confidence', 'How strongly the heuristic agrees with itself.'], ['Market condition', 'A plain-English read of whether the current tape is calm, active, or volatile.'], ['Data source', 'Shows whether live CoinGecko prices loaded or the fallback dataset is protecting the app.'], ['Momentum', 'How much energy price action appears to have.'], ['Trend', 'Whether the broader direction supports the setup.'], ['Volatility', 'How unstable or jumpy the market appears.'], ['MTF', 'Multi-timeframe weighting across short and longer views.']]; return <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm"><aside className="h-full w-full max-w-md overflow-auto border-l border-white/10 bg-midnight-950 p-6 shadow-soft"><div className="mb-5 flex items-center justify-between"><h2 className="text-2xl font-black">Floating Glossary</h2><button onClick={onClose} className="rounded-xl border border-white/10 px-3 py-2">Close</button></div><div className="space-y-3">{terms.map(([term, definition]) => <div key={term} className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><p className="font-bold text-signal-blue">{term}</p><p className="mt-1 text-sm text-slate-300">{definition}</p></div>)}</div></aside></div>; }
