function StatCard({ label, value, hint }) {
  return (
    <div
      style={{
        border: "1px solid rgba(148,163,184,.18)",
        borderRadius: 20,
        padding: 20,
        background: "rgba(15,23,42,.78)",
        boxShadow: "0 10px 30px rgba(0,0,0,.22)",
      }}
    >
      <div style={{ fontSize: 13, opacity: 0.68, marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 14, opacity: 0.78 }}>{hint}</div>
    </div>
  );
}

export default function Page() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px 20px 48px",
        background:
          "radial-gradient(circle at top, rgba(59,130,246,.16), transparent 30%), linear-gradient(180deg, #0b1324 0%, #07111f 100%)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            border: "1px solid rgba(148,163,184,.18)",
            borderRadius: 28,
            padding: 28,
            background: "linear-gradient(180deg, rgba(15,23,42,.94), rgba(7,17,31,.98))",
            boxShadow: "0 14px 50px rgba(0,0,0,.35)",
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 14, letterSpacing: ".08em", opacity: .72, textTransform: "uppercase" }}>
            Midnight Signal
          </div>
          <h1 style={{ margin: "10px 0 10px", fontSize: 42, lineHeight: 1.03 }}>
            Clean No-TypeScript Rebuild
          </h1>
          <p style={{ margin: 0, maxWidth: 740, fontSize: 18, lineHeight: 1.55, opacity: .86 }}>
            This bundle is meant to deploy cleanly on Vercel without TypeScript. It exists to eliminate the
            lingering tsconfig / .tsx build issue and give you a stable base again.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <StatCard label="Tonight's Top Signal" value="Bullish Drift" hint="Confidence 72% • 1H bias" />
          <StatCard label="Market Posture" value="Risk-On" hint="Momentum improving across majors" />
          <StatCard label="Since Last Visit" value="+3 shifts" hint="BTC, ADA, SOL changed posture" />
          <StatCard label="Version" value="v8.4.1" hint="No-TypeScript clean build" />
        </div>

        <div
          style={{
            border: "1px solid rgba(148,163,184,.18)",
            borderRadius: 24,
            padding: 24,
            background: "rgba(15,23,42,.76)",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Important deploy step</div>
          <p style={{ margin: "0 0 12px", lineHeight: 1.6, opacity: .86 }}>
            Before deploying, fully replace your app repo contents. Any leftover tsconfig.json, .ts, or .tsx file
            from an older build can cause Vercel to keep treating the repo as TypeScript.
          </p>
          <div style={{ fontSize: 14, opacity: .78 }}>Footer: Midnight Signal v8.4.1</div>
        </div>
      </div>
    </main>
  );
}
