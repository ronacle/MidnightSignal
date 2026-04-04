export default function Page() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{
        width: "min(920px, 100%)",
        border: "1px solid rgba(148,163,184,.18)",
        borderRadius: 24,
        padding: 32,
        background: "linear-gradient(180deg, rgba(15,23,42,.94), rgba(7,17,31,.98))",
        boxShadow: "0 10px 40px rgba(0,0,0,.35)"
      }}>
        <div style={{ fontSize: 14, opacity: .72, marginBottom: 8 }}>Midnight Signal</div>
        <h1 style={{ margin: "0 0 10px", fontSize: 40, lineHeight: 1.05 }}>v8.4.1 Build Fix</h1>
        <p style={{ margin: 0, fontSize: 18, opacity: .86 }}>
          This rebuild removes the TypeScript requirement that was causing Vercel to fail.
        </p>
      </div>
    </main>
  );
}
