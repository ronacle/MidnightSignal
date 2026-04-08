"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function SuccessPage() {
  useEffect(() => {
    try {
      window.localStorage.setItem("ms_premium_unlocked", "true");
      window.localStorage.setItem("ms_unlock_seen_at", new Date().toLocaleString());
      window.localStorage.setItem("midnight-signal-plan", "pro");
    } catch {}
  }, []);

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
        <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 10 }}>Midnight Signal Premium</div>
        <h1 style={{ fontSize: 36, lineHeight: 1.05, margin: "0 0 12px" }}>You’re unlocked.</h1>
        <p style={{ color: "#cbd5e1", lineHeight: 1.7 }}>
          Premium access has been enabled on this device. Return to the dashboard to open the full
          signal explanation, breakdown bars, and the complete since-last-visit layer.
        </p>
        <div style={{ marginTop: 20 }}>
          <Link href="/" style={{
            display: "inline-flex",
            padding: "12px 16px",
            borderRadius: 14,
            background: "linear-gradient(135deg, #2563eb, #4f46e5)",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 800
          }}>
            Return to Midnight Signal
          </Link>
        </div>
      </div>
    </main>
  );
}
