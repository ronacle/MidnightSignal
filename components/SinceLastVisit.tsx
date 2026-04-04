"use client";

import { useEffect, useMemo, useState } from "react";
import type { VisitSnapshot } from "../lib/signal-engine";

type Props = {
  snapshot: VisitSnapshot;
};

type SummaryItem = {
  title: string;
  detail: string;
  tone: "neutral" | "good" | "warn";
};

const STORAGE_KEY = "midnight-signal:last-visit";

function toneColor(tone: SummaryItem["tone"]) {
  if (tone === "good") return "#86efac";
  if (tone === "warn") return "#fde68a";
  return "#cbd5e1";
}

export default function SinceLastVisit({ snapshot }: Props) {
  const [previous, setPrevious] = useState<VisitSnapshot | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setPrevious(JSON.parse(raw));
      }
    } catch (error) {
      console.error("Failed to read previous visit snapshot", error);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.error("Failed to save visit snapshot", error);
    }
  }, [hydrated, snapshot]);

  const summary = useMemo(() => {
    if (!previous) return null;

    const items: SummaryItem[] = [];

    if (previous.topSignalSymbol !== snapshot.topSignalSymbol || previous.topSignalLabel !== snapshot.topSignalLabel) {
      items.push({
        title: "Top signal changed",
        detail: `${previous.topSignalSymbol} ${previous.topSignalLabel} → ${snapshot.topSignalSymbol} ${snapshot.topSignalLabel}`,
        tone: "good"
      });
    } else {
      const delta = snapshot.topSignalConfidence - previous.topSignalConfidence;
      items.push({
        title: "Top signal conviction",
        detail: delta === 0
          ? `${snapshot.topSignalSymbol} is holding steady at ${snapshot.topSignalConfidence}%`
          : `${snapshot.topSignalSymbol} moved ${delta > 0 ? "up" : "down"} ${Math.abs(delta)} points to ${snapshot.topSignalConfidence}%`,
        tone: delta >= 0 ? "good" : "warn"
      });
    }

    if (previous.posture !== snapshot.posture) {
      items.push({
        title: "Market posture shifted",
        detail: `${previous.posture} → ${snapshot.posture}`,
        tone: "neutral"
      });
    } else {
      items.push({
        title: "Market posture",
        detail: `Still ${snapshot.posture.toLowerCase()}`,
        tone: "neutral"
      });
    }

    const tracked = ["BTC", "ETH", "ADA", "SOL"];
    const movers = tracked
      .map((symbol) => {
        const prev = previous.assetMap[symbol];
        const curr = snapshot.assetMap[symbol];
        if (!prev || !curr) return null;
        const delta = curr.confidence - prev.confidence;
        return { symbol, delta, current: curr.confidence };
      })
      .filter((item): item is { symbol: string; delta: number; current: number } => Boolean(item))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    if (movers.length > 0) {
      const top = movers[0];
      items.push({
        title: "Biggest confidence move",
        detail: `${top.symbol} ${top.delta >= 0 ? "rose" : "fell"} ${Math.abs(top.delta)} points to ${top.current}%`,
        tone: top.delta >= 0 ? "good" : "warn"
      });
    }

    return items.slice(0, 3);
  }, [previous, snapshot]);

  return (
    <section
      style={{
        background: "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98))",
        border: "1px solid rgba(51,65,85,0.9)",
        borderRadius: 20,
        padding: 22,
        boxShadow: "0 12px 40px rgba(0,0,0,0.28)",
        marginTop: 20
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "end", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, opacity: 0.62, marginBottom: 6 }}>Since your last visit</div>
          <h2 style={{ margin: 0, fontSize: 22 }}>What changed</h2>
        </div>
        <div style={{ fontSize: 12, opacity: 0.5 }}>
          {hydrated ? "Stored in this browser" : "Checking local snapshot"}
        </div>
      </div>

      {!hydrated ? (
        <div style={{ opacity: 0.72 }}>Loading visit history…</div>
      ) : !summary ? (
        <div
          style={{
            padding: 16,
            borderRadius: 16,
            background: "rgba(2,6,23,0.72)",
            border: "1px solid rgba(51,65,85,0.75)",
            lineHeight: 1.5
          }}
        >
          This is your first tracked visit on this browser. Come back after market conditions move and this panel will summarize what changed.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {summary.map((item) => (
            <div
              key={item.title}
              style={{
                padding: 16,
                borderRadius: 16,
                background: "rgba(2,6,23,0.78)",
                border: "1px solid rgba(51,65,85,0.78)"
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: toneColor(item.tone), marginBottom: 6 }}>
                {item.title}
              </div>
              <div style={{ opacity: 0.78, lineHeight: 1.5 }}>{item.detail}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
