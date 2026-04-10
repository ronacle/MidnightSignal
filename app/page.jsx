
"use client";
import { useState } from "react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  async function saveAlert() {
    const res = await fetch("/api/alerts", {
      method: "POST",
      body: JSON.stringify({ email, asset: "BTC", threshold: 70 }),
    });
    const data = await res.json();
    setStatus(data.message);
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Midnight Signal – Alert Center</h1>
      <p>Get notified when signals trigger.</p>

      <input
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ padding: 10, marginRight: 10 }}
      />

      <button onClick={saveAlert}>Activate Alerts</button>

      <p>{status}</p>
    </main>
  );
}
