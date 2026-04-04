'use client';
import { useEffect, useMemo, useState } from "react";

const VISIT_KEY = "midnight:lastSignals";
const WATCH_KEY = "midnight:watchlist";
const MODE_KEY = "midnight:viewMode";
const SESSION_KEY = "midnight:session";
const USER_KEY = "midnight:user";
const PREMIUM_KEY = "midnight:premium";

const ALLOWED_ASSETS = [
  "bitcoin",
  "ethereum",
  "cardano",
  "solana",
  "chainlink",
  "avalanche-2",
  "matic-network",
  "polkadot",
  "dogecoin",
  "ripple",
  "litecoin",
  "uniswap",
  "near",
  "internet-computer",
  "aptos",
  "render-token",
  "arbitrum",
  "optimism"
];

const ALLOWED_SYMBOLS = [
  "BTC","ETH","ADA","SOL","LINK","AVAX","MATIC","DOT","DOGE","XRP","LTC","UNI","NEAR","ICP","APT","RENDER","ARB","OP"
];

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
    ? 50
    : ((currentPrice - low24h) / (high24h - low24h)) * 100;

  const rangePct = currentPrice > 0 ? ((high24h - low24h) / currentPrice) * 100 : 0;

  let momentumWeight = 1.5;
  let rankBonus = 0;
  let compressionAdj = 0;

  if (session === "scalp") {
    momentumWeight = 2.0;
    compressionAdj = rangePct < 4 ? 6 : -2;
  } else if (session === "position") {
    momentumWeight = 1.1;
    rankBonus = marketCapRank <= 10 ? 6 : marketCapRank <= 25 ? 2 : -2;
    compressionAdj = rangePct < 6 ? 3 : 0;
  } else {
    compressionAdj = rangePct < 5 ? 3 : -1;
  }

  const normalizedMomentum = clamp(50 + momentum24h * momentumWeight * 3, 0, 100);
  const normalizedVolume =
    volume > 25000000000 ? 95 :
    volume > 10000000000 ? 85 :
    volume > 2500000000 ? 72 :
    volume > 500000000 ? 60 :
    volume > 100000000 ? 48 : 32;

  const normalizedTrend =
    marketCapRank <= 5 ? 78 :
    marketCapRank <= 10 ? 72 :
    marketCapRank <= 20 ? 64 :
    marketCapRank <= 40 ? 56 : 46;

  const score = clamp(Math.round(
    normalizedMomentum * 0.4 +
    normalizedVolume * 0.3 +
    normalizedTrend * 0.3 +
    rankBonus +
    compressionAdj +
    ((pricePosition - 50) * 0.12)
  ));

  let label = "Neutral";
  if (score >= 61) label = "Bullish";
  else if (score <= 39) label = "Bearish";

  const confidence = clamp(Math.round(Math.abs(score - 50) * 2));

  let teaching = "Signal is balanced.";
  if (label === "Bullish") teaching = "Momentum, liquidity, and trend posture are leaning upward.";
  if (label === "Bearish") teaching = "Weak trend posture and pressure are dragging the signal lower.";

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
      momentum: Math.round((normalizedMomentum - 50) / 5),
      volume: Math.round((normalizedVolume - 50) / 5),
      trend: Math.round((normalizedTrend - 50) / 5),
      rank: rankBonus,
      compression: compressionAdj
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

function confidenceColor(confidence) {
  if (confidence >= 70) return "#60a5fa";
  if (confidence <= 45) return "#1d4ed8";
  return "#94a3b8";
}

function glow(score) {
  if (score >= 75) return "0 0 24px rgba(59,130,246,0.34)";
  if (score <= 35) return "0 0 18px rgba(30,64,175,0.18)";
  return "0 0 12px rgba(59,130,246,0.10)";
}

function cardBase(isChanged = false) {
  return {
    background: "linear-gradient(180deg, rgba(11,18,32,0.98) 0%, rgba(5,10,20,0.98) 100%)",
    border: "1px solid rgba(59,130,246,0.15)",
    borderRadius: 16,
    boxShadow: isChanged ? "0 0 18px rgba(59,130,246,0.26)" : "0 0 16px rgba(2,6,23,0.45)"
  };
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
  if (!signals.length) return "Loading tonight’s brief...";
  const bullish = signals.filter((s) => s.label === "Bullish").length;
  const bearish = signals.filter((s) => s.label === "Bearish").length;
  const top = [...signals].sort((a, b) => b.score - a.score)[0];
  const watched = signals.filter((s) => watchlist.includes(s.id));

  let mood = "Market conditions are fairly balanced tonight.";
  if (bullish >= bearish + 3) mood = "Bullish pressure is leading tonight’s tape.";
  if (bearish >= bullish + 3) mood = "Risk-off pressure is dominating tonight.";

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
  const width = Math.min(100, Math.abs(value) * 10);
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize: 12, color:"#94a3b8" }}>
        <span>{label}</span>
        <span>{value > 0 ? `+${value}` : value}</span>
      </div>
      <div style={{ height: 8, background:"#0b1220", borderRadius: 999, overflow:"hidden", marginTop: 4, border: "1px solid rgba(59,130,246,0.08)" }}>
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
  const tone = confidenceColor(value);
  return (
    <div style={{
      width: 86,
      height: 86,
      borderRadius: "50%",
      display: "grid",
      placeItems: "center",
      background: `conic-gradient(${tone} ${value * 3.6}deg, #0f172a 0deg)`,
      boxShadow: value >= 70 ? "0 0 20px rgba(59,130,246,0.25)" : "0 0 12px rgba(2,6,23,0.45)"
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
        border: "1px solid #1e293b",
        textShadow: value >= 70 ? "0 0 10px rgba(59,130,246,0.6)" : "none"
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
    fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false")
      .then((r) => r.json())
      .then((res) => {
        const filtered = (Array.isArray(res) ? res : [])
          .filter((asset) => ALLOWED_ASSETS.includes(asset.id) || ALLOWED_SYMBOLS.includes((asset.symbol || "").toUpperCase()))
          .slice(0, 18);

        const built = filtered.map((asset) => buildSignal(asset, session));
        const previous = JSON.parse(localStorage.getItem(VISIT_KEY) || "[]");
        const summary = summarizeVisit(previous, built, watchlist);
        localStorage.setItem(VISIT_KEY, JSON.stringify(built));
        setVisitSummary(summary);
        setSignals(built);
      })
      .catch(() => setSignals([]));
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
    setPremium(false);
  }

  const sorted = useMemo(() => [...signals].sort((a, b) => b.score - a.score), [signals]);
  const topSignal = sorted[0];

  const prioritized = useMemo(() => {
    const watched = sorted.filter((s) => watchlist.includes(s.id));
    const rest = sorted.filter((s) => !watchlist.includes(s.id));
    return [...watched, ...rest];
  }, [sorted, watchlist]);

  const topFive = prioritized.slice(0, 5);
  const visibleSignals = premium ? prioritized : topFive;
  const tonightBrief = buildBrief(signals, session, watchlist);

  return (
    <main style={{
      padding: 28,
      maxWidth: 1180,
      margin: "0 auto",
      color: "#e5e7eb",
      minHeight: "100vh",
      background: "radial-gradient(circle at top, rgba(37,99,235,0.10), transparent 28%)"
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap: 16, flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em" }}>🌙 Midnight Signal</div>
          <div style={{ fontSize: 13, color:"#94a3b8", marginTop: 4 }}>v10.1 · premium visual reset + cleaner market universe</div>
        </div>
        <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
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
        ...cardBase(),
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
        <section style={{ padding: 18, ...cardBase() }}>
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
                border: "1px solid rgba(59,130,246,0.18)",
                background: "#01030a",
                color: "#e5e7eb",
                outline: "none",
                boxShadow: "inset 0 0 0 1px rgba(15,23,42,0.6)"
              }}
            />
            <button onClick={saveUser} style={{ padding: "11px 14px", borderRadius: 12, border: "1px solid #334155", background: "#1e293b", color: "#e5e7eb", cursor: "pointer" }}>
              Save identity
            </button>
            <button onClick={startUpgrade} style={{ padding: "11px 14px", borderRadius: 12, border: "1px solid #2563eb", background: "#1d4ed8", color: "#fff", cursor: "pointer" }}>
              Upgrade
            </button>
            {!configStatus.stripeReady && (
              <button onClick={simulatePremium} style={{ padding: "11px 14px", borderRadius: 12, border: "1px solid #334155", background: "#020617", color: "#93c5fd", cursor: "pointer" }}>
                Local premium unlock
              </button>
            )}
            {(user || premium) && (
              <button onClick={signOut} style={{ padding: "11px 14px", borderRadius: 12, border: "1px solid #334155", background: "#020617", color: "#94a3b8", cursor: "pointer" }}>
                Clear local state
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

        <section style={{ padding: 18, ...cardBase() }}>
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
          ...cardBase(),
          boxShadow: topSignal ? glow(topSignal.score) : "0 0 16px rgba(2,6,23,0.45)"
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
                <BreakdownBar label="Trend" value={topSignal.breakdown.trend} />
                <BreakdownBar label="Market Rank" value={topSignal.breakdown.rank} />
                <BreakdownBar label="Compression" value={topSignal.breakdown.compression} />
              </div>
            </>
          ) : (
            <div style={{ marginTop: 12, color:"#94a3b8" }}>Loading top signal...</div>
          )}
        </section>

        <section style={{ padding: 18, ...cardBase() }}>
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
        <div style={{ marginTop: 12, padding: 16, ...cardBase() }}>
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
            const confTone = confidenceColor(coin.confidence);
            return (
              <div
                key={coin.id}
                onClick={() => toggleWatch(coin.id)}
                style={{
                  cursor: "pointer",
                  padding: 14,
                  ...cardBase(changed),
                  boxShadow: changed ? "0 0 18px rgba(59,130,246,0.28)" : glow(coin.score),
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ display:"flex", justifyContent:"space-between", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, color:"#64748b" }}>#{index + 1}</div>
                    <div style={{ fontWeight: 700, marginTop: 2 }}>{isWatched ? "⭐ " : ""}{coin.name}</div>
                  </div>
                  <div style={{ fontSize: 12, color: badgeColor(coin.label) }}>{coin.label}</div>
                </div>
                <div style={{
                  marginTop: 10,
                  fontSize: 13,
                  color: confTone,
                  textShadow: coin.confidence >= 70 ? "0 0 10px rgba(59,130,246,0.6)" : "none"
                }}>
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
    </main>
  );
}
