'use client';
import { useEffect, useMemo, useState } from "react";

const VISIT_KEY = "midnight:lastSignals";
const WATCH_KEY = "midnight:watchlist";
const MODE_KEY = "midnight:viewMode";
const SESSION_KEY = "midnight:session";
const USER_KEY = "midnight:user";
const PREMIUM_KEY = "midnight:premium";

const FALLBACK_ASSETS = [
  {
    id: "bitcoin",
    symbol: "btc",
    name: "Bitcoin",
    current_price: 68000,
    price_change_percentage_24h: 2.8,
    market_cap_rank: 1,
    total_volume: 42000000000,
    high_24h: 69250,
    low_24h: 66120
  },
  {
    id: "ethereum",
    symbol: "eth",
    name: "Ethereum",
    current_price: 3200,
    price_change_percentage_24h: 1.9,
    market_cap_rank: 2,
    total_volume: 21000000000,
    high_24h: 3268,
    low_24h: 3124
  },
  {
    id: "cardano",
    symbol: "ada",
    name: "Cardano",
    current_price: 0.65,
    price_change_percentage_24h: 3.6,
    market_cap_rank: 9,
    total_volume: 980000000,
    high_24h: 0.67,
    low_24h: 0.62
  },
  {
    id: "solana",
    symbol: "sol",
    name: "Solana",
    current_price: 140,
    price_change_percentage_24h: 2.2,
    market_cap_rank: 5,
    total_volume: 3200000000,
    high_24h: 144,
    low_24h: 135
  },
  {
    id: "chainlink",
    symbol: "link",
    name: "Chainlink",
    current_price: 18.4,
    price_change_percentage_24h: 1.2,
    market_cap_rank: 13,
    total_volume: 640000000,
    high_24h: 18.9,
    low_24h: 17.8
  }
];

function processAssets(assets, session, watchlist, source = "live") {
  const built = assets.map((asset) => buildSignal(asset, session));
  const previous = JSON.parse(localStorage.getItem(VISIT_KEY) || "[]");
  const summary = summarizeVisit(previous, built, watchlist);
  localStorage.setItem(VISIT_KEY, JSON.stringify(built));
  return { built, summary, source };
}


function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function buildSignal(asset, session) {
  const momentum24h = asset.price_change_percentage_24h || 0;
  const marketCapRank = asset.market_cap_rank || 999;
  const volume = asset.total_volume || 0;
  const currentPrice = asset.current_price || 0;
  const high24h = asset.high_24h || currentPrice || 0;
  const low24h = asset.low_24h || currentPrice || 0;

  const pricePosition = high24h === low24h
    ? 0
    : ((currentPrice - low24h) / (high24h - low24h)) * 100;

  const rangePct = currentPrice > 0 ? ((high24h - low24h) / currentPrice) * 100 : 0;

  let momentumWeight = 1.5;
  let rankBonus = 0;
  let compressionAdj = 0;

  if (session === "scalp") {
    momentumWeight = 2.2;
    compressionAdj = rangePct < 4 ? 5 : -2;
  } else if (session === "position") {
    momentumWeight = 1.0;
    rankBonus = marketCapRank <= 10 ? 6 : marketCapRank <= 25 ? 2 : -2;
    compressionAdj = rangePct < 6 ? 3 : 0;
  } else {
    momentumWeight = 1.5;
    compressionAdj = rangePct < 5 ? 3 : -1;
  }

  const momentumScore = momentum24h * momentumWeight;
  const volumeScore = volume > 1000000000 ? 10 : volume > 250000000 ? 5 : volume < 50000000 ? -10 : 0;
  const positionScore = pricePosition > 70 ? 8 : pricePosition < 30 ? -8 : 0;
  const rankScore = rankBonus;
  const compressionScore = compressionAdj;

  let score = 50 + momentumScore + volumeScore + positionScore + rankScore + compressionScore;
  score = clamp(Math.round(score));

  let label = "Neutral";
  if (score >= 65) label = "Bullish";
  if (score <= 40) label = "Bearish";

  const confidence = clamp(Math.round(Math.abs(score - 50) * 2));

  let teaching = "Signal is balanced.";
  if (label === "Bullish") teaching = "Momentum and positioning are leaning upward.";
  if (label === "Bearish") teaching = "Weak positioning and pressure are dragging the signal lower.";

  return {
    id: asset.id,
    symbol: (asset.symbol || "").toUpperCase(),
    name: asset.name,
    price: currentPrice,
    change24h: momentum24h,
    score,
    label,
    confidence,
    volume,
    marketCapRank,
    pricePosition: Math.round(pricePosition),
    rangePct: Math.round(rangePct * 100) / 100,
    breakdown: {
      momentum: Math.round(momentumScore),
      volume: volumeScore,
      position: positionScore,
      rank: rankScore,
      compression: compressionScore
    },
    teaching
  };
}

function formatMoney(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return "-";
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return n.toLocaleString(undefined, { maximumSignificantDigits: 4 });
}

function badgeColor(label) {
  if (label === "Bullish") return "#22c55e";
  if (label === "Bearish") return "#ef4444";
  return "#94a3b8";
}

function glow(score) {
  if (score >= 75) return "0 0 24px rgba(59,130,246,0.38)";
  if (score <= 35) return "0 0 18px rgba(30,64,175,0.20)";
  return "0 0 10px rgba(59,130,246,0.12)";
}

function summarizeVisit(prev, next, watchlist) {
  if (!prev.length || !next.length) {
    return { headline: "First visit on this build — no prior session to compare yet.", items: [], changedIds: [] };
  }

  const items = [];
  const changedIds = [];

  next.forEach((curr) => {
    const old = prev.find((p) => p.id === curr.id);
    if (!old) return;

    const scoreDelta = curr.score - old.score;
    const confidenceDelta = curr.confidence - old.confidence;

    if (old.label !== curr.label) {
      items.push({ id: curr.id, priority: watchlist.includes(curr.id) ? 100 : 90, text: `${curr.name} flipped from ${old.label} to ${curr.label}.` });
      changedIds.push(curr.id);
    } else if (Math.abs(scoreDelta) >= 8) {
      items.push({ id: curr.id, priority: watchlist.includes(curr.id) ? 80 : 70, text: `${curr.name} moved ${scoreDelta > 0 ? "up" : "down"} ${Math.abs(scoreDelta)} signal points.` });
      changedIds.push(curr.id);
    } else if (Math.abs(confidenceDelta) >= 15) {
      items.push({ id: curr.id, priority: watchlist.includes(curr.id) ? 60 : 50, text: `${curr.name} confidence ${confidenceDelta > 0 ? "rose" : "fell"} by ${Math.abs(confidenceDelta)}.` });
      changedIds.push(curr.id);
    }
  });

  const uniqueChangedIds = [...new Set(changedIds)];
  const sortedItems = items.sort((a, b) => b.priority - a.priority).slice(0, 5);
  let headline = "No major shifts since your last visit.";

  if (sortedItems.length > 0) {
    const watchedMoves = sortedItems.filter((x) => watchlist.includes(x.id)).length;
    if (watchedMoves > 0) headline = "Your watchlist had the most important movement since last time.";
    else headline = "A few meaningful signal shifts showed up since your last visit.";
  }

  return { headline, items: sortedItems, changedIds: uniqueChangedIds };
}

function buildBrief(signals, session, watchlist) {
  if (!signals.length) return "Using fallback market snapshot while Midnight Signal warms up.";
  const bullish = signals.filter((s) => s.label === "Bullish").length;
  const bearish = signals.filter((s) => s.label === "Bearish").length;
  const top = [...signals].sort((a, b) => b.score - a.score)[0];
  const watched = signals.filter((s) => watchlist.includes(s.id));

  let mood = "Market conditions are fairly balanced tonight.";
  if (bullish >= bearish + 4) mood = "Bullish pressure is leading tonight’s tape.";
  if (bearish >= bullish + 4) mood = "Risk-off pressure is dominating tonight.";

  let sessionNote = "Swing mode is looking for usable directional posture.";
  if (session === "scalp") sessionNote = "Scalp mode is prioritizing fast momentum and short bursts.";
  if (session === "position") sessionNote = "Position mode is leaning toward steadier higher-cap setups.";

  let watchNote = "No watchlist assets selected yet.";
  if (watched.length) {
    const watchedTop = [...watched].sort((a, b) => b.score - a.score)[0];
    watchNote = `${watchedTop.name} is currently the strongest signal on your watchlist.`;
  }

  return `${mood} ${sessionNote} ${top ? `${top.name} is setting the pace right now.` : ""} ${watchNote}`.trim();
}

function decisionText(signal) {
  if (!signal) return "";
  if (signal.label === "Bullish" && signal.confidence >= 55) {
    return "Strength is strong enough to justify attention. Let the trend prove itself instead of chasing blindly.";
  }
  if (signal.label === "Bearish" && signal.confidence >= 55) {
    return "Pressure remains dominant. Defensive posture or patience makes more sense than forcing entries.";
  }
  return "This signal is mixed. Treat it as context, not conviction.";
}

function BreakdownBar({ label, value }) {
  const positive = value >= 0;
  const width = Math.min(100, Math.abs(value) * 5);
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize: 12, color:"#94a3b8" }}>
        <span>{label}</span>
        <span>{value > 0 ? `+${value}` : value}</span>
      </div>
      <div style={{ height: 8, background:"#111827", borderRadius: 999, overflow:"hidden", marginTop: 4 }}>
        <div style={{
          width: `${width}%`,
          height: "100%",
          background: positive ? "#3b82f6" : "#1d4ed8"
        }} />
      </div>
    </div>
  );
}

function ConfidenceRing({ value }) {
  return (
    <div style={{
      width: 86,
      height: 86,
      borderRadius: "50%",
      display: "grid",
      placeItems: "center",
      background: `conic-gradient(#3b82f6 ${value * 3.6}deg, #0f172a 0deg)`,
      boxShadow: "0 0 20px rgba(59,130,246,0.25)"
    }}>
      <div style={{
        width: 60,
        height: 60,
        borderRadius: "50%",
        background: "#020617",
        display: "grid",
        placeItems: "center",
        fontSize: 14,
        color: "#e5e7eb",
        border: "1px solid #1e293b"
      }}>
        {value}
      </div>
    </div>
  );
}

function StatusPill({ label, active }) {
  return (
    <div style={{
      padding: "8px 10px",
      borderRadius: 999,
      border: "1px solid #334155",
      background: active ? "rgba(30,41,59,0.9)" : "#020617",
      color: active ? "#93c5fd" : "#94a3b8",
      fontSize: 12
    }}>
      {label}: {active ? "ready" : "not set"}
    </div>
  );
}

export default function Page() {
  const [signals, setSignals] = useState([]);
  const [viewMode, setViewMode] = useState("beginner");
  const [session, setSession] = useState("swing");
  const [watchlist, setWatchlist] = useState([]);
  const [visitSummary, setVisitSummary] = useState({ headline: "", items: [], changedIds: [] });
  const [configStatus, setConfigStatus] = useState({ stripeReady: false, supabaseReady: false, siteUrlReady: false });
  const [user, setUser] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [premium, setPremium] = useState(false);
  const [billingMessage, setBillingMessage] = useState("");
  const [dataSource, setDataSource] = useState("loading");

  useEffect(() => {
    const savedMode = localStorage.getItem(MODE_KEY);
    const savedSession = localStorage.getItem(SESSION_KEY);
    const savedWatch = JSON.parse(localStorage.getItem(WATCH_KEY) || "[]");
    const savedUser = localStorage.getItem(USER_KEY) || "";
    const savedPremium = localStorage.getItem(PREMIUM_KEY) === "true";

    if (savedMode) setViewMode(savedMode);
    if (savedSession) setSession(savedSession);
    setWatchlist(savedWatch);
    setUser(savedUser);
    setEmailDraft(savedUser);
    setPremium(savedPremium);

    fetch("/api/config")
      .then((r) => r.json())
      .then((json) => setConfigStatus(json))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadSignals() {
      try {
        const res = await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=24&page=1&sparkline=false", { cache: "no-store" });
        const json = await res.json();

        if (!Array.isArray(json) || json.length === 0) {
          throw new Error("empty market response");
        }

        const { built, summary, source } = processAssets(json, session, watchlist, "live");
        if (!isActive) return;
        setVisitSummary(summary);
        setSignals(built);
        setDataSource(source);
      } catch (error) {
        const { built, summary, source } = processAssets(FALLBACK_ASSETS, session, watchlist, "fallback");
        if (!isActive) return;
        setVisitSummary(summary);
        setSignals(built);
        setDataSource(source);
      }
    }

    loadSignals();
    return () => {
      isActive = false;
    };
  }, [session, watchlist]);

  function toggleWatch(id) {
    const next = watchlist.includes(id) ? watchlist.filter((x) => x !== id) : [...watchlist, id];
    setWatchlist(next);
    localStorage.setItem(WATCH_KEY, JSON.stringify(next));
  }

  function switchMode(nextMode) {
    setViewMode(nextMode);
    localStorage.setItem(MODE_KEY, nextMode);
  }

  function switchSession(nextSession) {
    setSession(nextSession);
    localStorage.setItem(SESSION_KEY, nextSession);
  }

  function saveUser() {
    localStorage.setItem(USER_KEY, emailDraft);
    setUser(emailDraft);
    setBillingMessage(emailDraft ? "Identity saved on this device." : "");
  }

  async function startUpgrade() {
    setBillingMessage("");
    if (!emailDraft) {
      setBillingMessage("Add your email first so billing knows who this is for.");
      return;
    }

    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailDraft })
      });

      const json = await res.json();

      if (!res.ok) {
        setBillingMessage(json.error || "Checkout could not start.");
        return;
      }

      if (json.url) {
        window.location.href = json.url;
        return;
      }

      setBillingMessage("Checkout was created, but no redirect URL came back.");
    } catch {
      setBillingMessage("Checkout request failed.");
    }
  }

  function simulatePremium() {
    localStorage.setItem(PREMIUM_KEY, "true");
    setPremium(true);
    setBillingMessage("Premium unlocked locally for this device.");
  }

  function signOut() {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PREMIUM_KEY);
    setUser("");
    setEmailDraft("");
    setPremium(false)
  }

  const sorted = useMemo(() => [...signals].sort((a, b) => b.score - a.score), [signals]);
  const fallbackTopSignal = buildSignal(FALLBACK_ASSETS[0], session);
  const topSignal = sorted[0] || fallbackTopSignal;

  const prioritized = useMemo(() => {
    const watched = sorted.filter((s) => watchlist.includes(s.id));
    const rest = sorted.filter((s) => !watchlist.includes(s.id));
    return [...watched, ...rest];
  }, [sorted, watchlist]);

  const fallbackSignals = FALLBACK_ASSETS.map((asset) => buildSignal(asset, session));
  const topFive = prioritized.slice(0, 5);
  const visibleSignals = (premium ? prioritized : topFive).length ? (premium ? prioritized : topFive) : fallbackSignals;
  const tonightBrief = buildBrief(signals, session, watchlist);

  return (
    <main style={{ padding: 28, maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap: 16, flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>🌙 Midnight Signal</div>
          <div style={{ fontSize: 13, color:"#94a3b8", marginTop: 4 }}>v10.3 · data hydration + fallback</div>
        </div>
        <div style={{ display:"flex", gap: 8, flexWrap:"wrap", alignItems:"center" }}>
          <div style={{ padding: "8px 10px", borderRadius: 999, border: "1px solid #334155", background: dataSource === "live" ? "rgba(15,23,42,0.95)" : "rgba(30,41,59,0.95)", color: dataSource === "live" ? "#86efac" : "#fbbf24", fontSize: 12 }}>
            {dataSource === "live" ? "Live data" : dataSource === "fallback" ? "Fallback mode" : "Loading"}
          </div>
          {["scalp", "swing", "position"].map((item) => (
            <button
              key={item}
              onClick={() => switchSession(item)}
              style={{
                padding: "9px 14px",
                borderRadius: 999,
                border: "1px solid #334155",
                background: session === item ? "#1e293b" : "#020617",
                color: "#e5e7eb",
                cursor: "pointer"
              }}
            >
              {item}
            </button>
          ))}
          <button
            onClick={() => switchMode(viewMode === "beginner" ? "pro" : "beginner")}
            style={{
              padding: "9px 14px",
              borderRadius: 999,
              border: "1px solid #334155",
              background: "#020617",
              color: "#93c5fd",
              cursor: "pointer"
            }}
          >
            {viewMode === "beginner" ? "Beginner" : "Pro"}
          </button>
        </div>
      </div>

      <section style={{
        marginTop: 18,
        padding: 16,
        borderRadius: 16,
        background: "linear-gradient(180deg, rgba(2,6,23,1) 0%, rgba(1,4,12,1) 100%)",
        border: "1px solid #1e293b",
        boxShadow: "0 0 20px rgba(59,130,246,0.14)"
      }}>
        <div style={{ fontSize: 14, color:"#93c5fd", marginBottom: 8 }}>Environment Status</div>
        <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
          <StatusPill label="Site URL" active={configStatus.siteUrlReady} />
          <StatusPill label="Stripe" active={configStatus.stripeReady} />
          <StatusPill label="Supabase" active={configStatus.supabaseReady} />
        </div>
      </section>

      <div style={{
        marginTop: 18,
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.3fr) minmax(320px, .9fr)",
        gap: 16
      }}>
        <section style={{
          padding: 18,
          borderRadius: 16,
          background: "#020617",
          border: "1px solid #1e293b"
        }}>
          <div style={{ fontSize: 14, color:"#93c5fd", marginBottom: 8 }}>Identity + Access</div>
          <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
            <input
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              placeholder="you@example.com"
              style={{
                flex: "1 1 220px",
                minWidth: 220,
                padding: "11px 12px",
                borderRadius: 12,
                border: "1px solid #334155",
                background: "#01030a",
                color: "#e5e7eb",
                outline: "none"
              }}
            />
            <button
              onClick={saveUser}
              style={{
                padding: "11px 14px",
                borderRadius: 12,
                border: "1px solid #334155",
                background: "#1e293b",
                color: "#e5e7eb",
                cursor: "pointer"
              }}
            >
              Save identity
            </button>
            <button
              onClick={startUpgrade}
              style={{
                padding: "11px 14px",
                borderRadius: 12,
                border: "1px solid #2563eb",
                background: "#1d4ed8",
                color: "#fff",
                cursor: "pointer"
              }}
            >
              Upgrade
            </button>
            {!configStatus.stripeReady && (
              <button
                onClick={simulatePremium}
                style={{
                  padding: "11px 14px",
                  borderRadius: 12,
                  border: "1px solid #334155",
                  background: "#020617",
                  color: "#93c5fd",
                  cursor: "pointer"
                }}
              >
                Local premium unlock
              </button>
            )}
          </div>

          <div style={{ marginTop: 10, fontSize: 13, color:"#94a3b8" }}>
            User: {user || "not saved"} · Access: {premium ? "premium" : "free"}
          </div>

          {billingMessage && (
            <div style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              background: "#01030a",
              border: "1px solid #0f172a",
              color: "#93c5fd",
              fontSize: 13
            }}>
              {billingMessage}
            </div>
          )}
        </section>

        <section style={{
          padding: 18,
          borderRadius: 16,
          background: "#020617",
          border: "1px solid #1e293b"
        }}>
          <div style={{ fontSize: 14, color:"#93c5fd", marginBottom: 8 }}>Tonight’s Brief</div>
          <div style={{ fontSize: 15, lineHeight: 1.6 }}>{tonightBrief}</div>
        </section>
      </div>

      <div style={{
        marginTop: 18,
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.35fr) minmax(280px, .9fr)",
        gap: 16
      }}>
        <section style={{
          padding: 18,
          borderRadius: 16,
          background: "#020617",
          border: "1px solid #1e293b",
          boxShadow: topSignal ? glow(topSignal.score) : "none"
        }}>
          <div style={{ fontSize: 13, color:"#94a3b8" }}>Tonight’s Top Signal</div>
          {topSignal ? (
            <>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap: 16, marginTop: 10, flexWrap:"wrap" }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{topSignal.name}</div>
                  <div style={{ fontSize: 13, color: badgeColor(topSignal.label), marginTop: 4 }}>
                    {topSignal.label} · Score {topSignal.score} · {topSignal.symbol}
                  </div>
                  <div style={{ fontSize: 12, color:"#64748b", marginTop: 6 }}>
                    Rank #{topSignal.marketCapRank} · 24h {topSignal.change24h.toFixed(2)}%
                  </div>
                </div>
                <div style={{ display:"flex", gap: 16, alignItems:"center" }}>
                  <ConfidenceRing value={topSignal.confidence} />
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>${formatMoney(topSignal.price)}</div>
                    <div style={{ fontSize: 12, color:"#94a3b8", marginTop: 4 }}>
                      Position {topSignal.pricePosition}/100
                    </div>
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 12,
                background: "#01030a",
                border: "1px solid #0f172a",
                color: viewMode === "beginner" ? "#93c5fd" : "#cbd5e1"
              }}>
                {viewMode === "beginner" ? topSignal.teaching : decisionText(topSignal)}
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 13, color:"#cbd5e1" }}>Signal Breakdown</div>
                <BreakdownBar label="Momentum" value={topSignal.breakdown.momentum} />
                <BreakdownBar label="Volume" value={topSignal.breakdown.volume} />
                <BreakdownBar label="Price Position" value={topSignal.breakdown.position} />
                <BreakdownBar label="Market Rank" value={topSignal.breakdown.rank} />
                <BreakdownBar label="Compression" value={topSignal.breakdown.compression} />
              </div>
            </>
          ) : null}
        </section>

        <section style={{
          padding: 18,
          borderRadius: 16,
          background: "#020617",
          border: "1px solid #1e293b"
        }}>
          <div style={{ fontSize: 13, color:"#94a3b8" }}>Since your last visit</div>
          <div style={{ marginTop: 10, color:"#e5e7eb", lineHeight: 1.55 }}>{visitSummary.headline}</div>
          <div style={{ marginTop: 12 }}>
            {visitSummary.items.length === 0 ? (
              <div style={{ fontSize: 13, color:"#64748b" }}>No major changes worth highlighting yet.</div>
            ) : visitSummary.items.map((item, idx) => (
              <div key={idx} style={{
                marginTop: idx === 0 ? 0 : 10,
                padding: 10,
                borderRadius: 12,
                background: "#01030a",
                border: "1px solid #0f172a",
                fontSize: 13,
                color: "#93c5fd"
              }}>
                {item.text}
              </div>
            ))}
          </div>
        </section>
      </div>

      <section style={{ marginTop: 20 }}>
        <div style={{ fontSize: 14, color:"#cbd5e1" }}>Access Tier</div>
        <div style={{
          marginTop: 12,
          padding: 16,
          borderRadius: 16,
          background: "#020617",
          border: "1px solid #1e293b"
        }}>
          <div style={{ fontSize: 14, color:"#e5e7eb" }}>
            {premium ? "Premium is active. Full signal list unlocked." : "Free tier is active. Top 5 priority signals are unlocked."}
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color:"#94a3b8" }}>
            {premium
              ? "Next step is wiring Stripe webhooks to persist subscription state."
              : "Upgrade unlocks the full list, deeper session use, and premium expansion points."}
          </div>
        </div>
      </section>

      <section style={{ marginTop: 20 }}>
        <div style={{ fontSize: 14, color:"#cbd5e1" }}>
          {premium ? "All Signals" : "Tonight’s Priority Signals"}
        </div>
        <div style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12
        }}>
          {visibleSignals.map((coin, index) => {
            const isWatched = watchlist.includes(coin.id);
            const changed = visitSummary.changedIds.includes(coin.id);
            return (
              <div
                key={coin.id}
                onClick={() => toggleWatch(coin.id)}
                style={{
                  cursor: "pointer",
                  padding: 14,
                  borderRadius: 14,
                  background: "#020617",
                  border: "1px solid #1e293b",
                  boxShadow: changed ? "0 0 16px rgba(59,130,246,0.35)" : glow(coin.score)
                }}
              >
                <div style={{ display:"flex", justifyContent:"space-between", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, color:"#64748b" }}>#{index + 1}</div>
                    <div style={{ fontWeight: 700, marginTop: 2 }}>{isWatched ? "⭐ " : ""}{coin.name}</div>
                  </div>
                  <div style={{ fontSize: 12, color: badgeColor(coin.label) }}>{coin.label}</div>
                </div>
                <div style={{ marginTop: 10, fontSize: 13, color:"#cbd5e1" }}>
                  Score {coin.score} · Conf {coin.confidence}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color:"#64748b" }}>
                  24h {coin.change24h.toFixed(2)}% · ${formatMoney(coin.price)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div style={{ marginTop: 18, textAlign: "center", fontSize: 12, color: "#64748b" }}>
        v10.3 · data hydration + fallback
      </div>
    </main>
  );
}
