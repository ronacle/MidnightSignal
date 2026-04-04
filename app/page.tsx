const build = process.env.NEXT_PUBLIC_BUILD ?? "dev";

export default function Page() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#e5e7eb",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: 8 }}>
          🌙 Midnight Signal
        </h1>
        <p style={{ opacity: 0.7, fontSize: 14 }}>
          Data • Information • Knowledge • Understanding • Wisdom
        </p>
      </div>

      <div
        style={{
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: 16,
          padding: 24,
          width: 320,
          textAlign: "center",
          boxShadow: "0 0 40px rgba(0,0,0,0.4)",
        }}
      >
        <h2 style={{ marginBottom: 12 }}>What’s the signal tonight?</h2>
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: "#020617",
            border: "1px solid #334155",
          }}
        >
          <p style={{ fontSize: 18, fontWeight: 600 }}>Neutral Signal</p>
          <p style={{ fontSize: 14, opacity: 0.7 }}>Confidence: 52%</p>
        </div>
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 12,
          right: 16,
          fontSize: 12,
          opacity: 0.45,
        }}
      >
        v{build}
      </div>
    </main>
  );
}

// This is a simple Next.js page that displays a "Midnight Signal" with a neutral signal and confidence level. The build version is displayed at the bottom right corner. The styling is done inline for simplicity, creating a dark-themed interface.