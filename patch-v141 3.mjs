import fs from 'fs';
let s = fs.readFileSync('components/Dashboard.tsx', 'utf8');
s = s.replace('v{BUILD.version} · Layout Polish','v{BUILD.version} · Conversion Layer');
s = s.replace('One clear read, proof up front, and deeper detail only when you need it.','One clear read, proof up front, and a sharper upgrade path when you want the full edge.');
s = s.replace('Midnight Signal v{BUILD.version} · Layout Polish + Product Clarity','Midnight Signal v{BUILD.version} · Conversion Layer');
s = s.replace('<h2 className="text-xl font-bold">Personalized Watchlists</h2>','<h2 className="text-xl font-bold">Alerts + Daily Recap</h2>');
const anchor = `      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <TrustCard icon={<DatabaseZap size={18} />} label="Data source" value={snapshot.source} detail={snapshot.source === 'CoinGecko live' ? 'Live prices loaded successfully' : 'Safe fallback is active'} />
        <TrustCard icon={<Clock3 size={18} />} label="Data last updated" value={new Date(snapshot.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} detail="Refreshes when mode or currency changes" onClick={() => { refreshMarket(); markRitual('market'); }} action={loadingLive ? 'Refreshing...' : 'Refresh'} />
        <TrustCard icon={<Zap size={18} />} label="Market condition" value={snapshot.marketCondition} detail={conditionCopy(snapshot.marketCondition)} onClick={() => markRitual('market')} />
      </section>

      <PerformanceHero summary={performanceSummary} results={performanceResults} analytics={proAnalytics} source={performanceSource} isPro={plan === 'pro'} onUpgrade={upgradeToPro} />`;
const replacement = `      <ConversionLayer summary={performanceSummary} analytics={proAnalytics} isPro={plan === 'pro'} upgrading={upgrading || checkoutSyncing} onUpgrade={upgradeToPro} />

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <TrustCard icon={<DatabaseZap size={18} />} label="Data source" value={snapshot.source} detail={snapshot.source === 'CoinGecko live' ? 'Live prices loaded successfully' : 'Safe fallback is active'} />
        <TrustCard icon={<Clock3 size={18} />} label="Data last updated" value={new Date(snapshot.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} detail="Refreshes when mode or currency changes" onClick={() => { refreshMarket(); markRitual('market'); }} action={loadingLive ? 'Refreshing...' : 'Refresh'} />
        <TrustCard icon={<Zap size={18} />} label="Market condition" value={snapshot.marketCondition} detail={conditionCopy(snapshot.marketCondition)} onClick={() => markRitual('market')} />
      </section>

      <PerformanceHero summary={performanceSummary} results={performanceResults} analytics={proAnalytics} source={performanceSource} isPro={plan === 'pro'} onUpgrade={upgradeToPro} />`;
if (!s.includes(anchor)) throw new Error('anchor not found');
s = s.replace(anchor, replacement);
const brief = `function BriefCard({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-3xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs uppercase tracking-[.16em] text-slate-400">{label}</p><p className="mt-2 text-lg font-bold">{value}</p><p className="mt-1 text-sm text-slate-300">{detail}</p></div>; }\n`;
const comp = `function ConversionLayer({ summary, analytics, isPro, upgrading, onUpgrade }: { summary: ReturnType<typeof summarizePerformance>; analytics: ReturnType<typeof buildProPerformanceAnalytics>; isPro: boolean; upgrading: boolean; onUpgrade: () => void }) {
  const window7d = analytics.windows[0]?.summary || summary;
  const decisiveText = \`${'${summary.wins}'} wins / ${'${summary.losses}'} losses\`;
  const streakText = summary.currentStreak > 0 ? \`${'${summary.currentStreak}'} ${'${outcomeLabel(summary.currentStreakType).toLowerCase()}'} streak\` : 'No streak yet';
  const cta = \`Unlock full performance - ${'${summary.winRate}'}% win rate over ${'${Math.max(summary.totalSignals, 1)}'} tracked signals\`;

  if (isPro) {
    return <section className="mt-4 rounded-3xl border border-signal-green/25 bg-signal-green/10 p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-signal-green/30 bg-signal-green/10 px-3 py-1 text-xs font-bold text-signal-green"><CheckCircle2 size={14} /> Pro conversion layer unlocked</div><h2 className="text-2xl font-black">Full performance is live on this account.</h2><p className="mt-2 max-w-3xl text-sm text-slate-300">You can see complete receipts, confidence accuracy, symbol breakdowns, and 7/30/90 day windows.</p></div><div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]"><BriefCard label="Tracked edge" value={\`${'${summary.winRate}'}%\`} detail={decisiveText} /><BriefCard label="Avg return" value={\`${'${summary.avgReturn >= 0 ? \'+\' : \'\'}'}${'${summary.avgReturn}'}%\`} detail="Across tracked receipts" /><BriefCard label="Best receipt" value={\`${'${summary.best.symbol}'} ${'${summary.best.returnPct >= 0 ? \'+\' : \'\'}'}${'${summary.best.returnPct}'}%\`} detail="Visible in full history" /></div></div></section>;
  }

  return <section className="mt-4 overflow-hidden rounded-3xl border border-signal-amber/30 bg-gradient-to-br from-signal-amber/15 via-white/[.04] to-signal-blue/10 p-5"><div className="grid gap-5 lg:grid-cols-[1fr_.85fr] lg:items-center"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-signal-amber/30 bg-signal-amber/10 px-3 py-1 text-xs font-bold text-signal-amber"><Lock size={14} /> Pro preview</div><h2 className="text-3xl font-black">{cta}</h2><p className="mt-2 max-w-2xl text-sm text-slate-300">Free keeps the top signal and limited receipts. Pro unlocks the full conversion layer: deeper analytics, complete history, expanded watchlists, and instant alert intelligence.</p><div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1 text-xs font-bold text-slate-200">7D: {window7d.winRate}% win rate</span><span className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1 text-xs font-bold text-slate-200">{streakText}</span><span className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1 text-xs font-bold text-slate-200">Confidence accuracy: {summary.confidenceAccuracy}%</span></div><button onClick={onUpgrade} disabled={upgrading} className="mt-5 rounded-2xl bg-signal-amber px-5 py-3 font-black text-midnight-950 shadow-soft disabled:cursor-wait disabled:opacity-60">{upgrading ? 'Opening Pro...' : 'Unlock full performance'}</button><p className="mt-3 text-xs text-slate-500">Educational use only. Simulated or tracked performance does not guarantee future results.</p></div><div className="relative rounded-3xl border border-white/10 bg-black/20 p-4"><div className="premium-lock blur-[2px] opacity-70"><div className="grid gap-3"><BriefCard label="30D win rate" value={\`${'${analytics.windows[1]?.summary.winRate ?? summary.winRate}'}%\`} detail="Pro-only time window" /><BriefCard label="By confidence" value={\`${'${analytics.byConfidenceTier[0]?.winRate ?? summary.confidenceAccuracy}'}%\`} detail={analytics.byConfidenceTier[0]?.label || 'High-confidence tier'} /><BriefCard label="By symbol" value={analytics.bySymbol[0]?.label || summary.best.symbol} detail={\`${'${analytics.bySymbol[0]?.winRate ?? summary.winRate}'}% symbol win rate\`} /></div></div><div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-midnight-950/45 p-4 text-center backdrop-blur-[1px]"><div><Lock className="mx-auto mb-2 text-signal-amber" /><p className="font-black text-white">Advanced analytics locked</p><p className="mt-1 text-xs text-slate-300">Show the value. Lock the depth.</p></div></div></div></div></section>;
}
`;
if (!s.includes(brief)) throw new Error('brief anchor not found');
s = s.replace(brief, brief + comp);
fs.writeFileSync('components/Dashboard.tsx', s);
fs.writeFileSync('lib/build.ts', "export const BUILD = { version: '14.1.0', name: 'Conversion Layer', deployedAt: '2026-04-24' };\n");
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.name = 'midnight-signal-v14-1';
pkg.version = '14.1.0';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
fs.writeFileSync('README-CONVERSION-LAYER-v14.1.md', '# Midnight Signal v14.1 - Conversion Layer\n\nAdded data-driven Pro CTA, locked analytics preview, Pro unlocked state, and clearer free-vs-Pro positioning.\n\nDeploy with `npm install`, `npm run build`, then `vercel --prod`.\n');
