import type React from 'react';
import { Activity, ArrowRight, BarChart3, CheckCircle2, Clock3, History, ShieldCheck, Sparkles, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

const steps = [
  {
    title: '1. Signals are ranked from readable market data',
    copy: 'Midnight Signal compares trend, momentum, volatility, and market condition so the dashboard can surface one clear top setup instead of a wall of tickers.',
    icon: Activity
  },
  {
    title: '2. Confidence explains strength, not certainty',
    copy: 'The confidence score shows how much confirmation the setup has right now. It is a decision aid for learning and review, not a promise of profit.',
    icon: Target
  },
  {
    title: '3. Feedback turns the app into a learning loop',
    copy: 'When you mark whether you acted, ignored, won, lost, or stayed neutral, the product keeps count and makes the next confidence read more useful.',
    icon: CheckCircle2
  },
  {
    title: '4. Outcomes build proof over time',
    copy: 'Recent signal outcomes show the last few reads so you can judge whether the signal engine is behaving consistently before trusting the next alert.',
    icon: History
  },
  {
    title: '5. Signal depth explains what could break the read',
    copy: 'v23 adds factor-level confidence, a strongest/weakest reason callout, and an invalidation condition so every signal has a clear re-check point.',
    icon: AlertTriangle
  }
];

const outcomes = [
  { symbol: 'SOL', label: 'Worked', note: 'Bullish read followed through after momentum expanded.' },
  { symbol: 'ADA', label: 'Neutral', note: 'Signal stayed mixed and remained a watch setup.' },
  { symbol: 'BTC', label: 'Failed', note: 'Price moved against the original posture.' }
];

function ScreenshotFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-slate-800/80 bg-slate-950/80 p-3 shadow-2xl shadow-black/30">
      <div className="mb-3 flex items-center justify-between px-2 pt-1 text-[11px] uppercase tracking-[0.24em] text-slate-500">
        <span>{title}</span>
        <span className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-slate-700" />
          <span className="h-2 w-2 rounded-full bg-slate-700" />
          <span className="h-2 w-2 rounded-full bg-slate-700" />
        </span>
      </div>
      <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/90 p-5">{children}</div>
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-midnight text-white">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 rounded-[2rem] border border-slate-800 bg-slate-950/70 p-6 shadow-2xl shadow-black/30 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-signal-blue/30 bg-signal-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-signal-blue">
                <ShieldCheck className="h-3.5 w-3.5" /> Proof & Trust Layer
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">How Midnight Signal works</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                Midnight Signal is built to teach you why a setup is being shown, how much confirmation it has, and whether past reads have been useful. The dashboard is a signal-reading workflow, not financial advice. v23 adds the Signal Depth layer so each top read explains what is carrying it and what would weaken it.
              </p>
            </div>
            <Link href="/" className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-signal-blue hover:text-white">
              Back to dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {steps.map(step => {
            const Icon = step.icon;
            return (
              <article key={step.title} className="rounded-[1.75rem] border border-slate-800 bg-slate-950/70 p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-signal-blue/30 bg-signal-blue/10 text-signal-blue">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-white">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">{step.copy}</p>
              </article>
            );
          })}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <ScreenshotFrame title="Top Signal screenshot">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Top Signal</p>
                <h3 className="mt-2 text-4xl font-black text-white">SOL</h3>
                <p className="mt-1 text-sm text-signal-green">Bullish · strongest setup right now</p>
              </div>
              <div className="rounded-2xl border border-signal-green/30 bg-signal-green/10 px-4 py-3 text-right">
                <p className="text-xs text-slate-400">Confidence</p>
                <p className="text-3xl font-black text-signal-green">74%</p>
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-white"><Sparkles className="h-4 w-4 text-signal-amber" /> Why trust this?</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">This read combines trend, momentum, market condition, and recent feedback. Confidence is compared against the last session so you can see whether conviction is improving or fading.</p>
            </div>
          </ScreenshotFrame>

          <ScreenshotFrame title="Outcome history screenshot">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Recent signal outcomes</p>
                <h3 className="mt-2 text-xl font-bold text-white">Last 3 reads</h3>
              </div>
              <Clock3 className="h-5 w-5 text-slate-500" />
            </div>
            <div className="mt-5 space-y-3">
              {outcomes.map(outcome => (
                <div key={outcome.symbol} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-white">{outcome.symbol}</p>
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300">{outcome.label}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{outcome.note}</p>
                </div>
              ))}
            </div>
          </ScreenshotFrame>
        </div>



          <ScreenshotFrame title="Signal Depth screenshot">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Signal depth</p>
                <h3 className="mt-2 text-xl font-bold text-white">Why the read is strong</h3>
              </div>
              <span className="rounded-full border border-signal-blue/30 bg-signal-blue/10 px-3 py-1 text-xs font-black text-signal-blue">v23</span>
            </div>
            <div className="mt-5 space-y-3">
              {['Current movement', 'Strategy fit', 'Market context'].map((factor, index) => (
                <div key={factor} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-white">{factor}</p><p className="text-sm font-black text-signal-blue">{[82, 76, 64][index]}%</p></div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-signal-blue" style={{ width: [82, 76, 64][index] + '%' }} /></div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-signal-amber/30 bg-signal-amber/10 p-4">
              <p className="text-sm font-semibold text-signal-amber">Invalidation</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">The read gets weaker if price breaks the stated level or confidence drops below the review threshold.</p>
            </div>
          </ScreenshotFrame>

        <div className="grid gap-5 lg:grid-cols-3">
          <article className="rounded-[1.75rem] border border-slate-800 bg-slate-950/70 p-5">
            <TrendingUp className="mb-4 h-6 w-6 text-signal-green" />
            <h2 className="text-lg font-semibold text-white">Previous vs current confidence</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Session continuity shows whether the top read is strengthening or cooling compared with your last visit.</p>
          </article>
          <article className="rounded-[1.75rem] border border-slate-800 bg-slate-950/70 p-5">
            <BarChart3 className="mb-4 h-6 w-6 text-signal-blue" />
            <h2 className="text-lg font-semibold text-white">Progress count</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Feedback count turns trust into a measurable habit: more marked outcomes means better context.</p>
          </article>
          <article className="rounded-[1.75rem] border border-slate-800 bg-slate-950/70 p-5">
            <ShieldCheck className="mb-4 h-6 w-6 text-signal-amber" />
            <h2 className="text-lg font-semibold text-white">Built-in caution</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Every signal remains educational. The product explains the setup so you can make your own risk decision.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
