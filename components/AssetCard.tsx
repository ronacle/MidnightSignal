import type { SignalSnapshot } from "@/lib/types";
import Badge from "./Badge";

function compactMoney(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2
  }).format(value);
}

export default function AssetCard({ item }: { item: SignalSnapshot }) {
  return (
    <div className="asset-card">
      <div className="asset-top">
        <div>
          <div className="asset-name">{item.asset}</div>
          <div className="asset-copy">${item.price.toLocaleString("en-US", { maximumFractionDigits: 4 })}</div>
        </div>
        <Badge confidence={item.confidence} label={item.label} />
      </div>

      <div className="label">Confidence</div>
      <div className="meter">
        <div className="meter-fill" style={{ width: `${item.confidence}%` }} />
      </div>

      <div className="data-points">
        <div className="data-box">
          <div className="k">24h</div>
          <div className="v">{item.priceChange24h.toFixed(2)}%</div>
        </div>
        <div className="data-box">
          <div className="k">Volume</div>
          <div className="v">{compactMoney(item.volume24h)}</div>
        </div>
        <div className="data-box">
          <div className="k">MCap</div>
          <div className="v">{compactMoney(item.marketCap)}</div>
        </div>
      </div>

      <div className="asset-footer">
        Trend {item.breakdown.trend} · Momentum {item.breakdown.momentum} · Structure {item.breakdown.structure}
      </div>
    </div>
  );
}
