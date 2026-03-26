const seedCoins = [
  { symbol: "BTC", name: "Bitcoin", price: 112450, change24h: 2.8, volumeNum: 48.2e9 },
  { symbol: "ETH", name: "Ethereum", price: 5840, change24h: 1.1, volumeNum: 22.4e9 },
  { symbol: "SOL", name: "Solana", price: 264, change24h: 4.9, volumeNum: 6.1e9 },
  { symbol: "XRP", name: "XRP", price: 1.72, change24h: -2.3, volumeNum: 3.4e9 },
  { symbol: "ADA", name: "Cardano", price: 1.14, change24h: 0.4, volumeNum: 1.7e9 },
  { symbol: "BNB", name: "BNB", price: 935, change24h: 1.8, volumeNum: 2.3e9 },
  { symbol: "DOGE", name: "Dogecoin", price: 0.42, change24h: 3.6, volumeNum: 2.0e9 },
  { symbol: "TRX", name: "TRON", price: 0.31, change24h: 1.2, volumeNum: 890e6 },
  { symbol: "AVAX", name: "Avalanche", price: 58.2, change24h: -1.7, volumeNum: 960e6 },
  { symbol: "LINK", name: "Chainlink", price: 34.4, change24h: 2.7, volumeNum: 1.1e9 },
  { symbol: "DOT", name: "Polkadot", price: 10.7, change24h: -0.2, volumeNum: 530e6 },
  { symbol: "TON", name: "Toncoin", price: 9.3, change24h: 2.1, volumeNum: 480e6 },
  { symbol: "LTC", name: "Litecoin", price: 168, change24h: 0.6, volumeNum: 820e6 },
  { symbol: "BCH", name: "Bitcoin Cash", price: 744, change24h: 1.5, volumeNum: 710e6 },
  { symbol: "NEAR", name: "NEAR", price: 7.4, change24h: -1.3, volumeNum: 390e6 },
  { symbol: "APT", name: "Aptos", price: 19.8, change24h: 2.9, volumeNum: 620e6 },
  { symbol: "ARB", name: "Arbitrum", price: 1.94, change24h: 0.8, volumeNum: 670e6 },
  { symbol: "OP", name: "Optimism", price: 5.5, change24h: 1.9, volumeNum: 410e6 },
  { symbol: "FIL", name: "Filecoin", price: 8.7, change24h: -2.1, volumeNum: 350e6 },
  { symbol: "ATOM", name: "Cosmos", price: 14.2, change24h: 0.3, volumeNum: 440e6 },
];

const TIMEFRAME_OPTIONS = ["7", "30", "90"];
const STRATEGY_OPTIONS = ["scalp", "swing", "position"];
const regimeOrder = { Bullish: 0, Neutral: 1, Bearish: 2 };
const CONFLUENCE_THRESHOLD = 72;
const HISTORY_LENGTH = 50;
const COINGECKO_SNAPSHOT_URL = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h";
const COINGECKO_HISTORY_URL = (id, days) => `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`;

const storage = {
  get(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  getString(key, fallback) { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value)); } catch {} }
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
function getRiskFromChange(change24h) {
  const abs = Math.abs(change24h);
  if (abs >= 6) return "High";
  if (abs <= 2) return "Low";
  return "Medium";
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
  for (let i = 0; i < HISTORY_LENGTH; i++) {
    const progress = i / (HISTORY_LENGTH - 1);
    const baseline = startPrice + (endPrice - startPrice) * progress;
    const wave = Math.sin(progress * Math.PI * 3) * endPrice * 0.01;
    const wobble = Math.cos(progress * Math.PI * 5) * endPrice * 0.004;
    arr.push(Math.max(0.0001, baseline + wave + wobble));
  }
  return arr;
}
function buildIndicators(coin) {
  const priceHistory = coin.priceHistory || buildSyntheticHistory(coin);
  const rsi = Math.round(calculateRSI(priceHistory));
  const ma20 = movingAverage(priceHistory, 20);
  const ma50 = movingAverage(priceHistory, 50);
  const maTrend = ma20 > ma50 ? "Bullish" : ma20 < ma50 ? "Bearish" : "Neutral";
  const rsiState = rsi > 70 ? "Overbought" : rsi < 30 ? "Oversold" : "Neutral";
  return { rsi, rsiState, ma20, ma50, maTrend, priceHistory };
}
function calculateSignal(coin) {
  const change24h = Number(coin.change24h ?? 0);
  const rank = coin.marketCapRank ?? 999;
  const momentum = scoreMomentum(change24h);
  const trend = scoreTrend(rank, change24h);
  const volatility = scoreVolatility(change24h);
  const indicators = buildIndicators(coin);
  let rsiScore = 0.5;
  if (indicators.rsi >= 40 && indicators.rsi <= 65) rsiScore = 0.75;
  else if (indicators.rsi > 70) rsiScore = 0.35;
  else if (indicators.rsi < 30) rsiScore = 0.4;
  const maDiff = Math.abs(indicators.ma20 - indicators.ma50);
  const maStrength = Math.min(1, maDiff / (coin.price || 1));
  const shortBias = indicators.maTrend === "Bullish" && indicators.rsi < 70 ? 1 : indicators.maTrend === "Bearish" && indicators.rsi > 30 ? -1 : 0;
  const mediumBias = trend >= 0.65 ? 1 : trend <= 0.45 ? -1 : 0;
  const longBias = change24h > 1 ? 1 : change24h < -1 ? -1 : 0;
  const mtfScore = Math.max(0, Math.min(1, 0.5 + (shortBias + mediumBias + longBias) / 6));
  const signal = momentum * 0.22 + trend * 0.22 + volatility * 0.13 + rsiScore * 0.17 + maStrength * 0.13 + mtfScore * 0.13;
  return {
    value: Math.max(0.3, Math.min(0.95, signal)),
    breakdown: {
      momentum: Math.round(momentum * 100),
      trend: Math.round(trend * 100),
      volatility: Math.round(volatility * 100),
      rsi: Math.round(rsiScore * 100),
      trendStrength: Math.round(maStrength * 100),
      mtf: Math.round(mtfScore * 100),
    }
  };
}
function deriveRegime(signal) { return signal >= 0.65 ? "Bullish" : signal <= 0.45 ? "Bearish" : "Neutral"; }
function deriveTiming(signal, change24h) {
  if (signal >= 0.7 && change24h > 0) return "Enter";
  if (signal <= 0.4 || change24h < -2.5) return "Reduce";
  return "Wait";
}
function getBullishConfluence(coin) {
  let score = 0;
  if (coin.regime === "Bullish") score += 24;
  if (coin.timing === "Enter") score += 18;
  if (coin.indicators.maTrend === "Bullish") score += 18;
  if (coin.indicators.rsi >= 45 && coin.indicators.rsi <= 68) score += 12;
  if (coin.factorScores.momentum >= 60) score += 16;
  if (coin.factorScores.volatility >= 50) score += 12;
  return Math.max(0, Math.min(100, score));
}
function getBearishConfluence(coin) {
  let score = 0;
  if (coin.regime === "Bearish") score += 24;
  if (coin.timing === "Reduce") score += 18;
  if (coin.indicators.maTrend === "Bearish") score += 18;
  if (coin.indicators.rsi >= 62 || coin.indicators.rsiState === "Overbought") score += 12;
  if (coin.factorScores.momentum <= 42) score += 16;
  if (coin.factorScores.volatility <= 45) score += 12;
  return Math.max(0, Math.min(100, score));
}
function computeOpportunityScore(coin, strategy) {
  let base = coin.signal * 100;
  const regimeBoost = coin.regime === "Bullish" ? 12 : coin.regime === "Neutral" ? 0 : -12;
  const timingBoost = coin.timing === "Enter" ? 8 : coin.timing === "Wait" ? 0 : -8;
  const riskPenalty = coin.risk === "High" ? -4 : coin.risk === "Low" ? 4 : 0;
  const indicatorBoost = coin.indicators.maTrend === "Bullish" ? 4 : coin.indicators.maTrend === "Bearish" ? -4 : 0;
  const rsi = coin.indicators.rsi;
  if (strategy === "scalp") base += rsi < 35 ? 8 : rsi > 70 ? -6 : 0;
  if (strategy === "position") base += coin.indicators.maTrend === "Bullish" ? 10 : -6;
  return Math.max(0, Math.min(100, Math.round(base + regimeBoost + timingBoost + riskPenalty + indicatorBoost)));
}
function computeMtf(coin) {
  const short = coin.indicators.maTrend === "Bullish" && coin.indicators.rsi < 70 ? 1 : coin.indicators.maTrend === "Bearish" && coin.indicators.rsi > 30 ? -1 : 0;
  const medium = coin.signal >= 0.65 ? 1 : coin.signal <= 0.45 ? -1 : 0;
  const long = coin.change24h > 1 ? 1 : coin.change24h < -1 ? -1 : 0;
  const score = short + medium + long;
  let label = "Mixed";
  if (score >= 2) label = "Strong Bullish";
  else if (score === 1) label = "Bullish";
  else if (score === -1) label = "Bearish";
  else if (score <= -2) label = "Strong Bearish";
  return { score, label };
}
function reasonList(coin) {
  const reasons = [];
  reasons.push("derived history mode");
  reasons.push(coin.factorScores.momentum >= 62 ? "strong momentum" : coin.factorScores.momentum <= 42 ? "weak momentum" : "mixed momentum");
  reasons.push(coin.indicators.maTrend === "Bullish" ? "bullish MA alignment" : coin.indicators.maTrend === "Bearish" ? "bearish MA alignment" : "steady trend profile");
  return reasons.slice(0, 3);
}
function actionInsight(coin) {
  if (coin.signal >= 0.74 && coin.change24h > 0 && coin.indicators.maTrend === "Bullish") return { bias: "Bullish", setup: "High", action: "Momentum and moving averages are aligned. Watch for continuation or a shallow pullback." };
  if (coin.signal <= 0.42 || coin.indicators.maTrend === "Bearish") return { bias: "Bearish", setup: "Defensive", action: "Structure is weak or trend alignment is negative. Preserve capital or wait for confirmation." };
  if (coin.indicators.rsiState === "Oversold") return { bias: coin.regime, setup: "Reversal Watch", action: "Oversold conditions are forming. Look for confirmation before treating it as a recovery." };
  return { bias: coin.regime, setup: "Moderate", action: "Signal is mixed. Let price and indicator alignment confirm before acting." };
}
function badge(value) {
  let cls = "neutral";
  let icon = "";
  if (value === "Bullish") { cls = "bull"; icon = "🟢"; }
  else if (value === "Bearish") { cls = "bear"; icon = "🔴"; }
  else if (value === "Enter") { cls = "bull"; icon = "🟢"; }
  else if (value === "Reduce") { cls = "bear"; icon = "🔴"; }
  return `<span class="pill ${cls}">${icon ? icon + " " : ""}${value}</span>`;
}
function getAdaptiveLabel(signal) {
  const pct = Math.round(signal * 100);
  if (pct >= 85) return { title: "High Probability", subtitle: "Stronger setup", priority: "high", cls: "high" };
  if (pct >= 75) return { title: "Watchlist", subtitle: "Needs confirmation", priority: "medium", cls: "watch" };
  return { title: "Low Quality", subtitle: "Weaker setup", priority: "low", cls: "low" };
}
function getCoinClasses(coin, selected) {
  const label = coin.adaptiveLabel || getAdaptiveLabel(coin.signal);
  const classes = ["coin"];
  if (selected) classes.push("active");
  if (label.priority === "high" && !selected) classes.push("priority-high");
  if (label.priority === "low" && !selected) classes.push("priority-low");
  if (Math.round(coin.signal * 100) >= 90) classes.push("priority-elite");
  return classes.join(" ");
}
function getSuggestedPosture(coin) {
  if (coin.signal >= 0.75 && coin.timing === "Enter" && coin.indicators.maTrend === "Bullish") return { label: "Candidate for entry", tone: "high" };
  if (coin.signal >= 0.6 && coin.timing !== "Reduce") return { label: "Wait for confirmation", tone: "watch" };
  if (coin.signal < 0.5 || coin.timing === "Reduce" || coin.indicators.maTrend === "Bearish") return { label: "Defensive posture", tone: "low" };
  return { label: "Monitor only", tone: "watch" };
}
function getPostureExplanation(coin) {
  const parts = [];
  parts.push(`Signal ${Math.round(coin.signal * 100)}%`);
  parts.push(`Timing: ${coin.timing}`);
  parts.push(`Trend: ${coin.indicators.maTrend}`);
  if (coin.indicators.rsi) parts.push(`RSI ${coin.indicators.rsi}`);
  if (coin.regime) parts.push(`Regime: ${coin.regime}`);
  if (coin.signal >= 0.75 && coin.timing === "Enter" && coin.indicators.maTrend === "Bullish") parts.push("Alignment across signal, timing, and trend supports continuation conditions.");
  else if (coin.signal >= 0.6 && coin.timing !== "Reduce") parts.push("Moderate alignment; waiting for stronger confirmation can improve probability.");
  else if (coin.signal < 0.5 || coin.timing === "Reduce" || coin.indicators.maTrend === "Bearish") parts.push("Weak or negative alignment; risk is elevated and conditions are defensive.");
  else parts.push("Mixed signals; monitoring for clearer structure is reasonable.");
  return parts.join(" • ");
}
function postureBadge(coin) {
  const p = getSuggestedPosture(coin);
  const exp = getPostureExplanation(coin).replace(/"/g, "&quot;");
  return `<span class="signal-label ${p.tone}" title="${exp}">${p.label} ⓘ</span>`;
}
function infoBtn(topic) {
  return `<button class="btn-soft" data-glossary="${topic}" style="padding:6px 10px;min-height:auto;border-radius:999px;font-size:12px;line-height:1">ⓘ</button>`;
}
function getConfidenceContext(signal) {
  const pct = Math.round(signal * 100);
  if (pct >= 85) return { label: "Very strong alignment", tone: "high" };
  if (pct >= 70) return { label: "Moderate alignment", tone: "watch" };
  if (pct >= 55) return { label: "Mixed / developing", tone: "watch" };
  return { label: "Weak / low conviction", tone: "low" };
}
function enrich(coin, index) {
  const signalData = calculateSignal({ ...coin, marketCapRank: index + 1 });
  const signal = signalData.value;
  const regime = deriveRegime(signal);
  const timing = deriveTiming(signal, coin.change24h);
  const risk = getRiskFromChange(coin.change24h);
  const indicators = buildIndicators(coin);
  const factorScores = {
    momentum: Math.round(scoreMomentum(coin.change24h) * 100),
    trend: Math.round(scoreTrend(index + 1, coin.change24h) * 100),
    volatility: Math.round(scoreVolatility(coin.change24h) * 100),
  };
  const base = { ...coin, marketCapRank: index + 1, signal, signalBreakdown: signalData.breakdown, regime, timing, risk, indicators, factorScores };
  const bullish = getBullishConfluence(base);
  const bearish = getBearishConfluence(base);
  return {
    ...base,
    adaptiveLabel: getAdaptiveLabel(signal),
    volume: formatVolume(coin.volumeNum),
    reasons: reasonList(base),
    mtf: computeMtf(base),
    opportunityScore: 0,
    confluence: { bullish, bearish, bullishTriggered: bullish >= CONFLUENCE_THRESHOLD, bearishTriggered: bearish >= CONFLUENCE_THRESHOLD },
    actionInsight: actionInsight(base),
  };
}
function toCoinGeckoId(symbol) {
  const map = { BTC:"bitcoin", ETH:"ethereum", ADA:"cardano", SOL:"solana", XRP:"ripple", DOGE:"dogecoin", AVAX:"avalanche-2", DOT:"polkadot", BNB:"binancecoin", TON:"the-open-network", LINK:"chainlink", LTC:"litecoin", BCH:"bitcoin-cash", NEAR:"near", APT:"aptos", ARB:"arbitrum", OP:"optimism", FIL:"filecoin", ATOM:"cosmos", TRX:"tron" };
  return map[symbol] || symbol.toLowerCase();
}
async function fetchHistory(symbol, days) {
  try {
    const id = toCoinGeckoId(symbol);
    const res = await fetch(COINGECKO_HISTORY_URL(id, days));
    if (!res.ok) throw new Error(`history failed ${res.status}`);
    const data = await res.json();
    return Array.isArray(data.prices) ? data.prices.map(p => p[1]) : null;
  } catch (e) {
    console.warn("history fallback", symbol, e);
    return null;
  }
}
async function refreshLiveSnapshot() {
  try {
    const res = await fetch(COINGECKO_SNAPSHOT_URL);
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    const rows = await res.json();
    const prevBySymbol = new Map((state.coins || []).map(c => [c.symbol, c]));
    state.coins = await Promise.all(rows.map(async (row, i) => {
      const symbol = String(row.symbol || "").toUpperCase();
      const prev = prevBySymbol.get(symbol);
      const nextPrice = Number(row.current_price ?? 0);
      let priceHistory = prev?.indicators?.priceHistory;
      if (!priceHistory || priceHistory.length < 10) {
        const hist = await fetchHistory(symbol, Number(state.timeframe));
        priceHistory = hist && hist.length ? hist : buildSyntheticHistory({ price: nextPrice, change24h: Number(row.price_change_percentage_24h ?? 0) });
      } else {
        priceHistory = [...priceHistory.slice(-(HISTORY_LENGTH - 1)), nextPrice];
      }
      return enrich({
        symbol,
        name: row.name || symbol,
        price: nextPrice,
        change24h: Number(row.price_change_percentage_24h ?? 0),
        volumeNum: Number(row.total_volume ?? 0),
        marketCapRank: Number(row.market_cap_rank ?? i + 1),
        priceHistory,
      }, i);
    }));
    state.dataMode = "live";
    state.lastUpdated = new Date();
    render();
  } catch (err) {
    console.warn("Live snapshot failed, keeping current data.", err);
    if (!state.lastUpdated) state.lastUpdated = new Date();
    render();
  }
}
const GLOSSARY = {
  signal: { title: "Signal", body: "Signal is the model’s overall read on current conditions. Higher numbers mean stronger alignment, not certainty." },
  opportunity: { title: "Opportunity Score", body: "Opportunity Score estimates how actionable a setup looks right now after combining signal, timing, and strategy." },
  regime: { title: "Regime", body: "Bullish means stronger upward conditions, Neutral means mixed conditions, and Bearish means weaker or downward pressure." },
  timing: { title: "Timing", body: "Enter means alignment is improving, Wait means no strong edge yet, and Reduce means conditions are weakening." },
  posture: { title: "Suggested Posture", body: "Suggested Posture is plain-English guidance. It does not tell you what to buy or sell. It helps frame how strong or defensive conditions look." },
  confluence: { title: "Confluence", body: "Confluence measures how many factors are lining up in the same direction. Higher bullish or bearish confluence means more alignment." },
  mtf: { title: "MTF", body: "MTF stands for multi-timeframe. It summarizes whether short, medium, and longer conditions are generally aligned." },
  confidence: { title: "Confidence Context", body: "Confidence Context translates the signal into plain English, like very strong alignment or weak conviction." }
};
const state = {
  pulseTick: 0,
  showOnboarding: !storage.getString("midnight-onboarding-complete", ""),
  learnMode: true,
  timeframe: storage.getString("midnight-html-timeframe", "30"),
  strategy: storage.getString("midnight-html-strategy", "swing"),
  watchlist: storage.get("midnight-html-watchlist", ["BTC", "ETH", "ADA"]),
  sortBy: "signal",
  dataMode: "live",
  selected: null,
  glossaryOpen: false,
  glossaryTopic: "signal",
  assetQuery: "",
  lastUpdated: null,
  coins: seedCoins.map(enrich),
};
function recompute() {
  state.coins = state.coins.map((coin, i) => {
    const updated = enrich(coin, i);
    updated.opportunityScore = computeOpportunityScore(updated, state.strategy);
    return updated;
  });
  state.enhanced = state.coins.map((c) => ({ ...c, opportunityScore: computeOpportunityScore(c, state.strategy) }));
  state.bullishHighAlerts = state.enhanced.filter(c => c.signal >= 0.7 && c.confluence.bullish >= 70 && String(c.mtf.label).includes("Bullish")).sort((a,b) => b.opportunityScore - a.opportunityScore).slice(0,4);
  state.bearishHighAlerts = state.enhanced.filter(c => (c.signal <= 0.45 || c.timing === "Reduce") && c.confluence.bearish >= 70 && String(c.mtf.label).includes("Bearish")).sort((a,b) => b.confluence.bearish - a.confluence.bearish).slice(0,4);
  state.sortedCoins = [...state.enhanced]
    .sort((a,b) => state.sortBy === "signal" ? b.signal - a.signal : state.sortBy === "opportunity" ? b.opportunityScore - a.opportunityScore : a.symbol.localeCompare(b.symbol))
    .sort((a,b) => state.watchlist.includes(a.symbol) === state.watchlist.includes(b.symbol) ? 0 : state.watchlist.includes(a.symbol) ? -1 : 1);
  state.summary = {
    bullish: state.enhanced.filter(c => c.regime === "Bullish").length,
    enter: state.enhanced.filter(c => c.timing === "Enter").length,
    avgSignal: Math.round(state.enhanced.reduce((s,c) => s + c.signal, 0) / state.enhanced.length * 100),
    topCoin: [...state.enhanced].sort((a,b) => b.opportunityScore - a.opportunityScore)[0],
  };
  state.firstInsight = state.summary.topCoin;
  if (state.firstInsight) state.firstInsight.adaptiveLabel = getAdaptiveLabel(state.firstInsight.signal);
}
function renderOnboarding() {
  const el = document.getElementById("onboarding");
  if (!state.showOnboarding) { el.className = "hidden"; el.innerHTML = ""; return; }
  el.className = "";
  el.innerHTML = `<div style="position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.7);backdrop-filter:blur(8px)">
    <div class="card" style="max-width:520px;width:calc(100% - 24px)">
      <div class="title" style="font-size:24px">Welcome to Midnight Signal 🌙</div>
      <p class="subtitle">This platform helps you read market conditions using signals, confluence, and multi-timeframe analysis.</p>
      <div class="grid" style="grid-template-columns:repeat(3,1fr)">${STRATEGY_OPTIONS.map(s => `<button class="btn-soft" data-strategy="${s}">${s[0].toUpperCase()+s.slice(1)}</button>`).join("")}</div>
      <div class="tiny" style="margin-top:12px">Not sure?<br>• Scalper → quick trades (minutes/hours)<br>• Swing → days/weeks (recommended)<br>• Position → long-term trend following</div>
      <div class="row" style="margin-top:18px;justify-content:flex-end"><button class="btn-primary" id="enterDash">Enter Dashboard</button></div>
    </div></div>`;
  el.querySelectorAll("[data-strategy]").forEach(btn => btn.onclick = () => { state.strategy = btn.dataset.strategy; storage.set("midnight-html-strategy", state.strategy); recompute(); render(); });
  el.querySelector("#enterDash").onclick = () => { state.showOnboarding = false; storage.set("midnight-onboarding-complete", "true"); render(); };
}
function startLivePulse() {
  if (window.__midnightPulseStarted) return;
  window.__midnightPulseStarted = true;
  refreshLiveSnapshot();
  setInterval(() => { state.pulseTick = (state.pulseTick + 1) % 100000; render(); }, 10000);
  setInterval(() => { refreshLiveSnapshot(); }, 30000);
}
function render() {
  recompute();
  renderOnboarding();
  const app = document.getElementById("app");
  const searchResults = state.assetQuery ? state.enhanced.filter(c => `${c.symbol} ${c.name}`.toLowerCase().includes(state.assetQuery.toLowerCase())).slice(0, 5) : [];
  app.innerHTML = `<section class="card fade-in">
    <div class="row">
      <div><div style="font-size:20px;font-weight:700">What’s the signal tonight? 🌙</div><div class="subtitle">Midnight Signal helps you scan, understand, and compare crypto setups in one place.</div></div>
      <div style="width:min(420px,100%)"><input id="searchInput" value="${state.assetQuery}" placeholder="Search crypto…" />${searchResults.length ? `<div class="grid" style="margin-top:8px">${searchResults.map(item => `<button class="search-item" data-add="${item.symbol}">${item.symbol} — ${item.name}</button>`).join("")}</div>` : ""}</div>
    </div></section>
    ${(state.bullishHighAlerts.length || state.bearishHighAlerts.length) ? `<section class="grid grid-alerts fade-in">
      <div class="card"><div style="font-size:20px;font-weight:700;margin-bottom:8px">🟢 High Alert</div><div class="subtitle" style="margin-bottom:12px">Bullish setups with strong signal, confluence, and multi-timeframe support. Not financial advice.</div><div class="list">${state.bullishHighAlerts.map(c => `<button class="alert-item high-bull" data-select="${c.symbol}">${c.symbol} — ${c.mtf.label} • ${Math.round(c.signal*100)}%</button>`).join("")}</div></div>
      <div class="card"><div style="font-size:20px;font-weight:700;margin-bottom:8px">🔴 Breakdown Watch</div><div class="subtitle" style="margin-bottom:12px">Bearish setups showing weakness across timing, confluence, and multi-timeframe structure. Not financial advice.</div><div class="list">${state.bearishHighAlerts.map(c => `<button class="alert-item high-bear" data-select="${c.symbol}">${c.symbol} — ${c.mtf.label} • ${Math.round(c.signal*100)}%</button>`).join("")}</div></div>
    </section>` : ""}
    ${state.firstInsight ? `<section class="fade-in insight ${state.firstInsight.adaptiveLabel?.priority === 'high' ? 'priority-high' : ''} ${Math.round(state.firstInsight.signal*100) >= 90 ? 'priority-elite' : ''}">
      ${Math.round(state.firstInsight.signal*100) >= 85 ? `<div class="shimmer"></div>` : ''}
      <div class="row" style="position:relative">
        <div><div class="caps">🌙 Tonight’s Signal</div><div class="title" style="font-size:28px;margin-top:6px">${state.firstInsight.symbol} — ${state.firstInsight.mtf.label}</div>
          <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span class="signal-label ${state.firstInsight.adaptiveLabel.cls}">${state.firstInsight.adaptiveLabel.title}</span><span class="tiny">${state.firstInsight.adaptiveLabel.subtitle}</span>${Math.round(state.firstInsight.signal*100) >= 90 ? `<span class="elite-badge">90+ elite</span>` : ''}${postureBadge(state.firstInsight)}</div>
          <div class="subtitle" style="margin-top:6px">Strategy: ${state.strategy} • Confidence: ${Math.round(state.firstInsight.signal*100)}%</div>
          <div style="margin-top:10px;font-size:14px;color:rgba(247,247,247,.76)">${state.firstInsight.reasons.join(' • ')}</div>
          <div class="tiny" style="margin-top:8px">This is a highlighted opportunity based on your strategy and multi-timeframe confluence. Not financial advice.</div>
        </div>
        <div><button class="btn-primary" data-select="${state.firstInsight.symbol}">View Details</button></div>
      </div></section>` : ""}
    <section class="grid grid-hero fade-in">
      <div class="card">
        <div class="row-start">
          <div>
            <div class="caps">Midnight Signal</div>
            <div class="row" style="justify-content:flex-start;margin-top:6px"><div class="moon"></div><h1 class="title">Midnight Signal</h1><button id="learnToggle">${state.learnMode ? 'Hide Help' : 'Learn Mode'}</button><button id="glossaryOpenHero">Glossary / FAQ</button></div>
            ${state.learnMode ? `<p class="tiny" style="margin-top:8px">While they sleep, you see it. Midnight Signal surfaces confluence, trend alignment, and signal strength across timeframes. This is educational guidance, not financial advice.</p>` : ""}
            <p class="subtitle">Market Intelligence Engine — timeframe-aware signals, confluence, and strategy-driven insights.</p>
            <div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-top:14px">
              <div class="mini"><div class="tiny">1. Scan</div><div style="margin-top:6px;font-weight:700">Start with alerts + Top 20</div><div class="tiny" style="margin-top:6px">Look for High Probability labels, stronger confidence, and aligned posture.</div></div>
              <div class="mini"><div class="tiny">2. Understand</div><div style="margin-top:6px;font-weight:700">Open the detail panel</div><div class="tiny" style="margin-top:6px">Review signal breakdown, confluence, RSI, MA trend, and action insight.</div></div>
              <div class="mini"><div class="tiny">3. Decide</div><div style="margin-top:6px;font-weight:700">Use posture, not commands</div><div class="tiny" style="margin-top:6px">Candidate for entry, wait for confirmation, monitor only, or defensive posture.</div></div>
            </div>
          </div>
          <div class="controls">
            <span class="badge"><span style="display:inline-flex;width:8px;height:8px;border-radius:999px;background:rgba(139,168,255,.95);box-shadow:0 0 12px rgba(139,168,255,.65);animation:pulseGlow 1.8s ease-in-out infinite;margin-right:8px"></span>Live engine</span>
            <span class="badge">${state.timeframe}D timeframe</span><span class="badge">History-aware</span><span class="badge">Confluence</span>
          </div>
        </div>
        <div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr));margin-top:18px">
          <div class="metric"><div class="label">Bullish Regimes</div><div class="value">${state.summary.bullish}/20</div></div>
          <div class="metric"><div class="label">Enter Signals</div><div class="value">${state.summary.enter}</div></div>
          <div class="metric"><div class="label">Average Confidence</div><div class="value">${state.summary.avgSignal}%</div></div>
          <div class="metric"><div class="label">Top Opportunity</div><div class="value">${state.summary.topCoin?.symbol || '—'}</div></div>
        </div>
      </div>
      <div class="card">
        <div class="row-start"><div><div class="caps">Controls</div><div style="font-size:22px;font-weight:700;margin-top:4px">Session Settings</div></div><span class="badge">${state.dataMode === 'live' ? 'Live connected' : 'Simulator mode'}</span></div>
        <div class="grid" style="margin-top:14px">
          <label><div class="tiny" style="margin-bottom:6px">Strategy</div><select id="strategySelect">${STRATEGY_OPTIONS.map(s => `<option value="${s}" ${state.strategy === s ? 'selected' : ''}>${s[0].toUpperCase()+s.slice(1)}</option>`).join("")}</select></label>
          <label><div class="tiny" style="margin-bottom:6px">Timeframe</div><select id="timeframeSelect">${TIMEFRAME_OPTIONS.map(t => `<option value="${t}" ${state.timeframe === t ? 'selected' : ''}>${t}D</option>`).join("")}</select></label>
          <div class="metric"><div class="label">Feed Source</div><div style="margin-top:8px;font-size:14px">${state.dataMode === 'live' ? `CoinGecko live snapshot + ${state.timeframe}D history` : `Local simulator`}</div></div>
          <div class="metric"><div class="label">Last Updated</div><div style="margin-top:8px;font-size:14px">${state.lastUpdated ? state.lastUpdated.toLocaleTimeString() : '—'}</div><div class="tiny" style="margin-top:6px;color:rgba(139,168,255,.82)">● Live pulse every 10s</div></div>
          <div class="mini"><div class="tiny">How to use this ${infoBtn('signal')}</div><div style="margin-top:8px;font-size:14px;color:rgba(247,247,247,.76)">Start with alerts and Top 20 → open a coin → read Signal Breakdown and Suggested Posture.</div></div>
        </div>
      </div>
    </section>
    ${state.selected ? (() => {
      const coin = state.enhanced.find(c => c.symbol === state.selected);
      if (!coin) return "";
      const elite = Math.round(coin.signal * 100) >= 90;
      return `<section class="panel ${coin.adaptiveLabel?.priority === 'high' ? 'detail-priority-high' : coin.adaptiveLabel?.priority === 'low' ? 'detail-priority-low' : ''}">
        <div class="row-start"><div><div class="caps">Asset Detail</div><div style="margin-top:6px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><div class="title" style="margin:0">${coin.symbol}</div><span class="signal-label ${coin.adaptiveLabel.cls}">${coin.adaptiveLabel.title}</span>${elite ? `<span class="elite-badge">90+ elite</span>` : ''}${badge(coin.regime)}${badge(coin.timing)}${postureBadge(coin)}<button id="glossaryOpenDetail">How to read this</button></div><div class="subtitle" style="margin-top:8px">${coin.name}</div></div></div>
        <div class="detail-grid-6" style="margin-top:18px">
          <div class="mini" style="grid-column: span 6"><div class="tiny">Signal Breakdown ${infoBtn('signal')}</div><div style="margin-top:10px;display:grid;gap:10px">${['momentum','trend','volatility','rsi','trendStrength','mtf'].map(key => `<div><div class="row"><span class="tiny">${key === 'mtf' ? `MTF ${infoBtn('mtf')}` : key === 'rsi' ? `RSI ${infoBtn('confidence')}` : key === 'trendStrength' ? `trend strength ${infoBtn('signal')}` : key}</span><span>${coin.signalBreakdown?.[key] ?? '-' }%</span></div><div class="progress"><span style="width:${coin.signalBreakdown?.[key] ?? 0}%"></span></div></div>`).join('')}</div></div>
          <div class="mini"><div class="tiny">Price</div><div style="margin-top:6px;font-weight:700">${formatPrice(coin.price)}</div></div>
          <div class="mini"><div class="tiny">24h Change</div><div style="margin-top:6px;font-weight:700" class="${coin.change24h >= 0 ? 'text-pos' : 'text-neg'}">${coin.change24h >= 0 ? '+' : ''}${coin.change24h.toFixed(1)}%</div></div>
          <div class="mini"><div class="tiny">Signal</div><div style="margin-top:6px;font-weight:700">${Math.round(coin.signal * 100)}%</div><div class="tiny" style="margin-top:4px">${getConfidenceContext(coin.signal).label}</div></div>
          <div class="mini"><div class="tiny">Opportunity ${infoBtn('opportunity')}</div><div style="margin-top:6px;font-weight:700">${coin.opportunityScore}/100</div></div>
          <div class="mini"><div class="tiny">RSI ${infoBtn('confidence')}</div><div style="margin-top:6px;font-weight:700">${coin.indicators.rsi}</div></div>
          <div class="mini"><div class="tiny">MA Trend ${infoBtn('signal')}</div><div style="margin-top:6px;font-weight:700">${coin.indicators.maTrend}</div></div>
        </div>
        <div class="detail-grid-half" style="margin-top:20px">
          <div class="mini"><div class="tiny">Why this coin stands out</div><div style="margin-top:10px;font-size:14px;color:rgba(247,247,247,.75)">${coin.reasons.join(' • ')}</div></div>
          <div class="mini"><div class="tiny">Action Insight</div><div style="margin-top:10px;font-size:14px;color:rgba(247,247,247,.75)">${coin.actionInsight.action}</div></div>
        </div>
        <div class="detail-grid-half" style="margin-top:20px">
          <div class="mini"><div class="tiny">Bullish Confluence ${infoBtn('confluence')}</div><div style="margin-top:8px;font-weight:700;color:var(--blue3)">${coin.confluence.bullish}/100</div></div>
          <div class="mini"><div class="tiny">Bearish Confluence ${infoBtn('confluence')}</div><div style="margin-top:8px;font-weight:700;color:var(--bear)">${coin.confluence.bearish}/100</div></div>
        </div>
      </section>`;
    })() : ""}
    ${state.watchlist.length ? `<section class="card fade-in"><div class="row-start"><div><div class="caps">Your Watchlist</div><div style="font-size:22px;font-weight:700;margin-top:4px">Pinned to the top of your grid</div><div class="subtitle">Starred assets appear first while still respecting the current sort order.</div></div><span class="badge">${state.watchlist.length} starred</span></div></section>` : ""}
    <section class="fade-in">
      <div class="row-start" style="margin-bottom:10px"><div><div style="font-size:20px;font-weight:700">Top 20 Opportunity Grid</div><div class="subtitle">Adaptive labels, posture, confluence, and signal hierarchy.</div></div><span class="badge">Sorted by ${state.sortBy}</span></div>
      <section class="grid grid-cards">
        ${state.sortedCoins.map(coin => {
          const strong = Math.round(coin.signal * 100) >= 85;
          const elite = Math.round(coin.signal * 100) >= 90;
          const selectedCls = state.selected === coin.symbol;
          return `<div class="${getCoinClasses(coin, selectedCls)}" data-select="${coin.symbol}" role="button" tabindex="0">
            ${strong ? `<div class="shimmer"></div>` : ''}
            <div class="row-start" style="position:relative">
              <button type="button" data-watch="${coin.symbol}" style="padding:6px 10px">${state.watchlist.includes(coin.symbol) ? '★' : '☆'}</button>
              <div style="flex:1;min-width:0">
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><div style="font-size:20px;font-weight:700">${coin.symbol}</div>${badge(coin.regime)}</div>
                <div class="subtitle" style="margin-top:4px">${coin.name}</div>
                <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span class="signal-label ${coin.adaptiveLabel.cls}">${coin.adaptiveLabel.title}</span><span class="tiny">${coin.adaptiveLabel.subtitle}</span>${elite ? `<span class="elite-badge">90+ elite</span>` : ''}${postureBadge(coin)}</div>
              </div>
              ${state.watchlist.includes(coin.symbol) ? `<div class="tiny">★</div>` : ''}
            </div>
            <div><div style="font-size:28px;font-weight:700">${formatPrice(coin.price)}</div><div class="${coin.change24h >= 0 ? 'text-pos' : 'text-neg'}" style="font-size:14px;font-weight:600">${coin.change24h >= 0 ? '+' : ''}${coin.change24h.toFixed(1)}% (24h)</div></div>
            <div><div class="row"><span class="subtitle">Signal Confidence ${infoBtn('confidence')}</span><span>${Math.round(coin.signal * 100)}%</span></div><div class="tiny" style="margin-top:4px;color:rgba(247,247,247,.65)">${getConfidenceContext(coin.signal).label}</div><div class="progress"><span style="width:${Math.round(coin.signal * 100)}%"></span></div></div>
            <div class="grid" style="grid-template-columns:1fr 1fr"><div class="mini"><div class="tiny">Timing ${infoBtn('timing')}</div><div style="margin-top:8px">${badge(coin.timing)}</div></div><div class="mini"><div class="tiny">Opportunity ${infoBtn('opportunity')}</div><div style="margin-top:8px;font-weight:700">${coin.opportunityScore}/100</div><div class="tiny" style="margin-top:4px">MTF ${infoBtn('mtf')}: ${coin.mtf.label}</div></div></div>
            <div class="grid" style="grid-template-columns:1fr 1fr"><div class="mini"><div class="tiny">RSI ${infoBtn('confidence')}</div><div style="margin-top:8px;font-weight:700">${coin.indicators.rsi}</div></div><div class="mini"><div class="tiny">MA Trend ${infoBtn('signal')}</div><div style="margin-top:8px;font-weight:700">${coin.indicators.maTrend}</div></div></div>
            <div class="grid" style="grid-template-columns:1fr 1fr"><div class="mini"><div class="tiny">Bullish Confluence ${infoBtn('confluence')}</div><div style="margin-top:8px;font-weight:700;color:var(--blue3)">${coin.confluence.bullish}/100</div></div><div class="mini"><div class="tiny">Bearish Confluence ${infoBtn('confluence')}</div><div style="margin-top:8px;font-weight:700;color:var(--bear)">${coin.confluence.bearish}/100</div></div></div>
            <div class="row" style="padding-top:8px;border-top:1px solid rgba(247,247,247,.08)"><div><span class="subtitle">Volume </span><span>${coin.volume}</span></div><div>${coin.risk} risk</div></div>
          </div>`;
        }).join("")}
      </section>
    </section>
    ${state.glossaryOpen ? (() => {
      const topic = GLOSSARY[state.glossaryTopic] || GLOSSARY.signal;
      return `<section class="card" style="position:fixed;inset:24px;z-index:40;max-width:860px;margin:auto;height:max-content;max-height:calc(100vh - 48px);overflow:auto;background:rgba(16,19,40,.98)">
        <div class="row-start"><div><div class="caps">Glossary / FAQ</div><div class="title" style="font-size:28px;margin-top:6px">${topic.title}</div><div class="subtitle" style="margin-top:8px">Plain-English explanations for beginners and fast reference for everyone else.</div></div><button id="glossaryClose">Close</button></div>
        <div class="grid" style="grid-template-columns:260px 1fr;margin-top:18px">
          <div class="mini" style="display:grid;gap:8px;align-content:start">${Object.entries(GLOSSARY).map(([key, item]) => `<button class="btn-soft" data-topic="${key}" style="text-align:left;${state.glossaryTopic === key ? 'border-color:rgba(139,168,255,.35);background:rgba(139,168,255,.12)' : ''}">${item.title}</button>`).join('')}</div>
          <div class="mini"><div style="font-size:15px;line-height:1.7;color:rgba(247,247,247,.86)">${topic.body}</div><div class="tiny" style="margin-top:14px">FAQ: Enter does not mean guaranteed buy, Reduce does not mean sell everything, and High Probability does not mean guaranteed win.</div></div>
        </div>
      </section><div id="glossaryBackdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.66);backdrop-filter:blur(6px);z-index:30"></div>`;
    })() : ""}
    <section style="margin-top:20px;text-align:center"><div class="tiny" style="color:rgba(247,247,247,.5)">Midnight Signal • Educational only • Not financial advice • Built for signal discovery and interpretation</div></section>`;
  const searchInput = app.querySelector("#searchInput");
  if (searchInput) searchInput.addEventListener("input", (e) => { state.assetQuery = e.target.value; render(); });
  app.querySelectorAll("[data-add]").forEach(btn => btn.addEventListener("click", () => { state.selected = btn.dataset.add; state.assetQuery = ""; render(); }));
  app.querySelectorAll("[data-select]").forEach(btn => {
    btn.addEventListener("click", () => { state.selected = btn.dataset.select; render(); });
    btn.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); state.selected = btn.dataset.select; render(); } });
  });
  app.querySelectorAll("[data-watch]").forEach(btn => btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const symbol = btn.dataset.watch;
    state.watchlist = state.watchlist.includes(symbol) ? state.watchlist.filter(s => s !== symbol) : [...state.watchlist, symbol];
    storage.set("midnight-html-watchlist", state.watchlist);
    render();
  }));
  app.querySelectorAll("[data-glossary]").forEach(btn => btn.addEventListener("click", (e) => { e.stopPropagation(); state.glossaryOpen = true; state.glossaryTopic = btn.dataset.glossary; render(); }));
  const glossaryOpenHero = app.querySelector("#glossaryOpenHero");
  if (glossaryOpenHero) glossaryOpenHero.addEventListener("click", () => { state.glossaryOpen = true; state.glossaryTopic = "signal"; render(); });
  const glossaryOpenDetail = app.querySelector("#glossaryOpenDetail");
  if (glossaryOpenDetail) glossaryOpenDetail.addEventListener("click", () => { state.glossaryOpen = true; state.glossaryTopic = "signal"; render(); });
  app.querySelectorAll("[data-topic]").forEach(btn => btn.addEventListener("click", () => { state.glossaryTopic = btn.dataset.topic; render(); }));
  const glossaryClose = app.querySelector("#glossaryClose");
  if (glossaryClose) glossaryClose.addEventListener("click", () => { state.glossaryOpen = false; render(); });
  const glossaryBackdrop = app.querySelector("#glossaryBackdrop");
  if (glossaryBackdrop) glossaryBackdrop.addEventListener("click", () => { state.glossaryOpen = false; render(); });
  const learnToggle = app.querySelector("#learnToggle");
  if (learnToggle) learnToggle.addEventListener("click", () => { state.learnMode = !state.learnMode; render(); });
  const strategySelect = app.querySelector("#strategySelect");
  if (strategySelect) strategySelect.addEventListener("change", (e) => { state.strategy = e.target.value; storage.set("midnight-html-strategy", state.strategy); render(); });
  const timeframeSelect = app.querySelector("#timeframeSelect");
  if (timeframeSelect) timeframeSelect.addEventListener("change", (e) => { state.timeframe = e.target.value; storage.set("midnight-html-timeframe", state.timeframe); refreshLiveSnapshot(); });
}
startLivePulse();
render();
