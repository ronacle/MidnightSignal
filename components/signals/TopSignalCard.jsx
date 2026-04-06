export default function TopSignalCard() {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div className="text-sm text-white/60">Tonight’s Top Signal</div>
      <div className="mt-3 flex items-center justify-between">
        <div>
          <div className="text-2xl font-semibold">BTC</div>
          <div className="mt-1 text-sm text-white/65">Direction: Bullish</div>
        </div>
        <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-100">
          Conviction 78%
        </div>
      </div>
      <p className="mt-4 text-sm text-white/70">
        Momentum and posture are aligned across key timeframes.
      </p>
    </section>
  );
}