'use client';

export default function TonightBrief({ asset, timeframe }) {
  if (!asset) return null;

  return (
    <div className="panel stack" id="brief">
      <div className="row space-between">
        <h2 className="section-title">Tonight&apos;s Brief</h2>
        <span className="badge">{timeframe}</span>
      </div>
      <div className="list-item stack">
        <div className="eyebrow">Why the top signal matters</div>
        <div className="value brief-value">{asset.symbol} · {asset.sentiment}</div>
        <div className="muted">{asset.story}</div>
      </div>
      <div className="notice small">
        The brief now follows the system-selected top signal, not the asset you open in the detail sheet.
      </div>
    </div>
  );
}
