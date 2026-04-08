"use client";

import Link from "next/link";

export default function CancelPage() {
  return (
    <main style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: "radial-gradient(circle at top, rgba(42,107,255,.14), transparent 28%), linear-gradient(135deg, #0d1530 0%, #181c2f 45%, #0f1330 100%)",
      color: "#f7f7f7",
      padding: 24,
      fontFamily: "Inter, system-ui, Arial, sans-serif"
    }}>
      <div style={{
        maxWidth: 640,
        width: "100%",
        borderRadius: 28,
        padding: 30,
        background: "rgba(24,28,47,.86)",
        border: "1px solid rgba(247,247,247,.1)",
        boxShadow: "0 20px 80px rgba(0,0,0,.35)"
      }}>
        <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 10 }}>Checkout canceled</div>
        <h1 style={{ fontSize: 36, lineHeight: 1.05, margin: "0 0 12px" }}>No problem.</h1>
        <p style={{ color: "#cbd5e1", lineHeight: 1.7 }}>
          You can keep exploring the free experience and unlock deeper signal intelligence whenever you’re ready.
        </p>
        <div style={{ marginTop: 20 }}>
          <Link href="/" style={{
            display: "inline-flex",
            padding: "12px 16px",
            borderRadius: 14,
            background: "rgba(247,247,247,.08)",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 800,
            border: "1px solid rgba(247,247,247,.12)"
          }}>
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
