"use client";

import { useEffect, useState } from "react";
import Beacon from "@/components/Beacon";
import Badge from "@/components/Badge";
import AssetCard from "@/components/AssetCard";
import type { DashboardPayload } from "@/lib/types";

function compactTime(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function Home() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/signal")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load signal data");
        return res.json();
      })
      .then(setData)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unknown error");
      });
  }, []);

  const top = data?.top;

  return (
    <main className="container">
      <div className="topbar">
        <div className="brand">
          <div className="brand-dot" />
          <div className="brand-copy">
            <div className="brand-title">Midnight Signal</div>
            <div className="brand-sub">Real market posture bundle</div>
          </div>
        </div>
        <div className="version-pill">
          {data ? `${data.source} · ${compactTime(data.generatedAt)}` : "loading real data"}
        </div>
      </div>

      <div className="hero-grid">
        <section className="panel round-xl hero-main">
          <Beacon />
          <div className="kicker">Nightly ritual</div>
          <h1 className="hero-title">🌙 What&apos;s the signal tonight?</h1>
          <p className="hero-sub">
            Real market data now powers the posture stack. Read the market like posture, not noise.
          </p>

          <div className="wisdom-line">
            <span>Data</span>
            <span>Information</span>
            <span>Knowledge</span>
            <span>Understanding</span>
            <span>Wisdom</span>
          </div>

          {error ? (
            <div className="signal-card">
              <div className="loading">Could not load signal data: {error}</div>
            </div>
          ) : !top ? (
            <div className="signal-card">
              <div className="loading">Loading tonight&apos;s posture…</div>
            </div>
          ) : (
            <div className="signal-card">
              <div className="signal-row">
                <div className="signal-asset">{top.asset}</div>
                <Badge confidence={top.confidence} label={top.label} />
              </div>

              <div className="conf-grid">
                <div>
                  <div className="label">Confidence</div>
                  <div className="meter">
                    <div className="meter-fill" style={{ width: `${top.confidence}%` }} />
                  </div>
                </div>
                <div className="conf-value">{top.confidence}%</div>
              </div>

              <p className="note">{top.posture}</p>

              <div className="breakdown-row">
                <div className="mini-chip">Price ${top.price.toLocaleString("en-US", { maximumFractionDigits: 4 })}</div>
                <div className="mini-chip">24h {top.priceChange24h.toFixed(2)}%</div>
                <div className="mini-chip">Trend {top.breakdown.trend}</div>
                <div className="mini-chip">Momentum {top.breakdown.momentum}</div>
                <div className="mini-chip">Structure {top.breakdown.structure}</div>
              </div>
            </div>
          )}
        </section>

        <div className="side-stack">
          <section className="panel round-lg small-panel">
            <h3 className="small-title">Session Settings</h3>
            <div className="settings-grid">
              <div className="setting-tile">
                <div className="setting-k">Mode</div>
                <div className="setting-v">{data?.settings.mode ?? "Beginner"}</div>
              </div>
              <div className="setting-tile">
                <div className="setting-k">Strategy</div>
                <div className="setting-v">{data?.settings.strategy ?? "Swing"}</div>
              </div>
              <div className="setting-tile">
                <div className="setting-k">Timeframe</div>
                <div className="setting-v">{data?.settings.timeframe ?? "1H"}</div>
              </div>
              <div className="setting-tile">
                <div className="setting-k">Watchlist</div>
                <div className="setting-v">{data?.settings.watchlist.join(", ") ?? "BTC, ETH, ADA"}</div>
              </div>
            </div>
          </section>

          <section className="panel round-lg small-panel">
            <h3 className="small-title">Tonight&apos;s Brief</h3>
            <div className="brief-list">
              {(data?.brief ?? ["Loading brief…"]).map((item) => (
                <div key={item} className="brief-item">{item}</div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="lower-grid">
        <section className="panel round-lg section">
          <h3 className="small-title">Since your last visit</h3>
          <div className="visit-list">
            {(data?.sinceLastVisit ?? ["Loading summary…"]).map((item) => (
              <div key={item} className="visit-item">{item}</div>
            ))}
          </div>
        </section>

        <section className="panel round-lg section">
          <h3 className="small-title">Tonight&apos;s Story</h3>
          <div className="story">
            The stack is now being built from live market snapshots rather than seeded values. That means the strongest signal
            can rotate with real conditions, and the grid can finally reflect what the market is actually doing.
          </div>
        </section>
      </div>

      <div className="stack-header">
        <div>
          <div className="kicker" style={{ marginBottom: 6 }}>Tonight&apos;s signals</div>
          <h2 className="stack-title">Top 10 signal stack</h2>
        </div>
        <div className="stack-sub">Real data posture, not financial advice</div>
      </div>

      <div className="asset-grid">
        {(data?.grid ?? []).map((item) => (
          <AssetCard key={item.asset} item={item} />
        ))}
      </div>
    </main>
  );
}
