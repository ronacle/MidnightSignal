// PATCH: Top Signal Core (replace top section in LeadSignalPanel.jsx)

export default function LeadSignalPanel({ asset }) {
  return (
    <div className="top-signal-core">
      <div className="asset">{asset?.symbol}</div>
      <div className="confidence">{asset?.confidence}%</div>
      <div className="posture">{asset?.signalLabel}</div>

      <div className="why-now">
        {asset?.whyNow || 'Momentum and structure are defining the current posture.'}
      </div>

      <div className="watch-next">
        {asset?.watchNext || 'Watch next cycle for confirmation.'}
      </div>
    </div>
  );
}
