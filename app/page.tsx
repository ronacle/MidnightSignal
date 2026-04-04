import Beacon from "../components/Beacon";

const build = process.env.NEXT_PUBLIC_BUILD ?? "7.4.1";

export default function Page() {
  return (
    <main style={{ padding: 40, textAlign: "center", minHeight: "100vh" }}>
      <Beacon />
      <h1
        style={{
          fontSize: "2.5rem",
          marginBottom: 10,
          background: "linear-gradient(90deg,#60a5fa,#a78bfa)",
          WebkitBackgroundClip: "text",
          color: "transparent"
        }}
      >
        Midnight Signal
      </h1>

      <p style={{ opacity: 0.7, marginTop: 0 }}>
        Visual polish starter
      </p>

      <div
        style={{
          maxWidth: 760,
          margin: "30px auto 0",
          padding: 24,
          borderRadius: 20,
          background: "rgba(15,23,42,0.8)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          border: "1px solid rgba(148,163,184,0.14)"
        }}
      >
        <div style={{ fontSize: 14, opacity: 0.6 }}>Tonight’s Top Signal</div>
        <div
          style={{
            fontSize: 32,
            fontWeight: "bold",
            color: "#86efac",
            textShadow: "0 0 20px rgba(134,239,172,0.6)",
            marginTop: 8
          }}
        >
          BTC • Bullish
        </div>
        <div style={{ marginTop: 10, opacity: 0.7 }}>
          Strong momentum + high confidence
        </div>

        <div
          style={{
            marginTop: 18,
            height: 8,
            borderRadius: 999,
            background: "rgba(255,255,255,0.1)",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              width: "72%",
              height: "100%",
              background: "linear-gradient(90deg,#86efac,#22c55e)"
            }}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: 30,
          opacity: 0.5,
          fontSize: 12
        }}
      >
        v{build}
      </div>
    </main>
  );
}
