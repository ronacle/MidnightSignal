type PerformanceStats = {
  winRate: number;
  avgReturn: number;
  streak: number;
};

export default function PerformanceSummary({ stats }: { stats: PerformanceStats }) {
  if (!stats) return null;

  return (
    <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
      <h2 className="text-lg font-semibold mb-3">Performance (30d)</h2>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs text-zinc-400">Win Rate</p>
          <p className="text-xl font-bold">{stats.winRate}%</p>
        </div>
        <div>
          <p className="text-xs text-zinc-400">Avg Return</p>
          <p className="text-xl font-bold">{stats.avgReturn}%</p>
        </div>
        <div>
          <p className="text-xs text-zinc-400">Streak</p>
          <p className="text-xl font-bold">🔥 {stats.streak}</p>
        </div>
      </div>
    </div>
  );
}