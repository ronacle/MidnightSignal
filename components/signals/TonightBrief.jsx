'use client';

export default function TonightBrief({ selected, timeframe }) {
  return (
    <div className="panel stack" id="brief">
      <div className="row space-between">
        <h2 className="section-title">Tonight&apos;s Brief</h2>
        <span className="badge">{timeframe}</span>
      </div>
      <div className="list-item stack">
        <div className="eyebrow">Why this signal matters</div>
        <div className="value brief-value">{selected.symbol} · {selected.sentiment}</div>
        <div className="muted">{selected.story}</div>
      </div>
      <div className="notice small">
        Start with the top signal, read the why, then scan the Top 20 for broader market context.
      </div>
    </div>
  );
}
