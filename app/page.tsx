import Beacon from "../components/Beacon";
import { fetchMarketData } from "../lib/coingecko";
import { buildMarketSummary } from "../lib/signal-engine";

const build = process.env.NEXT_PUBLIC_BUILD ?? "7.2.2";

function cardStyle(): React.CSSProperties {
  return {
    background: "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98))",
    border: "1px solid rgba(51,65,85,0.9)",
    borderRadius: 20,
    padding: 22,
    boxShadow: "0 12px 40px rgba(0,0,0,0.28)"
  };
}

function signalColor(label: string) {
  if (label === "Bullish") return "#86efac";
  if (label === "Bearish") return "#fca5a5";
  if (label === "Watch") return "#fde68a";
  return "#cbd5e1";
}

function formatPrice(value: number) {
  if (value >= 1000) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(4)}`;
}

export default async function Page() {
  const { coins, usingFallback } = await fetchMarketData();
  const summary = buildMarketSummary(coins);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "34px 20px 88px",
        background: "radial-gradient(circle at top, rgba(30,41,59,0.72), rgba(2,6,23,1) 44%)"
      }}
    >
      <div style={{ maxWidth: 1220, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <Beacon labels />
          <h1 style={{ margin: "16px 0 6px", fontSize: "2.7rem", letterSpacing: "-0.03em" }}>
            Midnight Signal
          </h1>
          <p style={{ opacity: 0.72, margin: 0 }}>
            Market intelligence with explainable signals
          </p>
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              opacity: 0.82,
              color: usingFallback ? "#fde68a" : "#86efac"
            }}
          >
            {usingFallback ? "Using fallback market data" : "Live market data active"}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.35fr 0.95fr",
            gap: 20,
            alignItems: "stretch"
          }}
        >
          <section style={cardStyle()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "flex-start",
                marginBottom: 14
              }}
            >
              <div>
                <div style={{ fontSize: 13, opacity: 0.62, marginBottom: 6 }}>Tonight’s Top Signal</div>
                <div style={{ fontSize: 30, fontWeight: 700, color: signalColor(summary.topSignal.label) }}>
                  {summary.topSignal.symbol} • {summary.topSignal.label}
                </div>
                <div style={{ opacity: 0.72, marginTop: 6 }}>
                  {summary.topSignal.name} is showing the strongest blended score across momentum, range posture, and liquidity.
                </div>
              </div>

              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(96,165,250,0.35)",
                  color: "#bfdbfe",
                  fontSize: 13,
                  whiteSpace: "nowrap"
                }}
              >
                Confidence {summary.topSignal.confidence}%
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
                marginBottom: 16
              }}
            >
              <div style={{ padding: 14, borderRadius: 14, background: "rgba(2,6,23,0.7)", border: "1px solid rgba(51,65,85,0.75)" }}>
                <div style={{ fontSize: 12, opacity: 0.58, marginBottom: 4 }}>Price</div>
                <div style={{ fontWeight: 700 }}>{formatPrice(summary.topSignal.price)}</div>
              </div>
              <div style={{ padding: 14, borderRadius: 14, background: "rgba(2,6,23,0.7)", border: "1px solid rgba(51,65,85,0.75)" }}>
                <div style={{ fontSize: 12, opacity: 0.58, marginBottom: 4 }}>24h Change</div>
                <div style={{ fontWeight: 700, color: summary.topSignal.dayChange >= 0 ? "#86efac" : "#fca5a5" }}>
                  {summary.topSignal.dayChange.toFixed(2)}%
                </div>
              </div>
              <div style={{ padding: 14, borderRadius: 14, background: "rgba(2,6,23,0.7)", border: "1px solid rgba(51,65,85,0.75)" }}>
                <div style={{ fontSize: 12, opacity: 0.58, marginBottom: 4 }}>Market Posture</div>
                <div style={{ fontWeight: 700 }}>{summary.posture}</div>
              </div>
            </div>

            <div
              style={{
                padding: 16,
                borderRadius: 16,
                background: "rgba(15,23,42,0.78)",
                border: "1px solid rgba(51,65,85,0.7)"
              }}
            >
              <div style={{ fontSize: 13, opacity: 0.62, marginBottom: 10 }}>Why this signal</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {summary.topSignal.reasons.map((reason) => (
                  <span
                    key={reason}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 999,
                      background: "rgba(30,41,59,0.9)",
                      border: "1px solid rgba(71,85,105,0.78)",
                      fontSize: 13
                    }}
                  >
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <aside style={cardStyle()}>
            <div style={{ fontSize: 13, opacity: 0.62, marginBottom: 10 }}>Session Settings</div>
            <div style={{ display: "grid", gap: 12, marginBottom: 18 }}>
              {[
                ["Mode", "Beginner"],
                ["Strategy", "Swing"],
                ["Timeframe", "1H"],
                ["Data", usingFallback ? "Fallback sample" : "CoinGecko live"]
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    paddingBottom: 10,
                    borderBottom: "1px solid rgba(51,65,85,0.6)"
                  }}
                >
                  <span style={{ opacity: 0.62 }}>{label}</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                padding: 16,
                borderRadius: 16,
                background: "rgba(2,6,23,0.72)",
                border: "1px solid rgba(51,65,85,0.75)"
              }}
            >
              <div style={{ fontSize: 13, opacity: 0.62, marginBottom: 10 }}>Tonight’s Brief</div>
              <div style={{ display: "grid", gap: 10 }}>
                {summary.brief.map((item) => (
                  <div key={item} style={{ lineHeight: 1.45 }}>
                    • {item}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <section style={{ ...cardStyle(), marginTop: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              alignItems: "end",
              marginBottom: 16
            }}
          >
            <div>
              <div style={{ fontSize: 13, opacity: 0.62, marginBottom: 6 }}>Midnight Signal Panel</div>
              <h2 style={{ margin: 0, fontSize: 22 }}>Live signal board</h2>
            </div>
            <div style={{ fontSize: 13, opacity: 0.62 }}>Top market assets</div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12
            }}
          >
            {summary.assets.map((asset) => (
              <div
                key={asset.id}
                style={{
                  padding: 14,
                  borderRadius: 16,
                  background: "rgba(2,6,23,0.9)",
                  border: "1px solid rgba(51,65,85,0.85)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{asset.symbol}</div>
                  <div style={{ fontSize: 12, opacity: 0.58 }}>{asset.confidence}%</div>
                </div>
                <div style={{ color: signalColor(asset.label), fontWeight: 600 }}>{asset.label}</div>
                <div style={{ marginTop: 6, opacity: 0.8 }}>{formatPrice(asset.price)}</div>
                <div style={{ marginTop: 4, color: asset.dayChange >= 0 ? "#86efac" : "#fca5a5", fontSize: 13 }}>
                  {asset.dayChange.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        </section>

        <div
          style={{
            position: "fixed",
            right: 14,
            bottom: 10,
            fontSize: 12,
            opacity: 0.42
          }}
        >
          v{build}
        </div>
      </div>
    </main>
  );
}
