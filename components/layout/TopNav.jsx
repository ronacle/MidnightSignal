export default function TopNav({ onOpenControls, onOpenLearning }) {
  return (
    <div className="flex justify-between items-center p-4 border-b border-white/10">

      <div className="text-sm tracking-widest text-cyan-300">
        MIDNIGHT SIGNAL
      </div>

      <div className="flex gap-2">
        <button onClick={onOpenLearning}>📘</button>
        <button onClick={onOpenControls}>⚙️</button>
      </div>

    </div>
  );
}