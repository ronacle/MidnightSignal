export default function ProAnalytics({ isPro, stats }) {
  if (!isPro) {
    return (
      <div className="relative bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
        <div className="blur-sm opacity-60">
          <p>Confidence Accuracy: 72%</p>
          <p>Best Symbol: BTC +4.2%</p>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <button className="bg-white text-black px-4 py-2 rounded-lg font-semibold">
            Unlock Pro Analytics
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
      <h2 className="text-lg font-semibold mb-2">Advanced Analytics</h2>
      <p>Confidence Accuracy: {stats.confidenceAccuracy}%</p>
      <p>Best Symbol: {stats.bestSymbol}</p>
    </div>
  );
}