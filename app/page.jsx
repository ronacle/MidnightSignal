
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BeaconLogo from "../components/BeaconLogo";

const BUILD_VERSION = "10.3";
const BUILD_LABEL = "retention loop";

const STORAGE_KEYS = {
  agreed: "ms_agreement_accepted",
  mode: "ms_mode",
  strategy: "ms_strategy",
  selectedAsset: "ms_selected_asset",
  watchlist: "ms_watchlist",
  timeframe: "ms_timeframe",
  sound: "ms_sound_ping",
  snapshot: "ms_last_snapshot_v1",
  seenAt: "ms_last_seen_at",
  premium: "ms_premium_unlocked",
  lastVisitTs: "ms_last_visit_ts",
  streakCount: "ms_streak_count",
  unlockSeenAt: "ms_unlock_seen_at",
  email: "ms_user_email",
  history: "ms_signal_history_v1",
  autoRefresh: "ms_auto_refresh_on",
  alerts: "ms_alerts_v1",
};

const SEED = [
  ["BTC","Bitcoin",112450,2.8,48.2e9],["ETH","Ethereum",5840,1.1,22.4e9],["SOL","Solana",264,4.9,6.1e9],["XRP","XRP",1.72,-2.3,3.4e9],
  ["ADA","Cardano",1.14,0.4,1.7e9],["BNB","BNB",935,1.8,2.3e9],["DOGE","Dogecoin",0.42,3.6,2.0e9],["TRX","TRON",0.31,1.2,890e6],
  ["AVAX","Avalanche",58.2,-1.7,960e6],["LINK","Chainlink",34.4,2.7,1.1e9],["DOT","Polkadot",10.7,-0.2,530e6],["TON","Toncoin",9.3,2.1,480e6],
  ["LTC","Litecoin",168,0.6,820e6],["BCH","Bitcoin Cash",744,1.5,710e6],["NEAR","NEAR",7.4,-1.3,390e6],["APT","Aptos",19.8,2.9,620e6],
  ["ARB","Arbitrum",1.94,0.8,670e6],["OP","Optimism",5.5,1.9,410e6],["FIL","Filecoin",8.7,-2.1,350e6],["ATOM","Cosmos",14.2,0.3,440e6],
];

function formatPrice(price){ if(price>=1000) return `$${price.toLocaleString(undefined,{maximumFractionDigits:0})}`; if(price>=1) return `$${price.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`; return `$${price.toLocaleString(undefined,{minimumFractionDigits:4,maximumFractionDigits:4})}`; }
function formatVolume(num){ if(num>=1e12) return `$${(num/1e12).toFixed(2)}T`; if(num>=1e9) return `$${(num/1e9).toFixed(2)}B`; if(num>=1e6) return `$${(num/1e6).toFixed(2)}M`; return `$${num.toLocaleString()}`; }
function scoreMomentum(c){ return Math.max(0, Math.min(1, 0.5 + c / 20)); }
function scoreTrend(rank, c){ const b=rank<=5?0.72:rank<=10?0.64:0.56; const a=c>4?0.06:c<-4?-0.06:0; return Math.max(0, Math.min(1, b+a)); }
function scoreVolatility(c){ return 1 - Math.min(1, Math.abs(c)/10); }
function riskFrom(c){ const a=Math.abs(c); return a>=6?"High":a<=2?"Low":"Medium"; }
function buildHistory(price, change){ const end=price; const f=1+change/100; const start=f===0?end:end/f; const arr=[]; for(let i=0;i<42;i++){ const p=i/41; const baseline=start+(end-start)*p; const wave=Math.sin(p*Math.PI*3)*end*0.01; const wobble=Math.cos(p*Math.PI*5)*end*0.004; arr.push(Math.max(0.0001, baseline+wave+wobble)); } return arr; }
function movingAverage(prices, length){ const slice=prices.slice(-length); return slice.reduce((a,b)=>a+b,0)/slice.length; }
function calculateRSI(prices, period=14){ if(prices.length<=period) return 50; let gains=0, losses=0; for(let i=1;i<=period;i++){ const diff=prices[i]-prices[i-1]; if(diff>=0) gains+=diff; else losses-=diff; } const avgGain=gains/period; const avgLoss=losses/period; if(avgLoss===0) return 100; const rs=avgGain/avgLoss; return 100-100/(1+rs); }

function enrich(row, index){
  const [symbol,name,price,change24h,volumeNum,rankOverride]=row;
  const rank=rankOverride || index+1;
  const history=buildHistory(price, change24h);
  const signal=Math.max(0.3, Math.min(0.9, scoreMomentum(change24h)*0.4 + scoreTrend(rank,change24h)*0.4 + scoreVolatility(change24h)*0.2));
  const posture=signal>=0.65?"Bullish":signal<=0.45?"Bearish":"Neutral";
  const timing=signal>=0.7&&change24h>0?"Enter":signal<=0.4||change24h<-2.5?"Reduce":"Wait";
  const rsi=Math.round(calculateRSI(history));
  const ma20=movingAverage(history,20);
  const maTrend=ma20>=history[history.length-1]?"Neutral":"Bullish";
  const confidence=Math.round(signal*100);
  const reasons=[
    confidence>=70?"strong momentum":confidence<45?"weaker posture":"mixed momentum",
    timing==="Enter"?"entry conditions aligned":timing==="Reduce"?"defensive timing":"waiting for confirmation",
    maTrend==="Bullish"?"trend structure supportive":"trend structure mixed",
  ];
  const momentumComponent = Math.round(scoreMomentum(change24h) * 40);
  const trendComponent = Math.round(scoreTrend(rank, change24h) * 40);
  const volatilityComponent = Math.round(scoreVolatility(change24h) * 20);
  const confidenceBand = confidence >= 70 ? "High" : confidence <= 45 ? "Low" : "Medium";
  const explanation = posture === "Bullish"
    ? `Momentum is supporting the move, trend structure is leaning in favor of continuation, and volatility remains controlled enough to keep the posture constructive.`
    : posture === "Bearish"
    ? `Momentum is weakening, trend structure is less supportive, and recent price behavior increases caution. That combination keeps the signal defensive.`
    : `Momentum and trend are not fully aligned yet, while volatility is still adding uncertainty. The signal remains in a wait-and-see posture.`;
  const confidenceContext = confidenceBand === "High"
    ? "High-confidence signals usually mean multiple factors are aligned at the same time."
    : confidenceBand === "Low"
    ? "Low-confidence signals usually mean the setup lacks alignment or is showing stress."
    : "Medium-confidence signals usually mean there is some alignment, but not enough to treat it as decisive.";
  const invalidation = posture === "Bullish"
    ? "This signal would weaken if momentum fades and the short-term posture loses alignment."
    : posture === "Bearish"
    ? "This signal would weaken if buyers regain momentum and trend structure starts to stabilize."
    : "This signal would change if momentum or trend begins to break clearly in one direction.";
  return {
    symbol,name,price,change24h,volumeNum,volume:formatVolume(volumeNum),rank,signal,confidence,posture,timing,risk:riskFrom(change24h),rsi,maTrend,history,
    brief:`${symbol} is showing ${posture.toLowerCase()} posture with ${confidence}% confidence. ${reasons.join(" • ")}.`,
    breakdown:{ momentum: momentumComponent, trend: trendComponent, volatility: volatilityComponent },
    confidenceBand,
    explanation,
    confidenceContext,
    invalidation
  };
}

function sparkline(points, positive=true){
  const width=100, height=36, min=Math.min(...points), max=Math.max(...points), range=Math.max(max-min,0.0001);
  const coords=points.map((p,i)=>[(i/Math.max(points.length-1,1))*width, height-(((p-min)/range)*(height-4))-2]);
  const line=coords.map(([x,y],i)=>`${i?"L":"M"}${x},${y}`).join(" ");
  const area=`${line} L ${width},${height} L 0,${height} Z`;
  const stroke=positive?"#8BA8FF":"#2A6BFF";
  const fill=positive?"rgba(139,168,255,.16)":"rgba(42,107,255,.16)";
  return <svg viewBox={`0 0 ${width} ${height}`} style={{width:"100%",height:42,display:"block"}}><path d={area} fill={fill}></path><path d={line} fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"></path></svg>;
}

function pillTone(value){
  if(value==="Bullish"||value==="Enter") return {
    bg:"linear-gradient(135deg, rgba(0,255,157,.22), rgba(0,200,83,.18))",
    color:"#d1fae5",
    border:"rgba(0,255,157,.42)",
    shadow:"0 0 14px rgba(0,255,157,.22)"
  };
  if(value==="Bearish"||value==="Reduce") return {
    bg:"linear-gradient(135deg, rgba(255,77,77,.20), rgba(185,28,28,.18))",
    color:"#ffe4e6",
    border:"rgba(255,77,77,.38)",
    shadow:"0 0 14px rgba(255,77,77,.18)"
  };
  return {
    bg:"rgba(247,247,247,.04)",
    color:"#e5e7eb",
    border:"rgba(247,247,247,.14)",
    shadow:"none"
  };
}
function Pill({children,tone}){ const s=pillTone(tone||children); return <span style={{display:"inline-flex",alignItems:"center",gap:8,borderRadius:999,padding:"8px 12px",border:`1px solid ${s.border}`,background:s.bg,fontSize:12,color:s.color,fontWeight:700,boxShadow:s.shadow}}>{children}</span>; }

function deltaTone(delta){ if(delta>0) return "#8BA8FF"; if(delta<0) return "#2A6BFF"; return "#cbd5e1"; }
function postureArrow(from,to){ if(from===to) return "→"; if(to==="Bullish") return "↑"; if(to==="Bearish") return "↓"; return "→"; }
function barColor(label){ return label==="Momentum" ? "linear-gradient(90deg, #6067F9, #8BA8FF)" : label==="Trend" ? "linear-gradient(90deg, #0033AD, #6067F9)" : "linear-gradient(90deg, #334155, #8BA8FF)"; }
function postureAccent(posture, confidence){ if(posture==="Bullish") return {color:"#00ff9d", glow: confidence>=70 ? "0 0 18px rgba(0,255,157,.18)" : "none"}; if(posture==="Bearish") return {color:"#ff4d4d", glow: confidence<=45 ? "0 0 18px rgba(255,77,77,.16)" : "none"}; return {color:"#e5e7eb", glow:"none"}; }

function pulseMessageFrom(delta) {
  if (delta >= 6) return "Strengthening";
  if (delta <= -6) return "Weakening";
  return "Holding";
}

function alertTypeTone(type) {
  if (type === "leader") return { border: "rgba(139,168,255,.28)", bg: "linear-gradient(135deg, rgba(96,103,249,.12), rgba(0,51,173,.14))", color: "#dbe8ff" };
  if (type === "watchlist") return { border: "rgba(0,255,157,.24)", bg: "linear-gradient(135deg, rgba(0,255,157,.10), rgba(96,103,249,.10))", color: "#d1fae5" };
  return { border: "rgba(247,247,247,.1)", bg: "rgba(247,247,247,.03)", color: "#e2e8f0" };
}

function PremiumGate({ isPremium, onUnlock, title = "Unlock Full Signal", description = "Move beyond noise. See the deeper structure behind the market.", points = [], cta = "Unlock the Signal", children }) {
  if (isPremium) return children;
  return (
    <div style={{padding:18,borderRadius:18,background:"linear-gradient(135deg, rgba(96,103,249,.12), rgba(13,21,48,.88))",border:"1px solid rgba(96,103,249,.24)",boxShadow:"0 18px 48px rgba(2,6,23,.24)"}}>
      <div style={{fontSize:13,color:"#bcd0ff",letterSpacing:".08em",textTransform:"uppercase",marginBottom:8}}>Premium</div>
      <div style={{fontSize:26,fontWeight:900,marginBottom:10}}>{title}</div>
      <div className="ms-sub" style={{lineHeight:1.7,maxWidth:520}}>{description}</div>
      {points?.length ? <div style={{display:"grid",gap:10,marginTop:16}}>{points.map((point)=><div key={point} style={{padding:"10px 12px",borderRadius:14,background:"rgba(247,247,247,.03)",border:"1px solid rgba(247,247,247,.08)"}}>• {point}</div>)}</div> : null}
      <button onClick={onUnlock} className="btn-strong" style={{width:"auto",marginTop:18}}>{cta}</button>
    </div>
  );
}


const LEARN_TOPICS = {
  signal: {
    title: "Signal",
    what: "A signal is the app’s combined read on posture, timing, and confidence for a specific asset.",
    why: "It helps you avoid staring at dozens of disconnected indicators and instead focus on a synthesized read.",
    appUse: "Midnight Signal blends momentum, trend, and volatility into a single posture and confidence score."
  },
  momentum: {
    title: "Momentum",
    what: "Momentum measures how strongly price is moving right now.",
    why: "Strong momentum often means traders are aligned in one direction, which can support continuation.",
    appUse: "Momentum is one of the biggest contributors to confidence and helps shape Enter / Wait / Reduce timing."
  },
  trend: {
    title: "Trend",
    what: "Trend is the direction and structure of the broader move, not just the latest candle.",
    why: "A strong trend can support price movement even when short-term noise appears.",
    appUse: "The app uses trend weighting to decide whether current strength is supported or fragile."
  },
  volatility: {
    title: "Volatility",
    what: "Volatility measures how erratic price movement is.",
    why: "Higher volatility can create opportunity, but it also lowers reliability and makes timing harder.",
    appUse: "Volatility affects confidence by reducing conviction when price action becomes unstable."
  },
  confidence: {
    title: "Confidence",
    what: "Confidence shows how aligned the signal components are.",
    why: "High confidence does not mean certainty. It means more parts of the setup are pointing in the same direction.",
    appUse: "Confidence is derived from the weighted signal components and powers the app’s ranking and guidance language."
  },
  posture: {
    title: "Posture",
    what: "Posture is the app’s directional stance: Bullish, Neutral, or Bearish.",
    why: "It helps users interpret the market state quickly before going deeper into the details.",
    appUse: "Posture is set from the weighted signal score and becomes the headline read across the dashboard."
  },
  timing: {
    title: "Timing",
    what: "Timing is the app’s action posture: Enter, Wait, or Reduce.",
    why: "It translates raw analysis into a more intuitive decision-support frame.",
    appUse: "Timing combines confidence, posture, and movement quality to suggest whether conditions are constructive or defensive."
  },
  risk: {
    title: "Risk Profile",
    what: "Risk Profile estimates how aggressive current movement feels.",
    why: "Two strong-looking signals can behave very differently if one is much more unstable.",
    appUse: "The app classifies recent movement into Low, Medium, or High risk to keep the signal grounded."
  },
  rsi: {
    title: "RSI",
    what: "RSI is a momentum oscillator often used to judge whether price is stretched.",
    why: "It can help explain whether momentum is overheating or still developing.",
    appUse: "Midnight Signal shows RSI as supporting context, not as a single source of truth."
  },
  sinceLastVisit: {
    title: "Since Your Last Visit",
    what: "This section compares the current snapshot against the last snapshot saved on your device.",
    why: "It gives returning users a quick answer to what changed without making them re-scan the whole dashboard.",
    appUse: "The app saves a local snapshot and surfaces posture shifts, confidence moves, notable movers, and top-signal changes."
  }
};

function trustColor(outcome) {
  if (outcome === "up") return "#00ff9d";
  if (outcome === "down") return "#ff4d4d";
  return "#94a3b8";
}

function computeTrust(entries) {
  const list = Array.isArray(entries) ? entries : [];
  if (!list.length) return { successRate: 0, total: 0 };
  let success = 0;
  for (const entry of list) {
    const bullishGood = entry.posture === "Bullish" && entry.outcome === "up";
    const bearishGood = entry.posture === "Bearish" && entry.outcome === "down";
    const neutralGood = entry.posture === "Neutral" && entry.outcome === "flat";
    if (bullishGood || bearishGood || neutralGood) success += 1;
  }
  return {
    successRate: Math.round((success / list.length) * 100),
    total: list.length,
  };
}


function timeframeAdjustedSignal(coin, timeframe) {
  const adjustments = {
    "5m": { momentum: 8, trend: -4, volatility: -3 },
    "15m": { momentum: 5, trend: 0, volatility: -1 },
    "1h": { momentum: 0, trend: 2, volatility: 0 },
    "4h": { momentum: -4, trend: 6, volatility: 1 },
  };
  const rule = adjustments[timeframe] || adjustments["1h"];
  const momentum = Math.max(0, Math.min(100, coin.breakdown.momentum + rule.momentum));
  const trend = Math.max(0, Math.min(100, coin.breakdown.trend + rule.trend));
  const volatility = Math.max(0, Math.min(100, coin.breakdown.volatility + rule.volatility));
  const confidence = Math.max(30, Math.min(90, Math.round(momentum * 0.4 + trend * 0.4 + volatility * 0.2)));
  const posture = confidence >= 65 ? "Bullish" : confidence <= 45 ? "Bearish" : "Neutral";
  return { timeframe, momentum, trend, volatility, confidence, posture };
}


function buildInterpretation(active, timeframeReads, mode) {
  if (!active || !timeframeReads?.length) return "";
  const bullish = timeframeReads.filter((r) => r.posture === "Bullish").length;
  const bearish = timeframeReads.filter((r) => r.posture === "Bearish").length;
  const shortBull = timeframeReads[0]?.posture === "Bullish" && timeframeReads[1]?.posture === "Bullish";
  const shortBear = timeframeReads[0]?.posture === "Bearish" && timeframeReads[1]?.posture === "Bearish";
  const longBull = timeframeReads[3]?.posture === "Bullish";
  const longBear = timeframeReads[3]?.posture === "Bearish";

  let primary = "This suggests a mixed setup that still needs stronger alignment before it feels convincing.";
  if (shortBull && longBear) primary = "This suggests short-term opportunity, but not full higher-timeframe conviction yet.";
  else if (shortBear && longBull) primary = "This suggests near-term weakness inside a stronger higher-timeframe structure.";
  else if (bullish >= 3) primary = "This suggests broad alignment across the stack, which supports a stronger bullish read.";
  else if (bearish >= 3) primary = "This suggests broad defensive alignment, which favors caution over aggressive entries.";
  else if (active.confidenceBand === "High" && active.posture === "Bullish") primary = "This suggests the signal has enough internal alignment to support a constructive read.";
  else if (active.confidenceBand === "Low") primary = "This suggests the setup still lacks enough alignment to trust aggressively.";

  let secondary = "It favors patience and context over reacting to a single number.";
  if (active.timing === "Enter" && active.posture === "Bullish") secondary = "It favors selective short-term opportunity while respecting the broader context.";
  else if (active.timing === "Reduce" || active.posture === "Bearish") secondary = "It favors defense first until the structure improves.";
  else if (active.posture === "Neutral") secondary = "It favors waiting for either momentum or trend to become clearer.";

  if (mode === "Pro") return `${primary} ${secondary}`;
  return `${primary} ${secondary}`;
}

function buildTimeframeInsight(reads) {
  const bullish = reads.filter((r) => r.posture === "Bullish").length;
  const bearish = reads.filter((r) => r.posture === "Bearish").length;
  const shortBull = reads[0]?.posture === "Bullish" && reads[1]?.posture === "Bullish";
  const longBear = reads[3]?.posture === "Bearish";
  const longBull = reads[3]?.posture === "Bullish";

  if (shortBull && longBear) return "Short-term momentum is bullish, but the higher timeframe still leans bearish. This suggests a bounce inside a broader defensive structure.";
  if (bullish >= 3) return "Most timeframes are aligned bullish, which gives the signal stronger structural support.";
  if (bearish >= 3) return "Most timeframes are aligned bearish, which makes the setup more defensive across the stack.";
  if (longBull && bullish >= 2) return "Higher timeframe structure is constructive, and shorter reads are beginning to align with it.";
  return "The timeframe stack is mixed, which means momentum and structure are not fully aligned yet.";
}

function buildTonightBrief(topSignal, visitDelta) {
  if (!topSignal) return null;
  const confidenceMove = visitDelta?.confidenceShifts?.find((item) => item.symbol === topSignal.symbol);
  const direction = topSignal.posture === "Bullish" ? "Bullish bias" : topSignal.posture === "Bearish" ? "Bearish bias" : "Neutral bias";
  const change = confidenceMove ? (confidenceMove.delta > 0 ? "Confidence rising" : confidenceMove.delta < 0 ? "Confidence softening" : "Confidence holding") : "Confidence steady";
  const keyDriver = topSignal.breakdown.trend >= topSignal.breakdown.momentum
    ? "higher-timeframe structure is doing more of the work"
    : "shorter-term momentum is carrying the move";
  return {
    direction,
    change,
    keyDriver,
    summary: `${direction} with ${topSignal.confidence}% confidence. ${change}. Key driver: ${keyDriver}.`,
  };
}

function buildDecisionLayer(topSignal, timeframeReads) {
  if (!topSignal) return null;
  const bullish = timeframeReads.filter((item) => item.posture === "Bullish").length;
  const bearish = timeframeReads.filter((item) => item.posture === "Bearish").length;
  let posture = "Stay patient";
  if (topSignal.posture === "Bullish" && topSignal.confidence >= 70) posture = "Lean long";
  else if (topSignal.posture === "Bearish" && topSignal.confidence <= 45) posture = "Stay defensive";
  else if (topSignal.posture === "Neutral") posture = "Wait for confirmation";

  const reasons = [
    bullish >= 3 ? "1h + 4h alignment is supportive" : bearish >= 3 ? "the higher-timeframe stack still leans defensive" : "the timeframe stack is still mixed",
    topSignal.breakdown.momentum >= 28 ? "momentum is doing enough work to matter" : "momentum still needs to prove itself",
    topSignal.risk === "Low" ? "risk remains relatively controlled" : topSignal.risk === "High" ? "risk is elevated, so conviction needs respect" : "risk is moderate, so position quality matters",
  ];

  return { posture, reasons };
}

function buildRitualLoop(topSignal, visitDelta) {
  if (!topSignal) return null;
  const leaderChanged = visitDelta?.prevTop && visitDelta?.nextTop && visitDelta.prevTop.symbol !== visitDelta.nextTop.symbol;
  const confidenceMove = visitDelta?.confidenceShifts?.find((item) => item.symbol === topSignal.symbol);
  return {
    opening: `${topSignal.symbol}: ${topSignal.posture} (${topSignal.confidence}%)`,
    checkpoint: leaderChanged ? `${visitDelta.prevTop.symbol} handed the lead to ${visitDelta.nextTop.symbol}.` : `${topSignal.symbol} is still leading tonight.`,
    momentum: confidenceMove ? (confidenceMove.delta > 0 ? "Confidence is stronger than your last visit." : confidenceMove.delta < 0 ? "Confidence has cooled since your last visit." : "Confidence is unchanged since your last visit.") : "No previous confidence snapshot yet.",
  };
}

function buildContextFallback(topSignal, watchlist) {
  if (!topSignal) return { sentiment: "neutral", drivers: [], news: [], pulse: [] };
  const symbol = topSignal.symbol;
  const posture = topSignal.posture;
  const confidence = topSignal.confidence;
  const watchText = Array.isArray(watchlist) && watchlist.length ? watchlist.slice(0, 3).join(", ") : "your watchlist";
  const sentiment = posture === "Bullish" ? "positive" : posture === "Bearish" ? "cautious" : "mixed";
  const drivers = posture === "Bullish"
    ? [
        `${symbol} is attracting stronger momentum flow across the active session.`,
        `Confidence is sitting at ${confidence}%, which means more of the signal stack is aligned tonight.`,
        `Watchlist focus remains tight around ${watchText}, keeping leadership concentrated instead of scattered.`
      ]
    : posture === "Bearish"
    ? [
        `${symbol} is losing alignment across the faster signal stack, which keeps the posture defensive.`,
        `Confidence is only ${confidence}%, so the setup still lacks broad confirmation.`,
        `Rotation across ${watchText} looks less supportive tonight, which weakens follow-through.`
      ]
    : [
        `${symbol} is holding a mixed posture while momentum and structure continue to negotiate.`,
        `Confidence is ${confidence}%, which points to partial alignment but not a decisive push yet.`,
        `${watchText} are still providing useful context, but leadership is not fully separating from the pack.`
      ];

  const news = [
    { title: `${symbol} market structure firms as traders look for cleaner confirmation`, source: "Market Context", href: "https://example.com/context-1" },
    { title: symbol === "ADA" ? "Cardano ecosystem chatter turns back toward Midnight and privacy tooling" : `${symbol} sentiment firms as ecosystem updates improve near-term attention`, source: "Ecosystem Wire", href: "https://example.com/context-2" },
    { title: `Macro risk appetite remains a key swing factor for ${symbol} tonight`, source: "Signal Desk", href: "https://example.com/context-3" },
  ];

  const pulse = [
    { text: `${symbol} looks stronger when multi-timeframe alignment starts holding instead of fading.`, source: "Community Pulse" },
    { text: symbol === "ADA" ? "Builders are talking more about Cardano depth and Midnight privacy narratives again." : `${symbol} is back in rotation talk as traders look for higher-quality setups.`, source: "X summary" },
    { text: posture === "Bullish" ? "The tone is constructive, but traders still want confirmation before pressing size." : posture === "Bearish" ? "The tone is cautious, with traders focusing on risk management first." : "The tone is split, with traders waiting for a cleaner break in either direction.", source: "Desk read" },
  ];

  return { sentiment, drivers, news, pulse };
}

export default function Page(){
  const [agreed, setAgreed] = useState(false);
  const [checkedEducation, setCheckedEducation] = useState(false);
  const [checkedRisk, setCheckedRisk] = useState(false);
  const [mode, setMode] = useState("Beginner");
  const [strategy, setStrategy] = useState("swing");
  const [timeframe, setTimeframe] = useState("30");
  const [watchlist, setWatchlist] = useState(["BTC","ETH","ADA"]);
  const [selected, setSelected] = useState("BTC");
  const [soundOn, setSoundOn] = useState(false);
  const [coins, setCoins] = useState(() => SEED.map(enrich));
    const [lastInsight, setLastInsight] = useState("");
  const [visitDelta, setVisitDelta] = useState(null);
  const [lastSeenAt, setLastSeenAt] = useState("");
  const [returnBanner, setReturnBanner] = useState("");
  const [hoursAway, setHoursAway] = useState(0);
  const [streakCount, setStreakCount] = useState(1);
  const [isPremium, setIsPremium] = useState(false);
  const [email, setEmail] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [unlockSeenAt, setUnlockSeenAt] = useState("");
  const [learnOpen, setLearnOpen] = useState(false);
  const [learnTopic, setLearnTopic] = useState("signal");
  const [assetPanelOpen, setAssetPanelOpen] = useState(false);
  const [signalHistory, setSignalHistory] = useState({});
  const [dataSource, setDataSource] = useState("seed");
  const [marketUpdatedAt, setMarketUpdatedAt] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshOn, setAutoRefreshOn] = useState(true);
  const [refreshMessage, setRefreshMessage] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [topPulseOn, setTopPulseOn] = useState(false);
  const [watchPulseSymbol, setWatchPulseSymbol] = useState("");
  const [alertFeedback, setAlertFeedback] = useState("");
  const [signalContext, setSignalContext] = useState(() => buildContextFallback(null, []));
  const [contextLoading, setContextLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const previousCoinsRef = useRef([]);
  const isDevBuild = process.env.NODE_ENV === "development";

  // === CORE ACTIONS ===
  async function startCheckout() {
    setCheckoutError("");
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok || !data?.url) {
        throw new Error(data?.message || "Unable to start checkout.");
      }

      window.location.href = data.url;
    } catch (error) {
      setCheckoutError(error?.message || "Unable to start checkout right now.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  function unlockLocally() {
    setCheckoutError("");
    setIsPremium(true);
    const seenAt = new Date().toLocaleString();
    setUnlockSeenAt(seenAt);
    try {
      window.localStorage.setItem(STORAGE_KEYS.premium, "true");
      window.localStorage.setItem(STORAGE_KEYS.unlockSeenAt, seenAt);
    } catch {}
  }

  useEffect(() => {
    if (!isDevBuild || typeof window === "undefined") return undefined;
    window.unlockLocally = unlockLocally;
    return () => {
      try { delete window.unlockLocally; } catch {}
    };
  }, [isDevBuild]);

  function playPing(intensity = "soft") {
    if (!soundOn) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = intensity === "bright" ? "triangle" : "sine";
      osc.frequency.value = intensity === "bright" ? 988 : 880;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.028, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (intensity === "bright" ? 0.18 : 0.12));
      osc.stop(ctx.currentTime + (intensity === "bright" ? 0.2 : 0.14));
    } catch {}
  }

  function fireAlertFeedback(message, symbol = "") {
    setAlertFeedback(message);
    setWatchPulseSymbol(symbol);
    window.setTimeout(() => setAlertFeedback(""), 2200);
    if (symbol) window.setTimeout(() => setWatchPulseSymbol((current) => current === symbol ? "" : current), 1000);
  }

  async function loadMarket(reason = "manual") {
    setIsRefreshing(true);
    setRefreshMessage(reason === "auto" ? "Refreshing market data..." : "Updating market data...");
    try {
      const res = await fetch("/api/market", { cache: "no-store" });
      const data = await res.json();

      if (data?.ok && Array.isArray(data.items) && data.items.length) {
        const nextCoins = data.items.map((item, index) =>
          enrich([item.symbol, item.name, item.price, item.change24h, item.volumeNum, item.rank], index)
        );
        setCoins(nextCoins);
        setDataSource("coingecko");
        const latest = data.items.find((item) => item.lastUpdated)?.lastUpdated;
        if (latest) {
          setMarketUpdatedAt(new Date(latest).toLocaleString());
        } else {
          setMarketUpdatedAt(new Date().toLocaleString());
        }
        setRefreshMessage(reason === "auto" ? "Live data refreshed." : "Market data updated.");
      } else {
        setDataSource("seed");
        setRefreshMessage("Using fallback seed data.");
      }
    } catch {
      setDataSource("seed");
      setRefreshMessage("Refresh failed. Using fallback seed data.");
    } finally {
      setIsRefreshing(false);
      window.setTimeout(() => setRefreshMessage(""), 2200);
    }
  }

  useEffect(() => {
    loadMarket("load");
  }, []);

  useEffect(() => {
    if (!autoRefreshOn) return;
    const id = window.setInterval(() => {
      loadMarket("auto");
    }, 90000);
    return () => window.clearInterval(id);
  }, [autoRefreshOn]);

  useEffect(() => {
    try {
      setAgreed(window.localStorage.getItem(STORAGE_KEYS.agreed)==="true");
      setMode(window.localStorage.getItem(STORAGE_KEYS.mode)||"Beginner");
      setStrategy(window.localStorage.getItem(STORAGE_KEYS.strategy)||"swing");
      setTimeframe(window.localStorage.getItem(STORAGE_KEYS.timeframe)||"30");
      setSelected(window.localStorage.getItem(STORAGE_KEYS.selectedAsset)||"BTC");
      setSoundOn(window.localStorage.getItem(STORAGE_KEYS.sound)==="true");
      const raw=window.localStorage.getItem(STORAGE_KEYS.watchlist);
      if(raw){ const parsed=JSON.parse(raw); if(Array.isArray(parsed)&&parsed.every((x)=>typeof x==="string")) setWatchlist(parsed); }
      setLastInsight(window.localStorage.getItem("ms_last_insight")||"");
      setIsPremium(window.localStorage.getItem(STORAGE_KEYS.premium)==="true");
      setEmail(window.localStorage.getItem(STORAGE_KEYS.email)||"");
      setUnlockSeenAt(window.localStorage.getItem(STORAGE_KEYS.unlockSeenAt)||"");
      const storedMode = window.localStorage.getItem(STORAGE_KEYS.mode)||"Beginner";
      if (storedMode === "Beginner") setLearnOpen(true);
      const hasOnboarded = window.localStorage.getItem("ms_onboarded") === "true";
      if (!hasOnboarded) {
        setShowOnboarding(true);
        setOnboardingStep(0);
      }
      const rawHistory = window.localStorage.getItem(STORAGE_KEYS.history);
      if (rawHistory) {
        const parsed = JSON.parse(rawHistory);
        if (parsed && typeof parsed === "object") setSignalHistory(parsed);
      }
      const savedAuto = window.localStorage.getItem(STORAGE_KEYS.autoRefresh);
      if (savedAuto !== null) setAutoRefreshOn(savedAuto === "true");
      const rawAlerts = window.localStorage.getItem(STORAGE_KEYS.alerts);
      if (rawAlerts) setAlerts(JSON.parse(rawAlerts));

      const now = Date.now();
      const previousVisitRaw = window.localStorage.getItem(STORAGE_KEYS.lastVisitTs);
      const previousStreakRaw = Number(window.localStorage.getItem(STORAGE_KEYS.streakCount) || "1");
      if (previousVisitRaw) {
        const previousVisit = Number(previousVisitRaw);
        if (Number.isFinite(previousVisit) && previousVisit > 0) {
          const elapsedHours = (now - previousVisit) / 36e5;
          setHoursAway(elapsedHours);
          if (elapsedHours >= 6) {
            setReturnBanner(`🌙 You’re back. Markets shifted while you were away${elapsedHours >= 24 ? ` — about ${Math.round(elapsedHours / 24)} day${Math.round(elapsedHours / 24) === 1 ? "" : "s"}` : ` — about ${Math.max(1, Math.round(elapsedHours))} hour${Math.round(elapsedHours) === 1 ? "" : "s"}`}.`);
          }
          let nextStreak = 1;
          if (elapsedHours >= 12 && elapsedHours <= 36) nextStreak = Math.max(1, previousStreakRaw || 1) + 1;
          else if (elapsedHours < 12) nextStreak = Math.max(1, previousStreakRaw || 1);
          setStreakCount(nextStreak);
          window.localStorage.setItem(STORAGE_KEYS.streakCount, String(nextStreak));
        }
      } else {
        setStreakCount(Math.max(1, previousStreakRaw || 1));
      }
      window.localStorage.setItem(STORAGE_KEYS.lastVisitTs, String(now));

    } catch {}
  }, []);
  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEYS.mode, mode); } catch {} }, [mode]);
  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEYS.strategy, strategy); } catch {} }, [strategy]);
  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEYS.timeframe, timeframe); } catch {} }, [timeframe]);
  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEYS.selectedAsset, selected); } catch {} }, [selected]);
  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEYS.watchlist, JSON.stringify(watchlist)); } catch {} }, [watchlist]);
  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEYS.sound, soundOn ? "true" : "false"); } catch {} }, [soundOn]);
  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEYS.email, email); } catch {} }, [email]);
  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEYS.autoRefresh, autoRefreshOn ? "true" : "false"); } catch {} }, [autoRefreshOn]);


  useEffect(() => {
    try {
      const rawSnapshot = window.localStorage.getItem(STORAGE_KEYS.snapshot);
      const rawSeenAt = window.localStorage.getItem(STORAGE_KEYS.seenAt);
      if (rawSeenAt) setLastSeenAt(rawSeenAt);
      if (!rawSnapshot) return;
      const prev = JSON.parse(rawSnapshot);
      if (!Array.isArray(prev)) return;

      const prevMap = new Map(prev.map((item) => [item.symbol, item]));
      const current = SEED.map(enrich);

      const postureChanges = [];
      const confidenceShifts = [];
      const movers = current
        .map((c) => ({ symbol: c.symbol, name: c.name, change24h: c.change24h, confidence: c.confidence }))
        .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))
        .slice(0, 4);

      for (const coin of current) {
        const oldCoin = prevMap.get(coin.symbol);
        if (!oldCoin) continue;
        if (oldCoin.posture !== coin.posture) {
          postureChanges.push({
            symbol: coin.symbol,
            from: oldCoin.posture,
            to: coin.posture,
            confidenceDelta: coin.confidence - oldCoin.confidence,
          });
        }
        const confidenceDelta = coin.confidence - oldCoin.confidence;
        if (Math.abs(confidenceDelta) >= 4) {
          confidenceShifts.push({
            symbol: coin.symbol,
            from: oldCoin.confidence,
            to: coin.confidence,
            delta: confidenceDelta,
            posture: coin.posture,
          });
        }
      }

      confidenceShifts.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
      postureChanges.sort((a, b) => Math.abs(b.confidenceDelta) - Math.abs(a.confidenceDelta));

      const prevTop = prev.slice().sort((a, b) => b.confidence - a.confidence)[0];
      const nextTop = current.slice().sort((a, b) => b.confidence - a.confidence)[0];

      setVisitDelta({
        postureChanges: postureChanges.slice(0, 5),
        confidenceShifts: confidenceShifts.slice(0, 5),
        movers,
        prevTop,
        nextTop,
      });
    } catch {}
  }, []);


  
  useEffect(() => {
    const priorCoins = Array.isArray(previousCoinsRef.current) ? previousCoinsRef.current : [];
    const priorMap = new Map(priorCoins.map((coin) => [coin.symbol, coin]));

    try {
      const previousAlerts = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.alerts) || "[]");
      const nextAlerts = Array.isArray(previousAlerts) ? [...previousAlerts] : [];

      for (const coin of coins) {
        const previousCoin = priorMap.get(coin.symbol);
        const crossedHighConfidence = coin.confidence >= 75 && (!previousCoin || previousCoin.confidence < 75);
        const watchlistShift = watchlist.includes(coin.symbol) && previousCoin && previousCoin.posture !== coin.posture;

        if (!crossedHighConfidence && !watchlistShift) continue;

        const type = watchlistShift ? "watchlist" : previousCoin ? "surge" : "leader";
        const priority = watchlist.includes(coin.symbol) ? "HIGH" : "normal";
        const text = watchlistShift
          ? `${coin.symbol} moved from ${previousCoin.posture} to ${coin.posture} on your watchlist.`
          : `${coin.symbol} is flashing ${coin.confidence}% confidence.`;

        nextAlerts.push({
          id: `${Date.now()}-${coin.symbol}-${type}`,
          symbol: coin.symbol,
          priority,
          type,
          text,
          confidence: coin.confidence,
          posture: coin.posture,
          ts: Date.now()
        });

        fireAlertFeedback(`Watching ${coin.symbol} — signal shift captured.`, coin.symbol);
        playPing(priority === "HIGH" ? "bright" : "soft");
      }

      const trimmed = nextAlerts.slice(-24);
      setAlerts(trimmed);
      window.localStorage.setItem(STORAGE_KEYS.alerts, JSON.stringify(trimmed));
    } catch {}

    previousCoinsRef.current = coins;
  }, [coins, watchlist, soundOn]);
useEffect(() => {
    try {
      const previousRaw = window.localStorage.getItem(STORAGE_KEYS.history);
      const previous = previousRaw ? JSON.parse(previousRaw) : {};
      const nextHistory = { ...previous };

      for (const coin of coins) {
        const list = Array.isArray(nextHistory[coin.symbol]) ? nextHistory[coin.symbol] : [];
        const nextEntry = {
          ts: Date.now(),
          posture: coin.posture,
          confidence: coin.confidence,
          change24h: coin.change24h,
          outcome: coin.change24h >= 1 ? "up" : coin.change24h <= -1 ? "down" : "flat",
        };

        const last = list[list.length - 1];
        const shouldAppend =
          !last ||
          last.posture !== nextEntry.posture ||
          Math.abs((last.confidence || 0) - nextEntry.confidence) >= 3 ||
          last.outcome !== nextEntry.outcome;

        const updated = shouldAppend ? [...list, nextEntry].slice(-10) : list;
        nextHistory[coin.symbol] = updated;
      }

      setSignalHistory(nextHistory);
      window.localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(nextHistory));
    } catch {}
  }, [coins]);

  useEffect(() => {
    try {
      const snapshot = coins.map((coin) => ({
        symbol: coin.symbol,
        posture: coin.posture,
        confidence: coin.confidence,
        change24h: coin.change24h,
      }));
      window.localStorage.setItem(STORAGE_KEYS.snapshot, JSON.stringify(snapshot));
      window.localStorage.setItem(STORAGE_KEYS.seenAt, new Date().toLocaleString());
    } catch {}
  }, [coins]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setCoins((prev) => prev.map((coin, i) => {
        const nextPrice = Math.max(0.0001, coin.price * (1 + (Math.random() - 0.5) * 0.02));
        const nextChange = Math.max(-12, Math.min(12, coin.change24h + (Math.random() - 0.5) * 1.2));
        return enrich([coin.symbol, coin.name, Number(nextPrice.toFixed(coin.price >= 1 ? 2 : 4)), Number(nextChange.toFixed(1)), coin.volumeNum], i);
      }));
    }, 5000);

    return () => window.clearInterval(id);
  }, []);

  function openLearn(topic) {
    setLearnTopic(topic);
    setLearnOpen(true);
  }

  function toggleWatch(symbol) {
    setWatchlist((prev) => {
      if (prev.includes(symbol)) {
        fireAlertFeedback(`${symbol} removed from your watchlist.`);
        return prev.filter((s) => s !== symbol);
      }
      fireAlertFeedback(`Watching ${symbol} — will notify on signal shift.`, symbol);
      return [...prev, symbol];
    });
  }

  function openAsset(symbol, topic = "confidence") {
    setSelected(symbol);
    setAssetPanelOpen(true);
    if (mode === "Beginner") {
      setLearnTopic(topic);
    }
  }

  function acceptAgreement() {
    if (!checkedEducation || !checkedRisk) return;
    setAgreed(true);
    try {
      window.localStorage.setItem(STORAGE_KEYS.agreed, "true");
    } catch {}
  }


  function chooseMode(nextMode) {
    setMode(nextMode);
    setLearnOpen(nextMode === "Beginner");
  }

  function finishOnboarding() {
    setShowOnboarding(false);
    setOnboardingStep(0);
    try {
      window.localStorage.setItem("ms_onboarded", "true");
    } catch {}
    fireAlertFeedback("Your setup is saved. Tonight’s signal now reflects your preferences.");
  }

  function nextOnboardingStep() {
    if (onboardingStep >= 4) {
      finishOnboarding();
      return;
    }
    setOnboardingStep((step) => step + 1);
  }

  function backOnboardingStep() {
    setOnboardingStep((step) => Math.max(0, step - 1));
  }

  const ordered = useMemo(() => {
    const source = Array.isArray(coins) ? coins : [];
    const pinned = Array.isArray(watchlist) ? watchlist : [];
    const sorted = [...source].sort((a, b) => b.confidence - a.confidence);
    sorted.sort((a, b) => pinned.includes(a.symbol) === pinned.includes(b.symbol) ? 0 : pinned.includes(a.symbol) ? -1 : 1);
    return sorted;
  }, [coins, watchlist]);

  const topSignal = ordered[0] || null;
  const active = ordered.find((c) => c.symbol === selected) || topSignal;
  const activeTopic = LEARN_TOPICS[learnTopic] || LEARN_TOPICS.signal;
  const assetHistory = active ? (signalHistory[active.symbol] || []) : [];
  const trustStats = computeTrust(assetHistory);
  const timeframeReads = active ? ["5m", "15m", "1h", "4h"].map((tf) => timeframeAdjustedSignal(active, tf)) : [];
  const timeframeInsight = buildTimeframeInsight(timeframeReads);
  const interpretationText = buildInterpretation(active, timeframeReads, mode);
  const tonightBrief = buildTonightBrief(topSignal, visitDelta);
  const decisionLayer = buildDecisionLayer(topSignal, timeframeReads);
  const ritualLoop = buildRitualLoop(topSignal, visitDelta);
  const watchlistRetentionHits = (watchlist || []).map((symbol) => {
    const postureHit = visitDelta?.postureChanges?.find((item) => item.symbol === symbol);
    const confidenceHit = visitDelta?.confidenceShifts?.find((item) => item.symbol === symbol);
    if (postureHit) return { symbol, tone: postureHit.to === "Bullish" ? "up" : postureHit.to === "Bearish" ? "down" : "flat", text: `${symbol} shifted from ${postureHit.from} to ${postureHit.to}.` };
    if (confidenceHit) return { symbol, tone: confidenceHit.delta > 0 ? "up" : confidenceHit.delta < 0 ? "down" : "flat", text: `${symbol} ${confidenceHit.delta > 0 ? "strengthening" : confidenceHit.delta < 0 ? "weakening" : "holding steady"} (${confidenceHit.delta > 0 ? "+" : ""}${confidenceHit.delta}%).` };
    return null;
  }).filter(Boolean).slice(0, 3);
  const interestingCallout = visitDelta?.confidenceShifts?.[0]
    ? `${visitDelta.confidenceShifts[0].symbol} is ${visitDelta.confidenceShifts[0].delta > 0 ? "strengthening" : "cooling"} the fastest since your last visit.`
    : topSignal
      ? `${topSignal.symbol} is still setting the pace for tonight’s read.`
      : "Build one more session and the dashboard will start highlighting what changed while you were away.";
  const topAccent = topSignal ? postureAccent(topSignal.posture, topSignal.confidence) : { color: "#fff", glow: "none" };
  const activeAccent = active ? postureAccent(active.posture, active.confidence) : { color: "#fff", glow: "none" };

  const bullishCount = ordered.filter((coin) => coin.posture === "Bullish").length;
  const bearishCount = ordered.filter((coin) => coin.posture === "Bearish").length;
  const averageConfidence = ordered.length ? Math.round(ordered.reduce((sum, coin) => sum + coin.confidence, 0) / ordered.length) : 0;
  const watchlistCount = watchlist.length;
  const onboardingAssetOptions = ordered.slice(0, 8).map((coin) => coin.symbol);
  const onboardingStepMeta = [
    { eyebrow: "Welcome", title: "Welcome to Midnight Signal", body: "This isn’t just data. We translate market noise into a clear nightly signal." },
    { eyebrow: "Style", title: "How do you trade?", body: "Choose the level of guidance you want every time you check in." },
    { eyebrow: "Assets", title: "What do you want to track?", body: "Pick the assets you want Midnight Signal to keep near the top." },
    { eyebrow: "Timeframe", title: "Your focus", body: "Set the lens that should shape your nightly read." },
    { eyebrow: "Ready", title: "You’re set.", body: "Let’s see what the signal looks like tonight." },
  ];

  const stats = [
    ["Tracked Assets", `${ordered.length}`],
    ["Bullish Signals", `${bullishCount}`],
    ["Bearish Signals", `${bearishCount}`],
    ["Avg Confidence", `${averageConfidence}%`],
  ];

  useEffect(() => {
    if (!topSignal) return;
    let cancelled = false;
    setContextLoading(true);
    fetch(`/api/context?symbol=${encodeURIComponent(topSignal.symbol)}&posture=${encodeURIComponent(topSignal.posture)}&confidence=${encodeURIComponent(String(topSignal.confidence))}&watchlist=${encodeURIComponent((watchlist || []).join(","))}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.ok && data?.context) setSignalContext(data.context);
        else setSignalContext(buildContextFallback(topSignal, watchlist));
      })
      .catch(() => {
        if (!cancelled) setSignalContext(buildContextFallback(topSignal, watchlist));
      })
      .finally(() => {
        if (!cancelled) setContextLoading(false);
      });
    return () => { cancelled = true; };
  }, [topSignal?.symbol, topSignal?.posture, topSignal?.confidence, watchlist.join(",")]);

  useEffect(() => {
    if (!topSignal) return;
    if (topSignal.symbol !== lastInsight) {
      setLastInsight(topSignal.symbol);
      setTopPulseOn(true);
      try {
        window.localStorage.setItem("ms_last_insight", topSignal.symbol);
      } catch {}
      fireAlertFeedback(`${topSignal.symbol} just took the lead tonight.`, topSignal.symbol);
      playPing("bright");
      window.setTimeout(() => setTopPulseOn(false), 900);
    }
  }, [topSignal?.symbol, lastInsight]);

  return (
    <main style={{minHeight:"100vh",color:"#f7f7f7",background:"radial-gradient(circle at top, rgba(42,107,255,.14), transparent 28%), linear-gradient(135deg, #0d1530 0%, #181c2f 45%, #0f1330 100%)",padding:"24px 0 40px"}}>
      <style>{`
        .ms-wrap{max-width:1320px;margin:0 auto;padding:0 24px;display:grid;gap:20px}
        .ms-card{background:rgba(24,28,47,.82);border:1px solid rgba(247,247,247,.1);border-radius:28px;box-shadow:0 20px 80px rgba(0,0,0,.35);backdrop-filter:blur(18px);padding:24px}
        .ms-grid{display:grid;gap:20px}.ms-hero{grid-template-columns:1.4fr 1fr}.ms-stats{grid-template-columns:repeat(4,minmax(0,1fr))}.ms-watch{grid-template-columns:repeat(3,minmax(0,1fr))}.ms-coins{grid-template-columns:repeat(4,minmax(0,1fr))}.ms-context{grid-template-columns:1.05fr .95fr}
        .ms-row{display:flex;gap:14px;align-items:center;justify-content:space-between}.ms-title{font-size:32px;font-weight:800;letter-spacing:-.03em;margin:0}.ms-sub{font-size:14px;color:rgba(247,247,247,.62)}
        .ms-metric{border:1px solid rgba(247,247,247,.08);background:rgba(247,247,247,.04);border-radius:18px;padding:16px}.ms-metric-label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:rgba(247,247,247,.55)}.ms-metric-value{margin-top:8px;font-size:24px;font-weight:700}
        .coin-btn{border:1px solid rgba(247,247,247,.08);background:rgba(24,28,47,.78);border-radius:24px;padding:18px;box-shadow:0 14px 50px rgba(0,0,0,.32);display:grid;gap:12px;text-align:left;color:#fff;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease,opacity .18s ease;cursor:pointer}
        .coin-btn:hover{transform:translateY(-3px);box-shadow:0 20px 56px rgba(0,0,0,.38),0 0 0 1px rgba(139,168,255,.14);border-color:rgba(139,168,255,.28)} .coin-btn.active{border-color:rgba(139,168,255,.65);box-shadow:0 0 0 2px rgba(139,168,255,.18),0 14px 50px rgba(0,0,0,.32)} .coin-btn.dim{opacity:.86}
        .watch-card{border:1px solid rgba(96,103,249,.35);background:linear-gradient(135deg, rgba(96,103,249,.16), rgba(0,51,173,.18));border-radius:24px;padding:16px;text-align:left;color:#fff;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}.watch-card:hover{transform:translateY(-2px);box-shadow:0 16px 44px rgba(0,0,0,.28)}.watch-card.priority{border-color:rgba(0,255,157,.28);box-shadow:0 0 0 1px rgba(0,255,157,.12), 0 16px 44px rgba(0,0,0,.28)}
        .top-signal-shell{position:relative;overflow:hidden}.top-signal-shell::after{content:"";position:absolute;inset:-120px;pointer-events:none;background:radial-gradient(circle, rgba(139,168,255,.08) 0%, rgba(139,168,255,0) 58%);opacity:.5}.top-signal-shell::before{content:"";position:absolute;inset:18% 30%;border-radius:999px;border:1px solid rgba(139,168,255,.18);box-shadow:0 0 0 14px rgba(139,168,255,.03),0 0 0 30px rgba(139,168,255,.02);opacity:.7;pointer-events:none}.top-signal-shell.signal-pulse{animation:signalPulse .9s ease-in-out;box-shadow:0 0 0 1px rgba(139,168,255,.18),0 24px 80px rgba(0,0,0,.35)}
        @keyframes signalPulse{0%{transform:scale(1)}35%{transform:scale(1.012)}100%{transform:scale(1)}}
        @keyframes watchPulse{0%{transform:scale(1)}50%{transform:scale(1.018)}100%{transform:scale(1)}}
        .watch-pulse{animation:watchPulse .8s ease-in-out;box-shadow:0 0 0 1px rgba(0,255,157,.16),0 18px 48px rgba(0,0,0,.3)}
        .alert-toast{position:fixed;left:24px;bottom:24px;z-index:75;min-width:min(380px,calc(100vw - 40px));max-width:460px;padding:14px 16px;border-radius:18px;border:1px solid rgba(139,168,255,.22);background:linear-gradient(135deg, rgba(11,18,39,.96), rgba(24,28,47,.94));box-shadow:0 20px 60px rgba(0,0,0,.35);backdrop-filter:blur(16px)}
        .focus-chip{border-radius:16px;padding:12px 14px;font-weight:900;font-size:22px}.btn,.select{width:100%;padding:11px 14px;border-radius:16px;border:1px solid rgba(247,247,247,.12);background:rgba(247,247,247,.04);color:#fff}.btn-strong{border:0;cursor:pointer;padding:12px 16px;border-radius:14px;font-weight:800;background:linear-gradient(135deg,#2563eb,#4f46e5);color:white}
.learn-fab{position:fixed;right:24px;bottom:24px;z-index:55;border:1px solid rgba(139,168,255,.28);background:linear-gradient(135deg, rgba(96,103,249,.92), rgba(0,51,173,.92));color:#fff;border-radius:999px;padding:14px 18px;font-weight:800;box-shadow:0 18px 50px rgba(0,0,0,.35);cursor:pointer}.learn-panel{position:fixed;top:0;right:0;height:100vh;width:min(420px,92vw);z-index:70;background:rgba(11,18,39,.96);border-left:1px solid rgba(247,247,247,.1);backdrop-filter:blur(14px);box-shadow:-18px 0 60px rgba(0,0,0,.4);transform:translateX(0);display:grid;grid-template-rows:auto 1fr}.learn-panel-body{overflow:auto;padding:20px 20px 28px}.learn-chip{border:1px solid rgba(247,247,247,.1);background:rgba(247,247,247,.04);color:#fff;border-radius:999px;padding:9px 12px;font-size:12px;font-weight:700;cursor:pointer}.learn-chip.active{border-color:rgba(139,168,255,.45);background:rgba(96,103,249,.16);color:#dbe8ff}.learn-hot{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:999px;border:1px solid rgba(139,168,255,.28);background:rgba(96,103,249,.12);color:#dbe8ff;font-size:11px;font-weight:800;cursor:pointer;margin-left:8px;vertical-align:middle}.learn-overlay{position:fixed;inset:0;background:rgba(0,0,0,.36);z-index:65}
.asset-overlay{position:fixed;inset:0;background:rgba(0,0,0,.42);z-index:57}.asset-panel{position:fixed;top:0;right:0;height:100vh;width:min(520px,96vw);z-index:58;background:rgba(11,18,39,.98);border-left:1px solid rgba(247,247,247,.1);backdrop-filter:blur(14px);box-shadow:-18px 0 60px rgba(0,0,0,.4);display:grid;grid-template-rows:auto 1fr}.asset-panel-body{overflow:auto;padding:20px 20px 30px}.asset-sheet-handle{width:56px;height:6px;border-radius:999px;background:rgba(247,247,247,.18);margin:0 auto 12px}.asset-clickable{cursor:pointer}@media (max-width:700px){.asset-panel{top:auto;right:0;left:0;bottom:0;height:min(78vh,720px);width:100%;border-left:0;border-top:1px solid rgba(247,247,247,.1);border-top-left-radius:24px;border-top-right-radius:24px;box-shadow:0 -18px 60px rgba(0,0,0,.45)} .learn-fab{right:14px;bottom:14px}}
        @media (max-width:1100px){.ms-hero,.ms-stats,.ms-watch,.ms-coins{grid-template-columns:repeat(2,minmax(0,1fr))}} @media (max-width:700px){.ms-wrap{padding:0 14px}.ms-hero,.ms-stats,.ms-watch,.ms-coins{grid-template-columns:1fr}.ms-row{flex-direction:column;align-items:stretch}.ms-title{font-size:26px}}
      `}</style>

      {!agreed && <div style={{position:"fixed",inset:0,zIndex:60,display:"grid",placeItems:"center",background:"rgba(0,0,0,.72)",backdropFilter:"blur(8px)",padding:20}}><div className="ms-card" style={{maxWidth:560,width:"100%"}}><div style={{fontSize:13,color:"#93c5fd",fontWeight:700,marginBottom:10}}>AGREEMENT OF UNDERSTANDING</div><h1 style={{margin:0,fontSize:34,lineHeight:1.05,marginBottom:14}}>Midnight Signal is educational, not financial advice.</h1><p style={{color:"#cbd5e1",lineHeight:1.7,marginBottom:22}}>This product helps you interpret market posture, confluence, and confidence in a cleaner way. It does not guarantee outcomes and should not replace your own judgment.</p><div style={{display:"grid",gap:14,background:"rgba(15,23,42,0.55)",border:"1px solid rgba(148,163,184,0.12)",borderRadius:18,padding:16,marginBottom:20}}><label style={{display:"flex",gap:12,alignItems:"flex-start"}}><input type="checkbox" checked={checkedEducation} onChange={(e)=>setCheckedEducation(e.target.checked)} style={{marginTop:4}}/><span style={{color:"#e2e8f0",lineHeight:1.6}}>I understand Midnight Signal is an educational tool and not a trade recommendation engine.</span></label><label style={{display:"flex",gap:12,alignItems:"flex-start"}}><input type="checkbox" checked={checkedRisk} onChange={(e)=>setCheckedRisk(e.target.checked)} style={{marginTop:4}}/><span style={{color:"#e2e8f0",lineHeight:1.6}}>I understand markets are risky and I remain fully responsible for my own decisions.</span></label></div><div style={{display:"flex",gap:12,flexWrap:"wrap"}}><button onClick={acceptAgreement} disabled={!checkedEducation||!checkedRisk} className="btn-strong" style={{opacity:checkedEducation&&checkedRisk?1:.55,cursor:checkedEducation&&checkedRisk?"pointer":"not-allowed"}}>Agree and Enter</button></div></div></div>}

      {agreed && showOnboarding && <div style={{position:"fixed",inset:0,zIndex:58,display:"grid",placeItems:"center",background:"rgba(3,7,18,.72)",backdropFilter:"blur(8px)",padding:20}}><div className="ms-card" style={{maxWidth:720,width:"100%",padding:28}}><div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center",marginBottom:18}}><div><div style={{fontSize:12,letterSpacing:".14em",textTransform:"uppercase",color:"#93c5fd",fontWeight:700,marginBottom:8}}>{onboardingStepMeta[onboardingStep].eyebrow}</div><h2 style={{margin:0,fontSize:34,lineHeight:1.05}}>{onboardingStepMeta[onboardingStep].title}</h2></div><div style={{fontSize:13,color:"rgba(247,247,247,.56)"}}>Step {onboardingStep + 1} / {onboardingStepMeta.length}</div></div><p style={{color:"#cbd5e1",lineHeight:1.7,margin:"0 0 18px"}}>{onboardingStepMeta[onboardingStep].body}</p><div style={{display:"flex",gap:8,marginBottom:18}}>{onboardingStepMeta.map((_, index)=><span key={index} style={{height:8,flex:1,borderRadius:999,background:index <= onboardingStep ? "linear-gradient(90deg, #2563eb, #4f46e5)" : "rgba(247,247,247,.08)"}}></span>)}</div>{onboardingStep === 0 ? <div style={{padding:18,borderRadius:20,background:"linear-gradient(135deg, rgba(96,103,249,.12), rgba(13,21,48,.82))",border:"1px solid rgba(139,168,255,.18)"}}><div style={{fontSize:15,color:"#e2e8f0",lineHeight:1.8}}>We help you read the market faster with a nightly brief, a suggested posture, and a cleaner view of what changed since your last visit.</div></div> : null}{onboardingStep === 1 ? <div style={{display:"grid",gridTemplateColumns:"repeat(2, minmax(0, 1fr))",gap:14}}>{["Beginner","Pro"].map((option)=><button key={option} type="button" onClick={()=>chooseMode(option)} style={{textAlign:"left",padding:18,borderRadius:20,border:mode===option?"1px solid rgba(96,103,249,.55)":"1px solid rgba(247,247,247,.1)",background:mode===option?"linear-gradient(135deg, rgba(96,103,249,.18), rgba(13,21,48,.88))":"rgba(247,247,247,.03)",color:"#fff",cursor:"pointer"}}><div style={{fontSize:18,fontWeight:800,marginBottom:8}}>{option}</div><div className="ms-sub" style={{lineHeight:1.7,color:"#dbeafe"}}>{option === "Beginner" ? "Guided explanations, glossary support, and a softer learning curve." : "Cleaner, tighter signal reads with less educational scaffolding."}</div></button>)}</div> : null}{onboardingStep === 2 ? <div style={{display:"grid",gridTemplateColumns:"repeat(4, minmax(0, 1fr))",gap:12}}>{onboardingAssetOptions.map((symbol)=>{const activePick = watchlist.includes(symbol); return <button key={symbol} type="button" onClick={()=>toggleWatch(symbol)} style={{padding:"14px 12px",borderRadius:18,border:activePick?"1px solid rgba(0,255,157,.34)":"1px solid rgba(247,247,247,.1)",background:activePick?"linear-gradient(135deg, rgba(0,255,157,.10), rgba(96,103,249,.10))":"rgba(247,247,247,.03)",color:"#fff",fontWeight:800,cursor:"pointer"}}>{symbol}</button>;})}</div> : null}{onboardingStep === 3 ? <div style={{display:"grid",gridTemplateColumns:"repeat(3, minmax(0, 1fr))",gap:14}}>{[{label:"Scalp", value:"5", copy:"5m–15m focus for quick momentum checks."},{label:"Swing", value:"30", copy:"1h–4h style signal reads with balanced context."},{label:"Position", value:"1", copy:"A slower, calmer view for longer-term structure."}].map((option)=><button key={option.label} type="button" onClick={()=>{setStrategy(option.label.toLowerCase()); setTimeframe(option.value);}} style={{textAlign:"left",padding:18,borderRadius:20,border:((option.label === "Scalp" && strategy === "scalp") || (option.label === "Swing" && strategy === "swing") || (option.label === "Position" && strategy === "position"))?"1px solid rgba(96,103,249,.55)":"1px solid rgba(247,247,247,.1)",background:((option.label === "Scalp" && strategy === "scalp") || (option.label === "Swing" && strategy === "swing") || (option.label === "Position" && strategy === "position"))?"linear-gradient(135deg, rgba(96,103,249,.18), rgba(13,21,48,.88))":"rgba(247,247,247,.03)",color:"#fff",cursor:"pointer"}}><div style={{fontSize:18,fontWeight:800,marginBottom:8}}>{option.label}</div><div className="ms-sub" style={{lineHeight:1.7,color:"#dbeafe"}}>{option.copy}</div></button>)}</div> : null}{onboardingStep === 4 ? <div style={{padding:20,borderRadius:20,background:"linear-gradient(135deg, rgba(96,103,249,.16), rgba(13,21,48,.82))",border:"1px solid rgba(139,168,255,.18)"}}><div style={{fontSize:13,letterSpacing:".12em",textTransform:"uppercase",color:"#bcd0ff",marginBottom:10}}>Tonight’s signal is based on your setup</div><div style={{fontSize:28,fontWeight:900,marginBottom:8}}>{topSignal ? `${topSignal.symbol}: ${topSignal.posture} (${topSignal.confidence}%)` : "Building your opening read..."}</div><div className="ms-sub" style={{fontSize:15,color:"#e2e8f0",lineHeight:1.8}}>Mode: {mode} • Focus: {strategy} • Watchlist: {watchlist.slice(0,4).join(", ") || "BTC, ETH, ADA"}</div></div> : null}<div style={{display:"flex",justifyContent:"space-between",gap:12,marginTop:22,flexWrap:"wrap"}}><button type="button" onClick={backOnboardingStep} className="btn" style={{width:"auto",visibility:onboardingStep===0?"hidden":"visible"}}>Back</button><div style={{display:"flex",gap:10,marginLeft:"auto"}}>{onboardingStep < onboardingStepMeta.length - 1 ? <button type="button" onClick={finishOnboarding} className="btn" style={{width:"auto"}}>Skip for now</button> : null}<button type="button" onClick={nextOnboardingStep} className="btn-strong" style={{width:"auto"}}>{onboardingStep === onboardingStepMeta.length - 1 ? "Enter Dashboard" : "Continue"}</button></div></div></div></div>}

      <div className="ms-wrap">
        <section className="ms-card">
          <div className="ms-row">
            <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
              <div style={{ flex: "0 0 auto" }}>
                <BeaconLogo size={92} />
              </div>
              <div>
                <div style={{fontSize:14,color:"#94a3b8",marginBottom:6}}>Midnight Signal Panel</div>
                <h1 className="ms-title">What’s the signal tonight? 🌙<button className="learn-hot" type="button" onClick={()=>openLearn("signal")}>?</button></h1>
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12, color: "rgba(247,247,247,.64)", letterSpacing: ".03em" }}>
                  <span>Data</span>
                  <span>•</span>
                  <span>Information</span>
                  <span>•</span>
                  <span>Knowledge</span>
                  <span>•</span>
                  <span>Understanding</span>
                  <span>•</span>
                  <span>Wisdom</span>
                </div>
                {ritualLoop ? <div style={{marginTop:14,padding:14,borderRadius:18,background:"linear-gradient(135deg, rgba(96,103,249,.14), rgba(13,21,48,.65))",border:"1px solid rgba(139,168,255,.18)",maxWidth:560}}>
                  <div style={{fontSize:11,letterSpacing:".12em",textTransform:"uppercase",color:"#bcd0ff",marginBottom:8}}>Tonight's opening read</div>
                  <div style={{fontSize:24,fontWeight:900,marginBottom:6}}>{ritualLoop.opening}</div>
                  <div className="ms-sub" style={{fontSize:15,color:"#e2e8f0"}}>{ritualLoop.momentum}</div>
                </div> : null}
              </div>
            </div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
              <button onClick={()=>chooseMode("Beginner")} className="btn-strong" style={{background:mode==="Beginner"?"linear-gradient(135deg, #2563eb, #4f46e5)":"rgba(15,23,42,0.72)"}}>Beginner</button>
              <button onClick={()=>chooseMode("Pro")} className="btn-strong" style={{background:mode==="Pro"?"linear-gradient(135deg, #2563eb, #4f46e5)":"rgba(15,23,42,0.72)"}}>Pro</button>
            </div>
          </div>
        </section>

        <section className="ms-card">
          <div className="ms-row">
            <div>
              <div style={{fontSize:14,color:"#94a3b8",marginBottom:6}}>Premium access</div>
              <div style={{fontSize:28,fontWeight:800}}>Unlock deeper signal intelligence</div>
              <div className="ms-sub" style={{marginTop:8}}>
                Move beyond noise. See the full structure behind the market with a cleaner premium unlock path.
              </div>
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
              <Pill>{isPremium ? "Premium active" : "$9/mo early access"}</Pill>
              {unlockSeenAt ? <Pill>{`Unlocked ${unlockSeenAt}`}</Pill> : null}
            </div>
          </div>
          <div className="ms-grid ms-hero" style={{marginTop:18}}>
            <div className="ms-metric">
              <div className="ms-metric-label">What unlocks</div>
              <div style={{display:"grid",gap:10,marginTop:12}}>
                <div style={{padding:12,borderRadius:14,background:"rgba(247,247,247,.03)",border:"1px solid rgba(247,247,247,.08)"}}>Full Why This Signal explanation and confidence context</div>
                <div style={{padding:12,borderRadius:14,background:"rgba(247,247,247,.03)",border:"1px solid rgba(247,247,247,.08)"}}>Complete Since Your Last Visit layer</div>
                <div style={{padding:12,borderRadius:14,background:"rgba(247,247,247,.03)",border:"1px solid rgba(247,247,247,.08)"}}>Factor breakdown bars and deeper signal guidance</div>
              </div>
            </div>
            <div className="ms-metric">
              <div className="ms-metric-label">Upgrade</div>
              <div style={{display:"grid",gap:12,marginTop:12}}>
                <input
                  className="select"
                  type="email"
                  placeholder="Email for checkout"
                  value={email}
                  onChange={(e)=>setEmail(e.target.value)}
                />
                <button onClick={startCheckout} className="btn-strong" disabled={checkoutLoading}>
                  {checkoutLoading ? "Starting checkout..." : "Unlock the Signal"}
                </button>
                <div className="ms-sub">Unlock full signal breakdown, confidence context, watchlist tracking, and signal history for $9/month early access.</div>
                {isDevBuild ? <button onClick={unlockLocally} className="btn" type="button">Hidden local premium preview</button> : null}
                <div className="ms-sub">If Stripe env vars are missing, checkout safely falls back to a mock success route so the app still deploys cleanly.</div>
                {checkoutError ? <div style={{color:"#fca5a5",fontSize:13}}>{checkoutError}</div> : null}
              </div>
            </div>
          </div>
        </section>


        {returnBanner ? (
          <section className="ms-card" style={{padding:18,background:"linear-gradient(135deg, rgba(96,103,249,.18), rgba(10,18,38,.92))",border:"1px solid rgba(139,168,255,.20)"}}>
            <div className="ms-row">
              <div>
                <div style={{fontSize:13,letterSpacing:".12em",textTransform:"uppercase",color:"#bcd0ff",marginBottom:8}}>Return trigger</div>
                <div style={{fontSize:28,fontWeight:900,lineHeight:1.1}}>{returnBanner}</div>
                <div className="ms-sub" style={{marginTop:10,color:"#dbeafe"}}>New signal shifts detected while you were away. Your next read starts with the assets that moved most.</div>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <Pill>{hoursAway >= 24 ? `${Math.max(1, Math.round(hoursAway / 24))}d away` : `${Math.max(1, Math.round(hoursAway || 1))}h away`}</Pill>
                <Pill>{streakCount} night{streakCount === 1 ? "" : "s"} 🌙</Pill>
              </div>
            </div>
          </section>
        ) : null}

        <section className="ms-card">
          <div className="ms-row">
            <div>
              <div style={{fontSize:14,color:"#94a3b8"}}>Tonight's Ritual</div>
              <div style={{fontSize:26,fontWeight:800}}>Open fast. Understand faster.</div>
              <div className="ms-sub" style={{marginTop:8}}>A nightly loop built to tell returning users what changed, what matters, and how to frame the next decision.</div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {ritualLoop ? <Pill>{ritualLoop.opening}</Pill> : null}
              {visitDelta ? <Pill>Tonight vs last visit</Pill> : <Pill>First visit rhythm</Pill>}
              <Pill>Streak: {streakCount} night{streakCount === 1 ? "" : "s"} 🌙</Pill>
            </div>
          </div>
          <div className="ms-grid ms-hero" style={{marginTop:18}}>
            <div className="ms-metric">
              <div className="ms-metric-label">Tonight's Brief</div>
              <div style={{display:"grid",gap:12,marginTop:12}}>
                <div style={{padding:14,borderRadius:16,background:"rgba(247,247,247,.03)",border:"1px solid rgba(247,247,247,.08)"}}><b>Direction:</b> {tonightBrief ? tonightBrief.direction : "—"}</div>
                <div style={{padding:14,borderRadius:16,background:"rgba(247,247,247,.03)",border:"1px solid rgba(247,247,247,.08)"}}><b>Change:</b> {tonightBrief ? tonightBrief.change : "—"}</div>
                <div style={{padding:14,borderRadius:16,background:"rgba(247,247,247,.03)",border:"1px solid rgba(247,247,247,.08)"}}><b>Key driver:</b> {tonightBrief ? tonightBrief.keyDriver : "—"}</div>
              </div>
            </div>
            <div className="ms-metric">
              <div className="ms-metric-label">Suggested Posture</div>
              <div style={{fontSize:28,fontWeight:900,marginTop:12}}>{decisionLayer ? decisionLayer.posture : "Wait for signal"}</div>
              <div style={{display:"grid",gap:10,marginTop:14}}>
                {(decisionLayer?.reasons || ["No signal available yet."]).map((reason) => <div key={reason} style={{padding:12,borderRadius:14,background:"rgba(247,247,247,.03)",border:"1px solid rgba(247,247,247,.08)"}}>• {reason}</div>)}
              </div>
            </div>
          </div>
          <div className="ms-grid ms-hero" style={{marginTop:18}}>
            <div className="ms-metric">
              <div className="ms-metric-label">Tonight vs Yesterday</div>
              <div style={{lineHeight:1.75,color:"#e2e8f0",fontSize:16,marginTop:12}}>{ritualLoop ? ritualLoop.checkpoint : "Come back after your next session to compare the leadership handoff."}</div>
            </div>
            <div className="ms-metric">
              <div className="ms-metric-label">Return reason</div>
              <div style={{lineHeight:1.75,color:"#e2e8f0",fontSize:16,marginTop:12}}>{ritualLoop ? ritualLoop.momentum : "The first habit loop starts once your local snapshot has been saved."}</div>
              <div className="ms-sub" style={{marginTop:10,color:"#dbeafe"}}>{interestingCallout}</div>
            </div>
          </div>
        </section>

        <section className="ms-grid ms-hero">
          <div className="ms-metric">
            <div className="ms-metric-label">Watchlist changes highlighted</div>
            <div style={{display:"grid",gap:10,marginTop:12}}>
              {watchlistRetentionHits.length ? watchlistRetentionHits.map((item) => (
                <div key={item.symbol} style={{padding:12,borderRadius:14,background:item.tone === "up" ? "rgba(34,197,94,.10)" : item.tone === "down" ? "rgba(59,130,246,.10)" : "rgba(148,163,184,.10)",border:item.tone === "up" ? "1px solid rgba(34,197,94,.20)" : item.tone === "down" ? "1px solid rgba(59,130,246,.22)" : "1px solid rgba(148,163,184,.18)"}}>
                  <b>{item.symbol}</b> — {item.text}
                </div>
              )) : <div className="ms-sub" style={{lineHeight:1.7}}>Your watchlist will light up here once one of your tracked assets changes posture or confidence between visits.</div>}
            </div>
          </div>
          <div className="ms-metric">
            <div className="ms-metric-label">Micro-notification</div>
            <div style={{fontSize:22,fontWeight:800,marginTop:12}}>New signal shift detected while you were away</div>
            <div className="ms-sub" style={{marginTop:10,lineHeight:1.75}}>{visitDelta ? interestingCallout : "Come back after another session and this area will surface the most meaningful change automatically."}</div>
          </div>
        </section>
        {topSignal && (
          <section className="ms-grid ms-hero">
            <div className={`ms-card top-signal-shell ${topPulseOn ? "signal-pulse" : ""}`}>
              <div className="ms-row">
                <div>
                  <div style={{fontSize:14,color:"#94a3b8"}}>
                    Tonight’s Top Signal
                    <button className="learn-hot" type="button" onClick={() => openLearn("signal")}>?</button>
                  </div>
                  <div style={{fontSize:34,fontWeight:900,marginTop:4,color:topAccent.color,textShadow:topAccent.glow}}>
                    {topSignal.symbol} • {topSignal.posture}
                  </div>
                  <div className="ms-sub" style={{marginTop:8}}>
                    Strategy: {strategy} • {timeframe}D derived history • {dataSource === "coingecko" ? "CoinGecko live + refresh" : "seed fallback"}
                  </div>
                </div>
                <div
                  className="focus-chip"
                  style={{
                    background: topSignal.confidence >= 70 ? "rgba(34,197,94,0.12)" : topSignal.confidence < 45 ? "rgba(59,130,246,0.10)" : "rgba(148,163,184,0.10)",
                    color: topSignal.confidence >= 70 ? "#86efac" : topSignal.confidence < 45 ? "#93c5fd" : "#cbd5e1"
                  }}
                >
                  {topSignal.confidence}%
                </div>
              </div>

              <div style={{marginTop:18,padding:18,borderRadius:18,background:"rgba(2,6,23,0.55)",border:"1px solid rgba(148,163,184,0.12)"}}>
                <div style={{fontSize:13,color:"#94a3b8",marginBottom:10}}>Tonight’s Brief</div>
                <div style={{lineHeight:1.7,color:"#e2e8f0",fontSize:16}}>{tonightBrief ? tonightBrief.summary : topSignal.brief}</div>
                <div style={{marginTop:14,display:"flex",gap:8,flexWrap:"wrap"}}>
                  <Pill>{dataSource === "coingecko" ? "Live market input" : "Fallback seed data"}</Pill>
                  {marketUpdatedAt ? <Pill>{marketUpdatedAt}</Pill> : null}
                </div>
                <div style={{marginTop:14,padding:12,borderRadius:14,background:"linear-gradient(135deg, rgba(96,103,249,.10), rgba(0,51,173,.12))",border:"1px solid rgba(96,103,249,.2)",fontSize:13,color:"#dbe8ff"}}>
                  Beacon read: when leadership changes, this card pulses so the shift feels immediate.
                </div>
              </div>

              <div className="ms-grid ms-stats" style={{marginTop:18}}>
                <div className="ms-metric">
                  <div className="ms-metric-label">Price</div>
                  <div className="ms-metric-value">{formatPrice(topSignal.price)}</div>
                </div>
                <div className="ms-metric">
                  <div className="ms-metric-label">24H Change</div>
                  <div className="ms-metric-value" style={{color: topSignal.change24h >= 0 ? "#00ff9d" : "#ff4d4d"}}>
                    {topSignal.change24h >= 0 ? "+" : ""}{topSignal.change24h.toFixed(1)}%
                  </div>
                </div>
                <div className="ms-metric">
                  <div className="ms-metric-label">Volume</div>
                  <div className="ms-metric-value">{topSignal.volume}</div>
                </div>
                <div className="ms-metric">
                  <div className="ms-metric-label">
                    Risk Profile
                    <button className="learn-hot" type="button" onClick={() => openLearn("risk")}>?</button>
                  </div>
                  <div className="ms-metric-value">{topSignal.risk}</div>
                </div>
              </div>
            </div>

            <aside className="ms-card">
              <div style={{fontSize:14,color:"#94a3b8",marginBottom:12}}>Session Settings</div>
              <div style={{display:"grid",gap:14}}>
                <label>
                  <div style={{fontSize:13,color:"#94a3b8",marginBottom:8}}>Trader style</div>
                  <select className="select" value={strategy} onChange={(e) => setStrategy(e.target.value)}>
                    <option value="scalp">Scalp</option>
                    <option value="swing">Swing</option>
                    <option value="position">Position</option>
                  </select>
                </label>
                <label>
                  <div style={{fontSize:13,color:"#94a3b8",marginBottom:8}}>Timeframe</div>
                  <select className="select" value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
                    <option value="7">7D</option>
                    <option value="30">30D</option>
                    <option value="90">90D</option>
                  </select>
                </label>
                <label style={{display:"flex",alignItems:"center",gap:10}}>
                  <input type="checkbox" checked={soundOn} onChange={(e) => setSoundOn(e.target.checked)} />
                  <span>Signal ping on leader + alert shift</span>
                </label>
                <div className="ms-sub">No heavy render layer here. Just a focused pulse on the top signal and cleaner card interactions.</div>
              </div>
            </aside>
          </section>
        )}

        {topSignal && (
          <section className="ms-grid ms-context">
            <div className="ms-card">
              <div className="ms-row" style={{alignItems:"flex-start"}}>
                <div>
                  <div style={{fontSize:14,color:"#94a3b8",marginBottom:8}}>Why this signal is moving</div>
                  <div style={{fontSize:24,fontWeight:800,marginBottom:10}}>Signal Context</div>
                  <div className="ms-sub" style={{maxWidth:620,lineHeight:1.7}}>
                    Tonight’s signal is more useful when the narrative sits beside the number.
                  </div>
                </div>
                <Pill>{contextLoading ? "Loading context" : `Sentiment: ${signalContext?.sentiment || "mixed"}`}</Pill>
              </div>
              <div style={{display:"grid",gap:12,marginTop:18}}>
                {(signalContext?.drivers || []).slice(0, 3).map((driver, index) => (
                  <div key={`${driver}-${index}`} style={{padding:"14px 16px",borderRadius:18,background:"rgba(247,247,247,.03)",border:"1px solid rgba(247,247,247,.08)",lineHeight:1.7,color:"#e2e8f0"}}>
                    • {driver}
                  </div>
                ))}
              </div>
            </div>

            <div className="ms-card">
              <div style={{display:"grid",gap:18}}>
                <div>
                  <div style={{fontSize:14,color:"#94a3b8",marginBottom:8}}>Latest Context</div>
                  <div style={{display:"grid",gap:10}}>
                    {(signalContext?.news || []).slice(0, 3).map((item, index) => (
                      <a
                        key={`${item.title}-${index}`}
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        style={{display:"block",padding:"13px 14px",borderRadius:16,textDecoration:"none",background:"rgba(247,247,247,.03)",border:"1px solid rgba(247,247,247,.08)",color:"#fff"}}
                      >
                        <div style={{fontWeight:700,lineHeight:1.45}}>{item.title}</div>
                        <div className="ms-sub" style={{marginTop:6}}>{item.source}</div>
                      </a>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{fontSize:14,color:"#94a3b8",marginBottom:8}}>Community Pulse</div>
                  <div style={{display:"grid",gap:10}}>
                    {(signalContext?.pulse || []).slice(0, 3).map((item, index) => (
                      <div key={`${item.text}-${index}`} style={{padding:"13px 14px",borderRadius:16,background:"linear-gradient(135deg, rgba(96,103,249,.10), rgba(0,51,173,.10))",border:"1px solid rgba(96,103,249,.18)"}}>
                        <div style={{lineHeight:1.65,color:"#e2e8f0"}}>“{item.text}”</div>
                        <div className="ms-sub" style={{marginTop:6}}>{item.source}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {visitDelta && <section className="ms-card">
          <div className="ms-row">
            <div>
              <div style={{fontSize:14,color:"#94a3b8",marginBottom:6}}>Since your last visit<button className="learn-hot" type="button" onClick={()=>openLearn("sinceLastVisit")}>?</button></div>
              <div style={{fontSize:28,fontWeight:800}}>What changed since you were last here</div>
              <div className="ms-sub" style={{marginTop:8}}>
                {lastSeenAt ? `Previous snapshot saved: ${lastSeenAt}` : "Comparing against your previous local snapshot."}
              </div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <Pill>{visitDelta.postureChanges.length} posture shifts</Pill>
              <Pill>{visitDelta.confidenceShifts.length} confidence moves</Pill>
              <Pill>{visitDelta.movers.length} notable movers</Pill>
            </div>
          </div>

          <div className="ms-grid ms-hero" style={{marginTop:18}}>
            <div className="ms-metric">
              <div className="ms-metric-label">Signal Changes</div>
              <div style={{display:"grid",gap:12,marginTop:12}}>
                {visitDelta.postureChanges.length ? visitDelta.postureChanges.map((item) => (
                  <div key={item.symbol} style={{display:"flex",justifyContent:"space-between",gap:12,padding:14,borderRadius:16,background:"rgba(247,247,247,.03)",border:"1px solid rgba(247,247,247,.08)"}}>
                    <div>
                      <div style={{fontSize:18,fontWeight:700}}>{item.symbol}</div>
                      <div className="ms-sub">{item.from} {postureArrow(item.from, item.to)} {item.to}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:14,color:deltaTone(item.confidenceDelta),fontWeight:700}}>
                        {item.confidenceDelta >= 0 ? "+" : ""}{item.confidenceDelta} pts
                      </div>
                      <div className="ms-sub">confidence shift</div>
                    </div>
                  </div>
                )) : <div className="ms-sub" style={{marginTop:4}}>No posture changes captured from the previous snapshot.</div>}
              </div>
            </div>

            <div className="ms-metric">
              <div className="ms-metric-label">Top Signal Shift</div>
              <div style={{display:"grid",gap:14,marginTop:12}}>
                <div style={{padding:14,borderRadius:16,background:"rgba(247,247,247,.03)",border:"1px solid rgba(247,247,247,.08)"}}>
                  <div className="ms-sub">Previous leader</div>
                  <div style={{fontSize:22,fontWeight:800,marginTop:6}}>
                    {visitDelta.prevTop ? `${visitDelta.prevTop.symbol} • ${visitDelta.prevTop.confidence}%` : "—"}
                  </div>
                </div>
                <div style={{padding:14,borderRadius:16,background:"rgba(96,103,249,.10)",border:"1px solid rgba(96,103,249,.24)"}}>
                  <div className="ms-sub">Current leader</div>
                  <div style={{fontSize:22,fontWeight:800,marginTop:6}}>
                    {visitDelta.nextTop ? `${visitDelta.nextTop.symbol} • ${visitDelta.nextTop.confidence}%` : "—"}
                  </div>
                </div>
                <div className="ms-sub">
                  {visitDelta.prevTop && visitDelta.nextTop && visitDelta.prevTop.symbol !== visitDelta.nextTop.symbol
                    ? `${visitDelta.prevTop.symbol} handed off the lead to ${visitDelta.nextTop.symbol}.`
                    : "The top signal remains the same since your last snapshot."}
                </div>
              </div>
            </div>
          </div>

          <div className="ms-grid ms-hero" style={{marginTop:18}}>
            <div className="ms-metric">
              <div className="ms-metric-label">Biggest Movers</div>
              <div style={{display:"grid",gap:12,marginTop:12}}>
                {visitDelta.movers.map((item) => (
                  <div key={item.symbol} style={{display:"flex",justifyContent:"space-between",gap:12,padding:14,borderRadius:16,background:"rgba(247,247,247,.03)",border:"1px solid rgba(247,247,247,.08)"}}>
                    <div>
                      <div style={{fontSize:18,fontWeight:700}}>{item.symbol}</div>
                      <div className="ms-sub">{item.name}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:16,fontWeight:700,color:deltaTone(item.change24h)}}>
                        {item.change24h >= 0 ? "+" : ""}{item.change24h.toFixed(1)}%
                      </div>
                      <div className="ms-sub">{item.confidence}% confidence</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ms-metric">
              <div className="ms-metric-label">Confidence Shifts</div>
              <div style={{display:"grid",gap:12,marginTop:12}}>
                {visitDelta.confidenceShifts.length ? visitDelta.confidenceShifts.map((item) => (
                  <div key={item.symbol} style={{display:"flex",justifyContent:"space-between",gap:12,padding:14,borderRadius:16,background:"rgba(247,247,247,.03)",border:"1px solid rgba(247,247,247,.08)"}}>
                    <div>
                      <div style={{fontSize:18,fontWeight:700}}>{item.symbol}</div>
                      <div className="ms-sub">{item.from}% → {item.to}% • {item.posture}</div>
                    </div>
                    <div style={{textAlign:"right",fontSize:16,fontWeight:700,color:deltaTone(item.delta)}}>
                      {item.delta >= 0 ? "+" : ""}{item.delta} pts
                      <div className="ms-sub" style={{marginTop:6,color:item.delta >= 6 ? "#86efac" : item.delta <= -6 ? "#93c5fd" : "rgba(247,247,247,.6)"}}>{pulseMessageFrom(item.delta)}</div>
                    </div>
                  </div>
                )) : <div className="ms-sub" style={{marginTop:4}}>No major confidence swings from the stored snapshot.</div>}
              </div>
            </div>
          </div>
        </section>}

        <section className="ms-card"><div className="ms-grid ms-stats">{stats.map(([label,value]) => <div className="ms-metric" key={label}><div className="ms-metric-label">{label}</div><div className="ms-metric-value">{value}</div></div>)}</div></section>

        <section className="ms-card"><div className="ms-row"><div><div style={{fontSize:20,fontWeight:700}}>Watchlist</div><div className="ms-sub">Your pinned Midnight Signal picks, persisted on this device.</div></div><div style={{fontSize:12,color:"rgba(247,247,247,.5)"}}>{watchlist.length} tracked</div></div><div className="ms-sub" style={{marginTop:10}}>Watchlist names now sit visually above the field with a brighter priority treatment when a signal shifts.</div><div className="ms-grid ms-watch" style={{marginTop:14}}>{ordered.filter(c=>watchlist.includes(c.symbol)).map(coin => <button className={`watch-card priority ${watchPulseSymbol===coin.symbol ? "watch-pulse" : ""}`} key={coin.symbol} onClick={()=>openAsset(coin.symbol, "momentum")}><div className="ms-row"><div><div style={{fontSize:20,fontWeight:700}}>{coin.symbol}</div><div className="ms-sub">{coin.name}</div></div><Pill>{coin.posture}</Pill></div><div style={{fontSize:28,fontWeight:700,marginTop:10}}>{formatPrice(coin.price)}</div><div style={{fontSize:14,fontWeight:600,color:coin.change24h>=0?"#00ff9d":"#ff4d4d"}}>{coin.change24h>=0?"+":""}{coin.change24h.toFixed(1)}% today</div><div style={{marginTop:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8,fontSize:12,color:"rgba(247,247,247,.5)"}}><span>{timeframe}D derived sparkline</span><span>{coin.confidence}%</span></div>{sparkline(coin.history, coin.change24h>=0)}</div></button>)}</div></section>

        <section className="ms-card"><div className="ms-row"><div><div style={{display:"flex",gap:8,alignItems:"center"}}><h2 style={{fontSize:24,margin:0}}>Top 20 Opportunity Grid</h2>{mode==="Beginner"?<span style={{fontSize:12,color:"rgba(247,247,247,.5)"}}>ⓘ Higher scores = stronger alignment, not certainty.</span>:null}</div><div className="ms-sub">Click a coin to open the detail panel.</div></div></div><div className="ms-grid ms-coins" style={{marginTop:16}}>{ordered.map(coin => <button key={coin.symbol} className={`coin-btn ${active?.symbol===coin.symbol?"active":""} ${topSignal?.symbol!==coin.symbol?"dim":""}`} style={watchlist.includes(coin.symbol) ? {borderColor:"rgba(0,255,157,.22)", boxShadow:"0 0 0 1px rgba(0,255,157,.08), 0 14px 50px rgba(0,0,0,.32)"} : undefined} onClick={()=>openAsset(coin.symbol, "confidence")}><div className="ms-row"><button type="button" onClick={(e)=>{e.stopPropagation();toggleWatch(coin.symbol);}} style={{border:"1px solid rgba(247,247,247,.12)",background:"rgba(247,247,247,.04)",color:watchlist.includes(coin.symbol)?"#00ff9d":"#fff",borderRadius:14,padding:"8px 10px",cursor:"pointer"}}>{watchlist.includes(coin.symbol)?"★":"☆"}</button><Pill>{coin.posture}</Pill></div><div><div style={{fontSize:22,fontWeight:800}}>{coin.symbol}</div><div className="ms-sub">{coin.name}</div></div><div style={{fontSize:28,fontWeight:700}}>{formatPrice(coin.price)}</div><div style={{fontSize:14,fontWeight:600,color:coin.change24h>=0?"#00ff9d":"#ff4d4d"}}>{coin.change24h>=0?"+":""}{coin.change24h.toFixed(1)}% today</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Pill tone={coin.timing}>{coin.timing}</Pill></div><div><div className="ms-row" style={{marginBottom:8}}><span style={{fontSize:12,color:"rgba(247,247,247,.5)"}}>Signal Confidence</span><span style={{fontSize:12,color:"rgba(247,247,247,.7)"}}>{coin.confidence}%</span></div><div style={{height:8,width:"100%",borderRadius:999,background:"rgba(247,247,247,.1)",overflow:"hidden"}}><span style={{display:"block",height:"100%",width:`${coin.confidence}%`,borderRadius:999,background:"linear-gradient(90deg, #0033AD, #6067F9, #8BA8FF)"}}></span></div></div></button>)}</div></section>


        {assetPanelOpen && active ? <div className="asset-overlay" onClick={()=>setAssetPanelOpen(false)}></div> : null}
        {assetPanelOpen && active ? (
          <aside className="asset-panel">
            <div style={{padding:"18px 20px",borderBottom:"1px solid rgba(247,247,247,.08)",display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}>
              <div>
                <div style={{fontSize:14,color:"#94a3b8",marginBottom:4}}>Asset Inspector</div>
                <div style={{fontSize:28,fontWeight:900,color:activeAccent.color,textShadow:activeAccent.glow}}>{active.symbol} • {active.posture}</div>
                <div className="ms-sub" style={{marginTop:6}}>{active.name} • {active.change24h>=0?"+":""}{active.change24h.toFixed(1)}% today</div>
              </div>
              <button type="button" className="btn" onClick={()=>setAssetPanelOpen(false)} style={{width:"auto",padding:"10px 12px"}}>Close</button>
            </div>
            <div className="asset-panel-body">
              <div className="asset-sheet-handle"></div>

              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
                <Pill>{active.posture}</Pill>
                <Pill tone={active.timing}>{active.timing}</Pill>
                <Pill>{active.confidenceBand} confidence</Pill>
              </div>

              <div className="ms-grid ms-stats" style={{marginBottom:18}}>
                <div className="ms-metric"><div className="ms-metric-label">Signal Confidence</div><div className="ms-metric-value">{active.confidence}%</div></div>
                <div className="ms-metric"><div className="ms-metric-label">Price</div><div className="ms-metric-value">{formatPrice(active.price)}</div></div>
                <div className="ms-metric"><div className="ms-metric-label">RSI</div><div className="ms-metric-value">{active.rsi}</div></div>
                <div className="ms-metric"><div className="ms-metric-label">Risk</div><div className="ms-metric-value">{active.risk}</div></div>
              </div>

              <div className="ms-metric" style={{marginBottom:16}}>
                <div className="ms-metric-label">Why This Signal</div>
                <div style={{fontSize:18,fontWeight:700,marginTop:10}}>{active.brief}</div>
                <div style={{marginTop:14,lineHeight:1.75,color:"#e2e8f0"}}>{isPremium ? active.explanation : `${active.explanation.slice(0, 110)}...`}</div>
                <div style={{position:"relative",marginTop:16}}>
                  <div style={{padding:14,borderRadius:16,background:"rgba(247,247,247,.03)",border:"1px solid rgba(247,247,247,.08)"}}>
                    <div style={{fontSize:13,color:"#94a3b8",marginBottom:8}}>Confidence context</div>
                    <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>{active.confidenceBand} confidence</div>
                    <div className="ms-sub" style={{lineHeight:1.7}}>{isPremium ? active.confidenceContext : "Unlock premium to read the full confidence interpretation and usage context."}</div>
                  </div>
                  {!isPremium ? <div style={{position:"absolute",inset:0,borderRadius:16,padding:12,background:"linear-gradient(180deg, rgba(13,21,48,.12), rgba(13,21,48,.72))"}}><PremiumGate isPremium={isPremium} onUnlock={startCheckout} title="Unlock Full Signal" description="Move beyond noise. See the deeper structure behind this setup with the full reasoning layer." points={["Full Why This Signal explanation","Confidence context and usage notes","Deeper signal guidance"]} cta="Unlock the Signal" /></div> : null}
                </div>
              </div>

              <div className="ms-metric" style={{marginBottom:16}}>
                <div className="ms-metric-label">What this means</div>
                <div style={{marginTop:12,padding:16,borderRadius:18,background:"linear-gradient(135deg, rgba(96,103,249,.10), rgba(0,51,173,.12))",border:"1px solid rgba(96,103,249,.22)"}}>
                  <div style={{fontSize:13,color:"#bcd0ff",marginBottom:8}}>Interpretation layer</div>
                  <div style={{lineHeight:1.75,color:"#e2e8f0",fontSize:16}}>{interpretationText}</div>
                </div>
                <div className="ms-sub" style={{marginTop:12,lineHeight:1.7}}>
                  {mode === "Beginner"
                    ? "This is the app’s guidance layer — a short plain-English read on how to think about the current setup."
                    : "This is a concise interpretation layer built from posture, timing, confidence, and timeframe alignment."}
                </div>
              </div>

              <div className="ms-metric" style={{marginBottom:16}}>
                <div className="ms-metric-label">Factor Breakdown<button className="learn-hot" type="button" onClick={()=>openLearn("momentum")}>?</button></div>
                <div style={{marginTop:12,display:"grid",gap:14,position:"relative"}}>
                  {[{label:"Momentum",value:active.breakdown.momentum,topic:"momentum"},{label:"Trend",value:active.breakdown.trend,topic:"trend"},{label:"Volatility",value:active.breakdown.volatility,topic:"volatility"}].map((item, index)=><div key={item.label} className="asset-clickable" onClick={()=>openLearn(item.topic)} style={{opacity:isPremium ? 1 : index === 0 ? 1 : .42, filter:isPremium ? "none" : index === 0 ? "none" : "blur(2px)"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:14,fontWeight:700}}>{item.label}</span><span style={{fontSize:13,color:"rgba(247,247,247,.68)"}}>{isPremium || index === 0 ? `${item.value}% contribution` : "Premium"}</span></div><div style={{height:10,width:"100%",borderRadius:999,background:"rgba(247,247,247,.08)",overflow:"hidden"}}><span style={{display:"block",height:"100%",width:`${isPremium || index===0 ? item.value : 68}%`,borderRadius:999,background:barColor(item.label)}}></span></div></div>)}
                  {!isPremium ? <div style={{position:"absolute",inset:0,borderRadius:16,padding:12,background:"linear-gradient(180deg, rgba(13,21,48,.08), rgba(13,21,48,.68))"}}><PremiumGate isPremium={isPremium} onUnlock={startCheckout} title="Unlock Full Factor Breakdown" description="See the full component weighting behind momentum, trend, and volatility." points={["Multi-factor weighting","Deeper breakdown bars","Signal history context"]} cta="Go premium" /></div> : null}
                </div>
                <div style={{marginTop:18}}><div className="ms-metric-label">Derived Sparkline</div><div style={{marginTop:12}}>{sparkline(active.history, active.change24h>=0)}</div></div>
              </div>

              {visitDelta ? (
                <div className="ms-metric" style={{marginBottom:16}}>
                  <div className="ms-metric-label">Since your last visit<button className="learn-hot" type="button" onClick={()=>openLearn("sinceLastVisit")}>?</button></div>
                  <div style={{display:"grid",gap:12,marginTop:12}}>
                    {(() => {
                      const postureHit = visitDelta.postureChanges.find((item) => item.symbol === active.symbol);
                      const confidenceHit = visitDelta.confidenceShifts.find((item) => item.symbol === active.symbol);
                      const moverHit = visitDelta.movers.find((item) => item.symbol === active.symbol);
                      const hasAny = postureHit || confidenceHit || moverHit;
                      return hasAny ? (
                        <>
                          {postureHit ? <div style={{padding:14,borderRadius:16,background:"rgba(247,247,247,.03)",border:"1px solid rgba(247,247,247,.08)"}}><div style={{fontSize:14,fontWeight:700,marginBottom:6}}>Posture changed</div><div className="ms-sub">{postureHit.from} {postureArrow(postureHit.from, postureHit.to)} {postureHit.to}</div></div> : null}
                          {confidenceHit ? <div style={{padding:14,borderRadius:16,background:"rgba(247,247,247,.03)",border:"1px solid rgba(247,247,247,.08)"}}><div style={{fontSize:14,fontWeight:700,marginBottom:6}}>Confidence moved</div><div className="ms-sub">{confidenceHit.from}% → {confidenceHit.to}% ({confidenceHit.delta >= 0 ? "+" : ""}{confidenceHit.delta} pts)</div></div> : null}
                          {moverHit ? <div style={{padding:14,borderRadius:16,background:"rgba(247,247,247,.03)",border:"1px solid rgba(247,247,247,.08)"}}><div style={{fontSize:14,fontWeight:700,marginBottom:6}}>Notable mover</div><div className="ms-sub">{moverHit.change24h >= 0 ? "+" : ""}{moverHit.change24h.toFixed(1)}% since the latest session snapshot.</div></div> : null}
                        </>
                      ) : <div className="ms-sub">No major saved delta for this asset in the latest local snapshot.</div>;
                    })()}
                  </div>
                </div>
              ) : null}



              <div className="ms-metric" style={{marginBottom:16}}>
                <div className="ms-metric-label">Multi-Timeframe Read</div>
                <div style={{display:"grid",gap:10,marginTop:12}}>
                  {timeframeReads.map((read) => (
                    <div key={read.timeframe} style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",padding:"12px 14px",borderRadius:14,background:"rgba(247,247,247,.03)",border:"1px solid rgba(247,247,247,.08)"}}>
                      <div style={{display:"flex",gap:12,alignItems:"center"}}>
                        <div style={{fontSize:14,fontWeight:800,width:42}}>{read.timeframe}</div>
                        <div>
                          <div style={{fontSize:15,fontWeight:700}}>{read.posture}</div>
                          <div className="ms-sub">Momentum {read.momentum}% • Trend {read.trend}% • Volatility {read.volatility}%</div>
                        </div>
                      </div>
                      <div style={{fontSize:15,fontWeight:800,color:read.posture==="Bullish" ? "#00ff9d" : read.posture==="Bearish" ? "#ff4d4d" : "#cbd5e1"}}>
                        {read.confidence}%
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:14,padding:14,borderRadius:16,background:"linear-gradient(135deg, rgba(96,103,249,.10), rgba(0,51,173,.12))",border:"1px solid rgba(96,103,249,.22)"}}>
                  <div style={{fontSize:13,color:"#bcd0ff",marginBottom:8}}>Alignment insight</div>
                  <div className="ms-sub" style={{lineHeight:1.7}}>{timeframeInsight}</div>
                </div>
              </div>

              <div className="ms-metric" style={{marginBottom:16}}>
                <div className="ms-metric-label">Trust Layer</div>
                <div style={{display:"grid",gap:14,marginTop:12}}>
                  <div style={{padding:14,borderRadius:16,background:"rgba(247,247,247,.03)",border:"1px solid rgba(247,247,247,.08)"}}>
                    <div style={{fontSize:13,color:"#94a3b8",marginBottom:6}}>Recent signal alignment</div>
                    <div style={{fontSize:28,fontWeight:900,marginBottom:6}}>{trustStats.successRate}%</div>
                    <div className="ms-sub">
                      {trustStats.total ? `Based on the last ${trustStats.total} saved reads for ${active.symbol} on this device.` : "No saved signal history yet for this asset."}
                    </div>
                  </div>

                  <div style={{padding:14,borderRadius:16,background:"rgba(247,247,247,.03)",border:"1px solid rgba(247,247,247,.08)"}}>
                    <div style={{fontSize:13,color:"#94a3b8",marginBottom:10}}>Recent timeline</div>
                    {assetHistory.length ? (
                      <div style={{display:"grid",gap:10}}>
                        {assetHistory.slice().reverse().slice(0, 6).map((entry, idx) => (
                          <div key={`${entry.ts}-${idx}`} style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",padding:"10px 12px",borderRadius:14,background:"rgba(255,255,255,.025)"}}>
                            <div style={{display:"flex",gap:10,alignItems:"center"}}>
                              <span style={{display:"inline-block",width:10,height:10,borderRadius:999,background:trustColor(entry.outcome)}}></span>
                              <div>
                                <div style={{fontSize:14,fontWeight:700}}>{entry.posture} • {entry.confidence}%</div>
                                <div className="ms-sub">{new Date(entry.ts).toLocaleString()}</div>
                              </div>
                            </div>
                            <div style={{fontSize:13,fontWeight:700,color:trustColor(entry.outcome)}}>
                              {entry.outcome === "up" ? "↑ Up" : entry.outcome === "down" ? "↓ Down" : "→ Flat"}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="ms-sub">Open the app over multiple sessions to build a local trust history for each asset.</div>
                    )}
                  </div>

                  <div className="ms-sub" style={{lineHeight:1.7}}>
                    High confidence still does not mean guaranteed. This layer only shows how often recent reads aligned with the simple local outcome memory on this device.
                  </div>
                </div>
              </div>

              <div className="ms-metric">
                <div className="ms-metric-label">Learning shortcuts</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
                  {["signal","momentum","trend","volatility","confidence","timing","risk"].map((key)=>(
                    <button key={key} type="button" className="learn-chip" onClick={()=>openLearn(key)}>{LEARN_TOPICS[key].title}</button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        ) : null}

        {alertFeedback ? (
          <div className="alert-toast">
            <div style={{fontSize:12,color:"#93c5fd",textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>Alert captured</div>
            <div style={{fontSize:16,fontWeight:800,marginBottom:4}}>{alertFeedback}</div>
            <div className="ms-sub">Pulse, watchlist priority, and recent signals all update together now.</div>
          </div>
        ) : null}

        <button type="button" className="learn-fab" onClick={()=>setLearnOpen(true)}>
          Learn
        </button>

        {learnOpen ? <div className="learn-overlay" onClick={()=>setLearnOpen(false)}></div> : null}
        {learnOpen ? (
          <aside className="learn-panel">
            <div style={{padding:"18px 20px",borderBottom:"1px solid rgba(247,247,247,.08)",display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}>
              <div>
                <div style={{fontSize:14,color:"#94a3b8",marginBottom:4}}>Adaptive Learning</div>
                <div style={{fontSize:24,fontWeight:800}}>Midnight Signal Glossary</div>
              </div>
              <button type="button" className="btn" onClick={()=>setLearnOpen(false)} style={{width:"auto",padding:"10px 12px"}}>Close</button>
            </div>
            <div className="learn-panel-body">
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>
                {Object.entries(LEARN_TOPICS).map(([key, value]) => (
                  <button
                    key={key}
                    type="button"
                    className={`learn-chip ${learnTopic===key ? "active" : ""}`}
                    onClick={()=>setLearnTopic(key)}
                  >
                    {value.title}
                  </button>
                ))}
              </div>

              <div style={{padding:16,borderRadius:18,background:"rgba(247,247,247,.04)",border:"1px solid rgba(247,247,247,.08)",marginBottom:16}}>
                <div style={{fontSize:13,color:"#94a3b8",marginBottom:8}}>Topic</div>
                <div style={{fontSize:26,fontWeight:800,marginBottom:10}}>{activeTopic.title}</div>
                <div style={{fontSize:14,color:"#94a3b8",marginBottom:6}}>What it is</div>
                <div style={{lineHeight:1.7,color:"#e2e8f0",marginBottom:14}}>{activeTopic.what}</div>
                <div style={{fontSize:14,color:"#94a3b8",marginBottom:6}}>Why it matters</div>
                <div style={{lineHeight:1.7,color:"#e2e8f0",marginBottom:14}}>{activeTopic.why}</div>
                <div style={{fontSize:14,color:"#94a3b8",marginBottom:6}}>How Midnight Signal uses it</div>
                <div style={{lineHeight:1.7,color:"#e2e8f0"}}>{activeTopic.appUse}</div>
              </div>

              <div style={{padding:16,borderRadius:18,background:"linear-gradient(135deg, rgba(96,103,249,.10), rgba(0,51,173,.12))",border:"1px solid rgba(96,103,249,.22)",marginBottom:16}}>
                <div style={{fontSize:13,color:"#bcd0ff",marginBottom:8}}>Mode-aware behavior</div>
                <div style={{fontWeight:800,marginBottom:8}}>{mode==="Beginner" ? "Beginner mode is prioritizing guidance." : "Pro mode keeps learning available but out of your way."}</div>
                <div className="ms-sub" style={{lineHeight:1.7}}>
                  {mode==="Beginner"
                    ? "In Beginner mode, the app keeps learning closer to the decision flow so non-experts can understand what they are seeing without clutter."
                    : "In Pro mode, the panel becomes an on-demand reference so you can move faster while still having definitions when needed."}
                </div>
              </div>

              <div style={{padding:16,borderRadius:18,background:"rgba(247,247,247,.03)",border:"1px solid rgba(247,247,247,.08)"}}>
                <div style={{fontSize:13,color:"#94a3b8",marginBottom:8}}>Suggested next concepts</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {["momentum","trend","volatility","confidence","timing"].filter((key)=>key!==learnTopic).slice(0,4).map((key)=>(
                    <button key={key} type="button" className="learn-chip" onClick={()=>setLearnTopic(key)}>
                      {LEARN_TOPICS[key].title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        ) : null}


        <section className="ms-card">
          <div className="ms-row">
            <div>
              <div style={{fontSize:14,color:"#94a3b8"}}>Alerts</div>
              <div style={{fontSize:22,fontWeight:800}}>Recent signals</div>
            </div>
            <div className="ms-sub">Sharper feedback for leader changes, watchlist shifts, and high-confidence surges.</div>
          </div>
          <div style={{marginTop:12,display:"grid",gap:10}}>
            {(alerts || []).length ? (alerts || []).slice().reverse().slice(0,6).map(a=>{
              const tone = alertTypeTone(a.type);
              return (
                <div key={a.id} style={{padding:12,borderRadius:14,background:tone.bg,border:`1px solid ${tone.border}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:15,fontWeight:700,color:tone.color}}>{a.text}</div>
                      <div className="ms-sub" style={{marginTop:6}}>{a.symbol || "Signal"} • {a.posture || "Update"} • {a.confidence ? `${a.confidence}% confidence` : "Saved event"}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      {a.priority==="HIGH" ? <div style={{color:"#00ff9d",fontWeight:700,marginBottom:6}}>★ High</div> : <div className="ms-sub" style={{marginBottom:6}}>Normal</div>}
                      <div className="ms-sub">{new Date(a.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
                    </div>
                  </div>
                </div>
              );
            }) : <div className="ms-sub">No alerts yet</div>}
          </div>
        </section>
        <section style={{textAlign:"center",fontSize:12,color:"rgba(247,247,247,.45)",paddingTop:8}}><div style={{marginBottom:8}}>Midnight Signal • Terms • Privacy • Disclaimer</div><div>This application is provided for educational and informational purposes only. It does not constitute financial, investment, or trading advice.</div><div style={{marginTop:8}}>{`Midnight Signal v${BUILD_VERSION} • ${BUILD_LABEL}`}</div></section>
      </div>
    </main>
  );
}
