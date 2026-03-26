
const BUILD_NUMBER = window.__MIDNIGHT_BUILD__ || "dev";
const GLOSSARY = {
  signal: { title: "Signal", body: "Signal is the model’s overall read on current conditions. Higher numbers mean stronger alignment, not certainty." },
  opportunity: { title: "Opportunity Score", body: "Opportunity Score estimates how actionable a setup looks right now after combining signal, timing, and strategy." },
  regime: { title: "Regime", body: "Bullish means stronger upward conditions, Neutral means mixed conditions, and Bearish means weaker or downward pressure." },
  timing: { title: "Timing", body: "Enter means alignment is improving, Wait means no strong edge yet, and Reduce means conditions are weakening." },
  posture: { title: "Suggested Posture", body: "Suggested Posture is plain-English guidance. It does not tell you what to buy or sell." },
  confluence: { title: "Confluence", body: "Confluence measures how many factors are lining up in the same direction." },
  mtf: { title: "MTF", body: "MTF stands for multi-timeframe alignment across short, medium, and longer conditions." },
  confidence: { title: "Confidence Context", body: "Confidence Context translates the signal into plain English." }
};
const storage = {
  get(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  getString(key, fallback) { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value)); } catch {} }
};
const state = {
  strategy: storage.getString("midnight-html-strategy", "swing"),
  timeframe: storage.getString("midnight-html-timeframe", "30"),
  watchlist: storage.get("midnight-html-watchlist", ["BTC","ETH","ADA"]),
  selected: null,
  glossaryOpen: false,
  glossaryTopic: "signal",
  assetQuery: "",
  coins: [],
  lastUpdated: null
};

function formatPrice(price) {
  if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
}
function formatVolume(num) {
  if (!Number.isFinite(num)) return "$0";
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  return `$${num.toLocaleString()}`;
}
function scoreMomentum(change24h) { return Math.max(0, Math.min(1, 0.5 + change24h / 20)); }
function scoreTrend(rank, change24h) {
  const rankBase = rank <= 5 ? 0.72 : rank <= 10 ? 0.64 : 0.56;
  const adj = change24h > 4 ? 0.06 : change24h < -4 ? -0.06 : 0;
  return Math.max(0, Math.min(1, rankBase + adj));
}
function scoreVolatility(change24h) { return 1 - Math.min(1, Math.abs(change24h) / 10); }
function calculateRSI(prices, period = 14) {
  if (!prices || prices.length <= period) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}
function movingAverage(prices, length) {
  if (!prices || prices.length < length) return prices?.[prices.length - 1] ?? 0;
  const slice = prices.slice(-length);
  return slice.reduce((a, b) => a + b, 0) / length;
}
function buildSyntheticHistory(coin) {
  const endPrice = Number(coin.price ?? 0);
  const changeFactor = 1 + Number(coin.change24h ?? 0) / 100;
  const startPrice = changeFactor === 0 ? endPrice : endPrice / changeFactor;
  const arr = [];
  for (let i = 0; i < 50; i++) {
    const progress = i / 49;
    const baseline = startPrice + (endPrice - startPrice) * progress;
    const wave = Math.sin(progress * Math.PI * 3) * endPrice * 0.01;
    const wobble = Math.cos(progress * Math.PI * 5) * endPrice * 0.004;
    arr.push(Math.max(0.0001, baseline + wave + wobble));
  }
  return arr;
}
function buildIndicators(coin) {
  const priceHistory = coin.price_history?.length ? coin.price_history : buildSyntheticHistory(coin);
  const rsi = Math.round(calculateRSI(priceHistory));
  const ma20 = movingAverage(priceHistory, 20);
  const ma50 = movingAverage(priceHistory, 50);
  const maTrend = ma20 > ma50 ? "Bullish" : ma20 < ma50 ? "Bearish" : "Neutral";
  return { rsi, ma20, ma50, maTrend, priceHistory };
}
function deriveRegime(signal) { return signal >= 0.65 ? "Bullish" : signal <= 0.45 ? "Bearish" : "Neutral"; }
function deriveTiming(signal, change24h) {
  if (signal >= 0.7 && change24h > 0) return "Enter";
  if (signal <= 0.4 || change24h < -2.5) return "Reduce";
  return "Wait";
}
function getRiskFromChange(change24h) {
  const abs = Math.abs(change24h);
  if (abs >= 6) return "High";
  if (abs <= 2) return "Low";
  return "Medium";
}
function getAdaptiveLabel(signal) {
  const pct = Math.round(signal * 100);
  if (pct >= 85) return { title: "High Probability", subtitle: "Stronger setup", priority: "high", cls: "high" };
  if (pct >= 75) return { title: "Watchlist", subtitle: "Needs confirmation", priority: "medium", cls: "watch" };
  return { title: "Low Quality", subtitle: "Weaker setup", priority: "low", cls: "low" };
}
function getCoinClasses(coin, selected) {
  const label = getAdaptiveLabel(coin.signal);
  const classes = ["coin"];
  if (selected) classes.push("active");
  if (label.priority === "high" && !selected) classes.push("priority-high");
  if (label.priority === "low" && !selected) classes.push("priority-low");
  if (Math.round(coin.signal * 100) >= 90) classes.push("priority-elite");
  return classes.join(" ");
}
function getConfidenceContext(signal) {
  const pct = Math.round(signal * 100);
  if (pct >= 85) return "Very strong alignment";
  if (pct >= 70) return "Moderate alignment";
  if (pct >= 55) return "Mixed / developing";
  return "Weak / low conviction";
}
function getSuggestedPosture(coin) {
  if (coin.signal >= 0.75 && coin.timing === "Enter" && coin.indicators.maTrend === "Bullish") return { label: "Candidate for entry", tone: "high" };
  if (coin.signal >= 0.6 && coin.timing !== "Reduce") return { label: "Wait for confirmation", tone: "watch" };
  if (coin.signal < 0.5 || coin.timing === "Reduce" || coin.indicators.maTrend === "Bearish") return { label: "Defensive posture", tone: "low" };
  return { label: "Monitor only", tone: "watch" };
}
function postureBadge(coin) {
  const p = getSuggestedPosture(coin);
  return `<span class="signal-label ${p.tone}">${p.label}</span>`;
}
function badge(value) {
  let cls = "neutral", icon = "";
  if (value === "Bullish" || value === "Enter") { cls = "bull"; icon = "🟢"; }
  else if (value === "Bearish" || value === "Reduce") { cls = "bear"; icon = "🔴"; }
  return `<span class="pill ${cls}">${icon ? icon + " " : ""}${value}</span>`;
}
function enrich(row, index) {
  const indicators = buildIndicators(row);
  const momentum = scoreMomentum(Number(row.price_change_percentage_24h ?? 0));
  const trend = scoreTrend(Number(row.market_cap_rank ?? index + 1), Number(row.price_change_percentage_24h ?? 0));
  const volatility = scoreVolatility(Number(row.price_change_percentage_24h ?? 0));
  let rsiScore = 0.5;
  if (indicators.rsi >= 40 && indicators.rsi <= 65) rsiScore = 0.75;
  else if (indicators.rsi > 70) rsiScore = 0.35;
  else if (indicators.rsi < 30) rsiScore = 0.4;
  const maDiff = Math.abs(indicators.ma20 - indicators.ma50);
  const maStrength = Math.min(1, maDiff / (Number(row.current_price ?? 1) || 1));
  const shortBias = indicators.maTrend === "Bullish" && indicators.rsi < 70 ? 1 : indicators.maTrend === "Bearish" && indicators.rsi > 30 ? -1 : 0;
  const mediumBias = trend >= 0.65 ? 1 : trend <= 0.45 ? -1 : 0;
  const longBias = Number(row.price_change_percentage_24h ?? 0) > 1 ? 1 : Number(row.price_change_percentage_24h ?? 0) < -1 ? -1 : 0;
  const mtf = Math.max(0, Math.min(1, 0.5 + (shortBias + mediumBias + longBias) / 6));
  const signal = Math.max(0.3, Math.min(0.95, momentum * 0.22 + trend * 0.22 + volatility * 0.13 + rsiScore * 0.17 + maStrength * 0.13 + mtf * 0.13));
  const regime = deriveRegime(signal);
  const timing = deriveTiming(signal, Number(row.price_change_percentage_24h ?? 0));
  const bullish = Math.round(Math.min(100, signal * 100 + (regime === "Bullish" ? 12 : 0) + (timing === "Enter" ? 8 : 0)));
  const bearish = Math.round(Math.min(100, (1 - signal) * 100 + (regime === "Bearish" ? 12 : 0) + (timing === "Reduce" ? 8 : 0)));
  return {
    symbol: String(row.symbol || "").toUpperCase(),
    name: row.name || String(row.symbol || "").toUpperCase(),
    price: Number(row.current_price ?? 0),
    change24h: Number(row.price_change_percentage_24h ?? 0),
    volume: formatVolume(Number(row.total_volume ?? 0)),
    risk: getRiskFromChange(Number(row.price_change_percentage_24h ?? 0)),
    signal,
    regime,
    timing,
    opportunityScore: Math.round(signal * 100 + (regime === "Bullish" ? 8 : regime === "Bearish" ? -8 : 0)),
    mtf: { label: shortBias + mediumBias + longBias >= 2 ? "Strong Bullish" : shortBias + mediumBias + longBias <= -2 ? "Strong Bearish" : shortBias + mediumBias + longBias > 0 ? "Bullish" : shortBias + mediumBias + longBias < 0 ? "Bearish" : "Mixed" },
    indicators,
    signalBreakdown: {
      momentum: Math.round(momentum * 100),
      trend: Math.round(trend * 100),
      volatility: Math.round(volatility * 100),
      rsi: Math.round(rsiScore * 100),
      trendStrength: Math.round(maStrength * 100),
      mtf: Math.round(mtf * 100)
    },
    adaptiveLabel: getAdaptiveLabel(signal),
    confluence: { bullish, bearish },
    reasons: [
      momentum >= 0.62 ? "strong momentum" : momentum <= 0.42 ? "weak momentum" : "mixed momentum",
      indicators.maTrend === "Bullish" ? "bullish MA alignment" : indicators.maTrend === "Bearish" ? "bearish MA alignment" : "steady trend profile",
      "live market snapshot"
    ]
  };
}
async function loadMarkets() {
  try {
    const res = await fetch("/api/markets");
    if (!res.ok) throw new Error(`markets ${res.status}`);
    const payload = await res.json();
    state.coins = (payload.coins || []).map(enrich);
    state.lastUpdated = new Date();
    render();
  } catch (err) {
    console.warn("Markets load failed.", err);
    render();
  }
}
function getFilteredCoins() {
  const query = state.assetQuery.toLowerCase();
  let list = state.coins;
  if (query) list = list.filter(c => `${c.symbol} ${c.name}`.toLowerCase().includes(query));
  return [...list].sort((a,b) => b.signal - a.signal).sort((a,b) => state.watchlist.includes(a.symbol) === state.watchlist.includes(b.symbol) ? 0 : state.watchlist.includes(a.symbol) ? -1 : 1);
}
function openGlossary(topic) {
  state.glossaryTopic = topic;
  state.glossaryOpen = true;
  render();
}
function render() {
  const app = document.getElementById("app");
  const sortedCoins = getFilteredCoins();
  const summary = {
    bullish: state.coins.filter(c => c.regime === "Bullish").length,
    enter: state.coins.filter(c => c.timing === "Enter").length,
    avgSignal: state.coins.length ? Math.round(state.coins.reduce((s,c) => s + c.signal, 0) / state.coins.length * 100) : 0,
    topCoin: sortedCoins[0]
  };
  const selected = state.selected ? state.coins.find(c => c.symbol === state.selected) : null;
  app.innerHTML = `
    <section class="card">
      <div class="row">
        <div>
          <div style="font-size:20px;font-weight:700">What’s the signal tonight? 🌙</div>
          <div class="subtitle">Midnight Signal helps you scan, understand, and compare crypto setups in one place.</div>
        </div>
        <div style="width:min(420px,100%)">
          <input id="searchInput" value="${state.assetQuery}" placeholder="Search crypto…" />
        </div>
      </div>
    </section>

    <section class="grid grid-hero">
      <div class="card">
        <div class="row-start">
          <div>
            <div class="caps">Midnight Signal</div>
            <div class="row" style="justify-content:flex-start;margin-top:6px">
              <div class="title">Midnight Signal</div>
              <button id="glossaryOpenHero">Glossary / FAQ</button>
            </div>
            <p class="subtitle">Vercel API build using server-side CoinGecko fetches.</p>
          </div>
          <div class="controls">
            <span class="badge">Live engine</span>
            <span class="badge">${state.timeframe}D timeframe</span>
          </div>
        </div>
        <div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr));margin-top:18px">
          <div class="metric"><div class="label">Bullish Regimes</div><div class="value">${summary.bullish}/20</div></div>
          <div class="metric"><div class="label">Enter Signals</div><div class="value">${summary.enter}</div></div>
          <div class="metric"><div class="label">Average Confidence</div><div class="value">${summary.avgSignal}%</div></div>
          <div class="metric"><div class="label">Top Opportunity</div><div class="value">${summary.topCoin?.symbol || "—"}</div></div>
        </div>
      </div>
      <div class="card">
        <div class="row-start">
          <div>
            <div class="caps">Controls</div>
            <div style="font-size:22px;font-weight:700;margin-top:4px">Session Settings</div>
          </div>
          <span class="badge">API connected</span>
        </div>
        <div class="grid" style="margin-top:14px">
          <label>
            <div class="tiny" style="margin-bottom:6px">Strategy</div>
            <select id="strategySelect">
              ${["scalp","swing","position"].map(s => `<option value="${s}" ${state.strategy === s ? "selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`).join("")}
            </select>
          </label>
          <label>
            <div class="tiny" style="margin-bottom:6px">Timeframe</div>
            <select id="timeframeSelect">
              ${["7","30","90"].map(t => `<option value="${t}" ${state.timeframe === t ? "selected" : ""}>${t}D</option>`).join("")}
            </select>
          </label>
          <div class="metric"><div class="label">Feed Source</div><div style="margin-top:8px;font-size:14px">Vercel API → CoinGecko snapshot + history</div></div>
          <div class="metric"><div class="label">Last Updated</div><div style="margin-top:8px;font-size:14px">${state.lastUpdated ? state.lastUpdated.toLocaleTimeString() : "—"}</div></div>
        </div>
      </div>
    </section>

    ${selected ? `
      <section class="panel">
        <div class="row-start">
          <div>
            <div class="caps">Asset Detail</div>
            <div style="margin-top:6px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
              <div class="title" style="margin:0">${selected.symbol}</div>
              <span class="signal-label ${selected.adaptiveLabel.cls}">${selected.adaptiveLabel.title}</span>
              ${badge(selected.regime)}
              ${badge(selected.timing)}
              ${postureBadge(selected)}
            </div>
            <div class="subtitle" style="margin-top:8px">${selected.name}</div>
          </div>
        </div>
        <div class="detail-grid-6" style="margin-top:18px">
          <div class="mini"><div class="tiny">Price</div><div style="margin-top:6px;font-weight:700">${formatPrice(selected.price)}</div></div>
          <div class="mini"><div class="tiny">24h Change</div><div style="margin-top:6px;font-weight:700" class="${selected.change24h >= 0 ? "text-pos" : "text-neg"}">${selected.change24h >= 0 ? "+" : ""}${selected.change24h.toFixed(1)}%</div></div>
          <div class="mini"><div class="tiny">Signal</div><div style="margin-top:6px;font-weight:700">${Math.round(selected.signal * 100)}%</div><div class="tiny" style="margin-top:4px">${getConfidenceContext(selected.signal)}</div></div>
          <div class="mini"><div class="tiny">Opportunity</div><div style="margin-top:6px;font-weight:700">${selected.opportunityScore}/100</div></div>
          <div class="mini"><div class="tiny">RSI</div><div style="margin-top:6px;font-weight:700">${selected.indicators.rsi}</div></div>
          <div class="mini"><div class="tiny">MA Trend</div><div style="margin-top:6px;font-weight:700">${selected.indicators.maTrend}</div></div>
        </div>
      </section>
    ` : ""}

    <section>
      <div class="row-start" style="margin-bottom:10px">
        <div>
          <div style="font-size:20px;font-weight:700">Top 20 Opportunity Grid</div>
          <div class="subtitle">Styled cards restored. View Details stays above the grid.</div>
        </div>
      </div>
      <section class="grid grid-cards">
        ${sortedCoins.map(coin => `
          <div class="${getCoinClasses(coin, state.selected === coin.symbol)}" data-select="${coin.symbol}" role="button" tabindex="0">
            <div class="row-start" style="position:relative">
              <button type="button" data-watch="${coin.symbol}" style="padding:6px 10px">${state.watchlist.includes(coin.symbol) ? "★" : "☆"}</button>
              <div style="flex:1;min-width:0">
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                  <div style="font-size:20px;font-weight:700">${coin.symbol}</div>
                  ${badge(coin.regime)}
                </div>
                <div class="subtitle" style="margin-top:4px">${coin.name}</div>
                <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                  <span class="signal-label ${coin.adaptiveLabel.cls}">${coin.adaptiveLabel.title}</span>
                  ${postureBadge(coin)}
                </div>
              </div>
            </div>
            <div>
              <div style="font-size:28px;font-weight:700">${formatPrice(coin.price)}</div>
              <div class="${coin.change24h >= 0 ? "text-pos" : "text-neg"}" style="font-size:14px;font-weight:600">${coin.change24h >= 0 ? "+" : ""}${coin.change24h.toFixed(1)}% (24h)</div>
            </div>
            <div>
              <div class="row"><span class="subtitle">Signal Confidence</span><span>${Math.round(coin.signal * 100)}%</span></div>
              <div class="tiny" style="margin-top:4px;color:rgba(247,247,247,.65)">${getConfidenceContext(coin.signal)}</div>
              <div class="progress"><span style="width:${Math.round(coin.signal * 100)}%"></span></div>
            </div>
            <div class="grid" style="grid-template-columns:1fr 1fr">
              <div class="mini"><div class="tiny">Timing</div><div style="margin-top:8px">${badge(coin.timing)}</div></div>
              <div class="mini"><div class="tiny">Opportunity</div><div style="margin-top:8px;font-weight:700">${coin.opportunityScore}/100</div><div class="tiny" style="margin-top:4px">MTF: ${coin.mtf.label}</div></div>
            </div>
            <div class="grid" style="grid-template-columns:1fr 1fr">
              <div class="mini"><div class="tiny">Bullish Confluence</div><div style="margin-top:8px;font-weight:700;color:var(--blue3)">${coin.confluence.bullish}/100</div></div>
              <div class="mini"><div class="tiny">Bearish Confluence</div><div style="margin-top:8px;font-weight:700;color:var(--bear)">${coin.confluence.bearish}/100</div></div>
            </div>
            <div class="row" style="padding-top:8px;border-top:1px solid rgba(247,247,247,.08)"><div><span class="subtitle">Volume </span><span>${coin.volume}</span></div><div>${coin.risk} risk</div></div>
          </div>
        `).join("")}
      </section>
    </section>

    ${state.glossaryOpen ? `
      <section class="card" style="position:fixed;inset:24px;z-index:40;max-width:860px;margin:auto;height:max-content;max-height:calc(100vh - 48px);overflow:auto;background:rgba(16,19,40,.98)">
        <div class="row-start">
          <div>
            <div class="caps">Glossary / FAQ</div>
            <div class="title" style="font-size:28px;margin-top:6px">${GLOSSARY[state.glossaryTopic].title}</div>
          </div>
          <button id="glossaryClose">Close</button>
        </div>
        <div class="mini" style="margin-top:18px">
          <div style="font-size:15px;line-height:1.7;color:rgba(247,247,247,.86)">${GLOSSARY[state.glossaryTopic].body}</div>
        </div>
      </section>
      <div id="glossaryBackdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.66);backdrop-filter:blur(6px);z-index:30"></div>
    ` : ""}

    <section style="margin-top:20px;text-align:center">
      <div class="tiny" style="color:rgba(247,247,247,.5)">
        Midnight Signal • Educational only • Not financial advice • Build ${BUILD_NUMBER}
      </div>
    </section>
  `;

  const searchInput = app.querySelector("#searchInput");
  if (searchInput) searchInput.addEventListener("input", (e) => { state.assetQuery = e.target.value; render(); });

  app.querySelectorAll("[data-select]").forEach(el => {
    el.addEventListener("click", () => { state.selected = el.dataset.select; render(); });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        state.selected = el.dataset.select;
        render();
      }
    });
  });
  app.querySelectorAll("[data-watch]").forEach(el => el.addEventListener("click", (e) => {
    e.stopPropagation();
    const sym = el.dataset.watch;
    state.watchlist = state.watchlist.includes(sym) ? state.watchlist.filter(s => s !== sym) : [...state.watchlist, sym];
    storage.set("midnight-html-watchlist", state.watchlist);
    render();
  }));
  const glossaryOpenHero = app.querySelector("#glossaryOpenHero");
  if (glossaryOpenHero) glossaryOpenHero.addEventListener("click", () => openGlossary("signal"));
  const glossaryClose = app.querySelector("#glossaryClose");
  if (glossaryClose) glossaryClose.addEventListener("click", () => { state.glossaryOpen = false; render(); });
  const glossaryBackdrop = app.querySelector("#glossaryBackdrop");
  if (glossaryBackdrop) glossaryBackdrop.addEventListener("click", () => { state.glossaryOpen = false; render(); });
  const strategySelect = app.querySelector("#strategySelect");
  if (strategySelect) strategySelect.addEventListener("change", (e) => { state.strategy = e.target.value; storage.set("midnight-html-strategy", state.strategy); render(); });
  const timeframeSelect = app.querySelector("#timeframeSelect");
  if (timeframeSelect) timeframeSelect.addEventListener("change", (e) => { state.timeframe = e.target.value; storage.set("midnight-html-timeframe", state.timeframe); loadMarkets(); });
}
loadMarkets();
setInterval(loadMarkets, 30000);
