
const BUILD_NUMBER = window.__MIDNIGHT_BUILD__ || "2026.03.26-api.7.8";
const GLOSSARY = {
  signal:{title:"Signal",body:"Signal is the model’s overall read on current conditions. Higher numbers mean stronger alignment, not certainty."},
  opportunity:{title:"Opportunity Score",body:"Opportunity Score estimates how actionable a setup looks right now after combining signal, timing, and strategy."},
  timing:{title:"Timing",body:"Enter means alignment is improving, Wait means no strong edge yet, and Reduce means conditions are weakening."},
  confluence:{title:"Confluence",body:"Confluence measures how many factors are lining up in the same direction."},
  mtf:{title:"MTF",body:"MTF stands for multi-timeframe alignment across short, medium, and longer conditions."},
  confidence:{title:"Confidence",body:"Confidence translates the signal into plain English."},
  posture:{title:"Suggested Posture",body:"Suggested Posture gives a plain-English framing of how aggressive or defensive the current setup looks."},
  regime:{title:"Regime",body:"Regime summarizes whether conditions lean bullish, bearish, or neutral overall."}
};
const FAQ = [
  { q:"Does Enter mean buy now?", a:"No. Enter means conditions look more constructive. It is not a command or guarantee."},
  { q:"Does Reduce mean sell everything?", a:"No. Reduce signals weaker conditions, not an absolute instruction."},
  { q:"What is High Probability?", a:"It means the current setup ranks more favorably than others in the grid."},
  { q:"Why does Tonight’s Top Signal matter?", a:"It highlights the currently highest-ranked setup so users can orient faster."}
];
const STRATEGY_OPTIONS=["scalp","swing","position"];
const storage={get:(k,f)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch{return f}},getString:(k,f)=>{try{return localStorage.getItem(k)||f}catch{return f}},set:(k,v)=>{try{localStorage.setItem(k,typeof v==="string"?v:JSON.stringify(v))}catch{}}};
const state={
  strategy:storage.getString("midnight-html-strategy","swing"),
  timeframe:storage.getString("midnight-html-timeframe","30"),
  watchlist:storage.get("midnight-html-watchlist",["BTC","ETH","ADA"]),
  selected:null, glossaryOpen:false, glossaryTopic:"signal", assetQuery:"", coins:[], lastUpdated:null,
  lastVisit:Number(storage.getString("midnight-last-visit","0"))||0,
  previousSnapshot:storage.get("midnight-snapshot",{{}}),
  sinceLastVisit:[],
  previousTopFromSnapshot:storage.getString("midnight-prev-top-snapshot",""),
  beginnerMode:storage.getString("midnight-mode","beginner")!=="pro",
  showOnboarding: storage.getString("midnight-agreement-build","") !== BUILD_NUMBER,
  agreementChecked: false
};

function formatPrice(price){if(price>=1000)return `$${price.toLocaleString(undefined,{maximumFractionDigits:0})}`;if(price>=1)return `$${price.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;return `$${price.toLocaleString(undefined,{minimumFractionDigits:4,maximumFractionDigits:4})}`}
function formatVolume(num){if(!Number.isFinite(num))return "$0";if(num>=1e12)return `$${(num/1e12).toFixed(2)}T`;if(num>=1e9)return `$${(num/1e9).toFixed(2)}B`;if(num>=1e6)return `$${(num/1e6).toFixed(2)}M`;return `$${num.toLocaleString()}`}
function scoreMomentum(c){return Math.max(0,Math.min(1,0.5+c/20))}
function scoreTrend(rank,c){const base=rank<=5?0.72:rank<=10?0.64:0.56;const adj=c>4?0.06:c<-4?-0.06:0;return Math.max(0,Math.min(1,base+adj))}
function scoreVolatility(c){return 1-Math.min(1,Math.abs(c)/10)}
function calculateRSI(prices,period=14){if(!prices||prices.length<=period)return 50;let gains=0,losses=0;for(let i=1;i<=period;i++){const diff=prices[i]-prices[i-1];if(diff>=0)gains+=diff;else losses-=diff}const avgGain=gains/period,avgLoss=losses/period;if(avgLoss===0)return 100;const rs=avgGain/avgLoss;return 100-100/(1+rs)}
function movingAverage(prices,length){if(!prices||prices.length<length)return prices?.[prices.length-1]??0;const slice=prices.slice(-length);return slice.reduce((a,b)=>a+b,0)/length}
function buildSyntheticHistory(coin){const endPrice=Number(coin.price??0);const changeFactor=1+Number(coin.change24h??0)/100;const startPrice=changeFactor===0?endPrice:endPrice/changeFactor;const arr=[];for(let i=0;i<50;i++){const p=i/49;const baseline=startPrice+(endPrice-startPrice)*p;const wave=Math.sin(p*Math.PI*3)*endPrice*0.01;const wobble=Math.cos(p*Math.PI*5)*endPrice*0.004;arr.push(Math.max(0.0001,baseline+wave+wobble))}return arr}
function buildIndicators(coin){const priceHistory=Array.isArray(coin.price_history)&&coin.price_history.length?coin.price_history:buildSyntheticHistory(coin);const rsi=Math.round(calculateRSI(priceHistory));const ma20=movingAverage(priceHistory,20);const ma50=movingAverage(priceHistory,50);const maTrend=ma20>ma50?"Bullish":ma20<ma50?"Bearish":"Neutral";return {rsi,ma20,ma50,maTrend,priceHistory}}
function deriveRegime(signal){return signal>=0.65?"Bullish":signal<=0.45?"Bearish":"Neutral"}
function deriveTiming(signal,c){if(signal>=0.7&&c>0)return "Enter";if(signal<=0.4||c<-2.5)return "Reduce";return "Wait"}
function getRiskFromChange(c){const abs=Math.abs(c);if(abs>=6)return "High";if(abs<=2)return "Low";return "Medium"}
function getAdaptiveLabel(signal){const pct=Math.round(signal*100);if(pct>=85)return {title:"High Probability",priority:"high",cls:"high"};if(pct>=75)return {title:"Watchlist",priority:"medium",cls:"watch"};return {title:"Low Quality",priority:"low",cls:"low"}}
function getCoinClasses(coin,selected){const label=coin.adaptiveLabel;const classes=["coin"];if(selected)classes.push("active");if(label.priority==="high"&&!selected)classes.push("priority-high");if(label.priority==="low"&&!selected)classes.push("priority-low");return classes.join(" ")}
function getConfidenceContext(signal){const pct=Math.round(signal*100);if(pct>=85)return "Very strong alignment";if(pct>=70)return "Moderate alignment";if(pct>=55)return "Mixed / developing";return "Weak / low conviction"}
function getSuggestedPosture(coin){if(coin.signal>=0.75&&coin.timing==="Enter"&&coin.indicators.maTrend==="Bullish")return {label:"Candidate for entry",tone:"high"};if(coin.signal>=0.6&&coin.timing!=="Reduce")return {label:"Wait for confirmation",tone:"watch"};if(coin.signal<0.5||coin.timing==="Reduce"||coin.indicators.maTrend==="Bearish")return {label:"Defensive posture",tone:"low"};return {label:"Monitor only",tone:"watch"}}
function postureBadge(coin){const p=getSuggestedPosture(coin);return `<span class="signal-label ${p.tone}">${p.label}</span>`}
function badge(value){let cls="neutral",icon="";if(value==="Bullish"||value==="Enter"){cls="bull";icon="🟢"}else if(value==="Bearish"||value==="Reduce"){cls="bear";icon="🔴"}return `<span class="pill ${cls}">${icon?icon+" ":""}${value}</span>`}

function buildSnapshot(coins){
  const snap = {};
  coins.forEach(c => {
    snap[c.symbol] = Math.round(c.signal * 100);
  });
  return snap;
}
function computeSinceLastVisit(coins){
  const prev = state.previousSnapshot || {};
  const changes = [];
  coins.forEach(c => {
    const current = Math.round(c.signal * 100);
    const old = prev[c.symbol];
    if(old !== undefined){
      const diff = current - old;
      let direction = "stable";
      if(diff > 2) direction = "up";
      if(diff < -2) direction = "down";
      if(direction !== "stable"){
        changes.push({ symbol:c.symbol, diff, direction });
      }
    }
  });
  changes.sort((a,b) => Math.abs(b.diff) - Math.abs(a.diff));
  return changes.slice(0, 3);
}
function getTopSignalShift(currentTopSymbol){
  const prevTop = state.previousTopFromSnapshot || "";
  if(!prevTop || !currentTopSymbol) return "";
  if(prevTop === currentTopSymbol) return "";
  return `${prevTop} → ${currentTopSymbol}`;
}

function buildSignalContext(topSignal){
  if(!topSignal){
    return [
      "No strong context signal yet.",
      "Waiting for clearer market direction.",
      "No specific catalyst attached."
    ];
  }
  const context = [];
  if(topSignal.symbol === "ADA"){
    context.push("Cardano ecosystem attention may be reinforcing sentiment.");
  }
  if(topSignal.change24h > 2){
    context.push("Recent price strength suggests buyers are becoming more aggressive.");
  } else if(topSignal.change24h < -2){
    context.push("Recent weakness suggests conviction may still be fragile.");
  } else {
    context.push("Price is moving, but not aggressively enough to overwhelm the broader read.");
  }
  if(topSignal.mtf?.label?.includes("Bullish")){
    context.push("Multi-timeframe alignment is supporting the current signal.");
  } else if(topSignal.mtf?.label?.includes("Bearish")){
    context.push("Multi-timeframe pressure is leaning against the setup.");
  } else {
    context.push("Multi-timeframe alignment is mixed, so context matters more here.");
  }
  context.push("Recent narrative shifts or ecosystem news could be affecting confidence around this asset.");
  return context.slice(0,3);
}

function buildFeedPost(topSignal, explain){
  if(!topSignal || !explain) return "";
  return `📡 Signal Context: ${topSignal.symbol}

What’s happening:
${explain.what}

Possible drivers:
• ${buildSignalContext(topSignal).join("\n• ")}

What it means:
${explain.meaning}

#Cardano #ADA #Crypto #MidnightSignal`;
}

function buildShareText(topSignal, explain){
  if(!topSignal || !explain) return "";

  return `📡 Tonight’s Top Signal: ${topSignal.symbol}

🧠 What’s happening:
${explain.what}

📊 Why:
${explain.why}

🎯 What it means:
${explain.meaning}

#Cardano #ADA #Crypto #MidnightSignal`;
}

function updateVisitStreak(){
  const today = new Date().toDateString();
  if(state.lastVisit !== today){
    state.visitStreak = (state.visitStreak || 0) + 1;
    state.lastVisit = today;
    storage.set("midnight-last-visit", today);
    storage.set("midnight-visit-streak", state.visitStreak);
  }
}

function buildTonightBrief(topSignal, explain){
  if(!topSignal) return null;
  return {
    title: topSignal.symbol,
    confidence: Math.round(topSignal.signal * 100),
    what: explain.what,
    meaning: explain.meaning
  };
}

function buildDecisionLayer(topSignal){
  if(!topSignal){
    return {
      stance:"Wait",
      chipClass:"caution",
      confidenceLabel:"Not enough data",
      timingRead:"No timing read yet",
      learningNote:"Wait for clearer alignment before acting on any interpretation."
    };
  }

  const score = topSignal.signal;
  const timing = topSignal.timing || "Wait";
  const regime = topSignal.regime || "Neutral";
  let stance = "Wait";
  let chipClass = "caution";
  let confidenceLabel = "Moderate";
  let timingRead = "Conditions are still developing";
  let learningNote = "This is educational guidance only. Use it to frame risk, not to follow blindly.";

  if(score >= 0.75 && timing === "Enter" && regime === "Bullish"){
    stance = "Strong setup";
    chipClass = "strong";
    confidenceLabel = "High confidence";
    timingRead = "Conditions currently favor continuation";
    learningNote = "This is the kind of setup where multiple factors are lining up, which usually means less uncertainty than a mixed signal.";
  } else if(score >= 0.6 && timing !== "Reduce"){
    stance = "Constructive but early";
    chipClass = "caution";
    confidenceLabel = "Developing confidence";
    timingRead = "There is some alignment, but confirmation still matters";
    learningNote = "This can be useful for learning how a setup forms before it becomes fully convincing.";
  } else {
    stance = "Defensive / low-quality";
    chipClass = "defensive";
    confidenceLabel = "Low confidence";
    timingRead = "Conditions are mixed or weakening";
    learningNote = "Lower-quality setups are often where newer users get chopped up. Patience is part of good decision-making.";
  }

  return { stance, chipClass, confidenceLabel, timingRead, learningNote };
}

function buildExplainableSignal(topSignal){
  if(!topSignal){
    return {
      what:"Waiting for signal data",
      why:"No data available yet",
      meaning:"No interpretation yet",
      tags:[]
    };
  }

  const score = topSignal.signal;

  let what="", why="", meaning="", tags=[];

  if(score >= 0.75){
    what = "Buyers are in control across multiple timeframes";
    why = "<span class='tooltip-inline' data-tip='Momentum'>Momentum</span> is increasing and <span class='tooltip-inline' data-tip='Structure'>structure</span> is holding";
    meaning = "This setup favors continuation if conditions remain stable";
    tags = ["Trend Continuation","Momentum Strong","High Confidence"];
  } else if(score >= 0.6){
    what = "A potential setup is forming";
    why = "Some alignment is present but not fully confirmed";
    meaning = "This could develop into a stronger opportunity with confirmation";
    tags = ["Developing Setup","Watch Closely"];
  } else {
    what = "Market conditions are mixed or weakening";
    why = "Momentum and structure are not aligned";
    meaning = "This setup has lower reliability and higher risk";
    tags = ["Weak Signal","Higher Risk"];
  }

  return { what, why, meaning, tags };
}

function getTopSignalNarrative(topSignal){
  if(!topSignal) return "Waiting for signal data.";
  if(topSignal.signal >= 0.75){
    return "Strong alignment across multiple factors. Momentum and structure are supporting continuation.";
  }
  if(topSignal.signal >= 0.6){
    return "Developing setup. Some alignment is present, but it still needs confirmation.";
  }
  return "Weak alignment. Conditions are mixed or deteriorating.";
}
function getLastUpdatedLabel(){
  if(!state.lastUpdated) return "Updated —";
  const mins = Math.max(0, Math.floor((Date.now() - state.lastUpdated.getTime()) / 60000));
  if(mins < 1) return "Updated just now";
  if(mins === 1) return "Updated 1 min ago";
  return `Updated ${mins} min ago`;
}


function maybeTriggerWatchlistAlerts(coins){
  if(!state.watchlistAlertsEnabled || !isPro()) return;
  coins.forEach(c=>{
    if(state.watchlist.includes(c.symbol) && c.signal >= 0.75){
      const msg = `Watchlist alert: ${c.symbol} high signal (${Math.round(c.signal*100)}%)`;
      if(msg !== state.lastAlertMessage){
        state.lastAlertMessage = msg;
        storage.set("midnight-last-alert-message", msg);
        playSignalSound("up");
      }
    }
  });
}
function maybeTriggerAlert(topCoin){
  if(!topCoin || !state.alertsEnabled) return;
  let message = "";
  if(state.signalChange === "up"){
    message = `Top Signal improving: ${topCoin.symbol} (${Math.round(topCoin.signal * 100)}%)`;
  } else if(state.signalChange === "down"){
    message = `Top Signal cooling: ${topCoin.symbol} (${Math.round(topCoin.signal * 100)}%)`;
  }
  if(!message || message === state.lastAlertMessage) return;
  state.lastAlertMessage = message;
  storage.set("midnight-last-alert-message", message);
  playSignalSound(state.signalChange === "up" ? "up" : "down");
  if(state.browserNotifyEnabled && "Notification" in window && Notification.permission === "granted"){
    try{
      new Notification("Midnight Signal Alert", { body: message });
    }catch{}
  }
}
async function enableBrowserNotifications(){
  if(!("Notification" in window)) return;
  try{
    const result = await Notification.requestPermission();
    state.browserNotifyEnabled = result === "granted";
    storage.set("midnight-browser-notify", state.browserNotifyEnabled ? "on" : "off");
    render();
  }catch{}
}

function playSignalSound(kind){
  if(!state.soundEnabled) return;
  try{
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = kind === "up" ? 660 : 440;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.03, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (kind === "up" ? 0.18 : 0.24));
    osc.start();
    osc.stop(ctx.currentTime + (kind === "up" ? 0.2 : 0.26));
  }catch{}
}
function updateSignalChange(topCoin){
  if(!topCoin){
    state.signalChange = "neutral";
    return;
  }
  const currentScore = Math.round(topCoin.signal * 100);
  let change = "neutral";
  if(state.previousTopSignalSymbol && state.previousTopSignalSymbol === topCoin.symbol){
    if(currentScore > state.previousTopSignalScore) change = "up";
    else if(currentScore < state.previousTopSignalScore) change = "down";
  } else if(state.previousTopSignalSymbol && state.previousTopSignalSymbol !== topCoin.symbol){
    change = "up";
  }
  if(change !== "neutral" && change !== state.signalChange){
    playSignalSound(change);
  }
  state.signalChange = change;
  state.previousTopSignalSymbol = topCoin.symbol;
  state.previousTopSignalScore = currentScore;
  storage.set("midnight-prev-top-symbol", topCoin.symbol);
  storage.set("midnight-prev-top-score", String(currentScore));
}
function enrich(row,index){const price=Number(row.current_price??0),change24h=Number(row.price_change_percentage_24h??0);const indicators=buildIndicators({price,change24h,price_history:row.price_history});const momentum=scoreMomentum(change24h),trend=scoreTrend(Number(row.market_cap_rank??index+1),change24h),volatility=scoreVolatility(change24h);let rsiScore=0.5;if(indicators.rsi>=40&&indicators.rsi<=65)rsiScore=0.75;else if(indicators.rsi>70)rsiScore=0.35;else if(indicators.rsi<30)rsiScore=0.4;const maDiff=Math.abs(indicators.ma20-indicators.ma50),maStrength=Math.min(1,maDiff/(price||1));const shortBias=indicators.maTrend==="Bullish"&&indicators.rsi<70?1:indicators.maTrend==="Bearish"&&indicators.rsi>30?-1:0;const mediumBias=trend>=0.65?1:trend<=0.45?-1:0;const longBias=change24h>1?1:change24h<-1?-1:0;const mtfRaw=shortBias+mediumBias+longBias;const mtfScore=Math.max(0,Math.min(1,0.5+mtfRaw/6));const signal=Math.max(0.3,Math.min(0.95,momentum*0.22+trend*0.22+volatility*0.13+rsiScore*0.17+maStrength*0.13+mtfScore*0.13));const regime=deriveRegime(signal),timing=deriveTiming(signal,change24h);const bullish=Math.round(Math.min(100,signal*100+(regime==="Bullish"?12:0)+(timing==="Enter"?8:0)));const bearish=Math.round(Math.min(100,(1-signal)*100+(regime==="Bearish"?12:0)+(timing==="Reduce"?8:0)));return {symbol:String(row.symbol||"").toUpperCase(),name:row.name||String(row.symbol||"").toUpperCase(),price,change24h,volume:formatVolume(Number(row.total_volume??0)),risk:getRiskFromChange(change24h),signal,regime,timing,opportunityScore:Math.max(0,Math.min(100,Math.round(signal*100+(regime==="Bullish"?8:regime==="Bearish"?-8:0)))),mtf:{label:mtfRaw>=2?"Strong Bullish":mtfRaw<=-2?"Strong Bearish":mtfRaw>0?"Bullish":mtfRaw<0?"Bearish":"Mixed"},indicators,adaptiveLabel:getAdaptiveLabel(signal),confluence:{bullish,bearish}}}
async function loadMarkets(){try{
  const res=await fetch("/api/markets");
  if(!res.ok)throw new Error(`markets ${res.status}`);
  const payload=await res.json();
  state.coins=(payload.coins||[]).map(enrich);
  state.lastUpdated=new Date();
  state.sinceLastVisit = computeSinceLastVisit(state.coins);
  const currentTop = [...state.coins].sort((a,b)=>b.signal-a.signal)[0];
  storage.set("midnight-prev-top-snapshot", currentTop?.symbol || "");
  storage.set("midnight-snapshot", buildSnapshot(state.coins));
  storage.set("midnight-last-visit", String(Date.now()));
  state.previousSnapshot = buildSnapshot(state.coins);
  state.lastVisit = Date.now();
  render()
}catch(err){console.warn("Markets load failed.",err);render()}}
function getFilteredCoins(){const q=state.assetQuery.toLowerCase();let list=state.coins;if(q)list=list.filter(c=>`${c.symbol} ${c.name}`.toLowerCase().includes(q));return [...list].sort((a,b)=>b.signal-a.signal).sort((a,b)=>state.watchlist.includes(a.symbol)===state.watchlist.includes(b.symbol)?0:state.watchlist.includes(a.symbol)?-1:1)}

function saveCurrentProfile(){
  const profiles = state.savedProfiles || {};
  profiles[state.activeProfileName] = {
    strategy: state.strategy,
    timeframe: state.timeframe,
    watchlist: [...state.watchlist]
  };
  state.savedProfiles = profiles;
  storage.set("midnight-saved-profiles", profiles);
  storage.set("midnight-active-profile", state.activeProfileName);
}
function loadProfile(name){
  if(!isPro() && name !== "Default"){
    openUpgradeModal(); setUpgradeMessage("Multiple saved profiles are part of Pro.");
    return;
  }
  const p = state.savedProfiles?.[name];
  if(!p) return;
  state.activeProfileName = name;
  state.strategy = p.strategy || "swing";
  state.timeframe = p.timeframe || "30";
  state.watchlist = Array.isArray(p.watchlist) ? p.watchlist : ["BTC","ETH","ADA"];
  storage.set("midnight-active-profile", state.activeProfileName);
  storage.set("midnight-html-strategy", state.strategy);
  storage.set("midnight-html-timeframe", state.timeframe);
  storage.set("midnight-html-watchlist", state.watchlist);
}

function openUpgradeModal(){
  state.showUpgradeModal = true;
}
function closeUpgradeModal(){
  state.showUpgradeModal = false;
}
function isPro(){
  return state.planTier === "pro";
}
function openUpgradeModal(); setUpgradeMessage(msg){
  state.upgradeMessage = msg;
}
function createProfileFromCurrent(){
  if(!isPro()){
    openUpgradeModal(); setUpgradeMessage("Creating additional profiles is part of Pro.");
    return;
  }
  const baseName = "Profile";
  let i = 1;
  let name = `${baseName} ${i}`;
  while(state.savedProfiles?.[name]){
    i += 1;
    name = `${baseName} ${i}`;
  }
  state.activeProfileName = name;
  saveCurrentProfile();
}
function renderOnboarding(){
  const root=document.getElementById("onboarding-root");
  if(!state.showOnboarding){root.innerHTML="";return}
  const strategyButtons = STRATEGY_OPTIONS.map(s=>`<button type="button" class="${state.strategy===s?'strategy-selected':''}" data-onboard-strategy="${s}">${s[0].toUpperCase()+s.slice(1)}</button>`).join("");
  root.innerHTML=`<div class="modal-backdrop">
    <div class="modal-card">
      <div class="caps">Agreement Required</div>
      <div class="row-start">
        <div>
          <div class="title" style="font-size:28px;margin-top:6px">Before you enter Midnight Signal</div>
          <div class="subtitle" style="margin-top:10px">
            Midnight Signal is educational and decision-support only. It does not provide financial advice, investment recommendations, guarantees, or personalized instructions to buy or sell.
          </div>
        </div>
        <div class="logo-lockup"><div class="logo-badge"></div></div>
      </div>
      <div class="mini" style="margin-top:18px">
        <div style="display:grid;gap:10px">
          <label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer">
            <input id="agreeRisk" type="checkbox" style="width:auto;margin-top:2px" ${state.agreementChecked ? 'checked' : ''}>
            <span>I understand this tool is for education and market interpretation only, and I remain responsible for my own decisions.</span>
          </label>
          <label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer">
            <input id="agreeNoAdvice" type="checkbox" style="width:auto;margin-top:2px" ${state.agreementChecked ? 'checked' : ''}>
            <span>I understand nothing shown here is financial advice, a guarantee, or a command to act.</span>
          </label>
        </div>
      </div>
      <div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-top:18px">
        ${strategyButtons}
      </div>
      <div class="tiny" style="margin-top:14px">Choose a starting style now or change it later in Controls. Beginner mode explains the app in plain English. Pro mode reduces helper copy.</div>
      <div class="row" style="margin-top:18px;justify-content:space-between">
        <div class="tiny">Build ${BUILD_NUMBER}</div>
        <button type="button" class="btn-primary" id="acceptAgreement" ${state.agreementChecked ? '' : 'disabled style="opacity:.55;cursor:not-allowed"'}>I Agree & Enter</button>
      </div>
    </div>
  </div>`;

  root.querySelectorAll("[data-onboard-strategy]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.strategy = btn.dataset.onboardStrategy;
      storage.set("midnight-html-strategy", state.strategy);
      render();
    });
  });

  const riskBox = root.querySelector("#agreeRisk");
  const adviceBox = root.querySelector("#agreeNoAdvice");
  const accept = root.querySelector("#acceptAgreement");

  const syncAcceptState = () => {
    state.agreementChecked = !!(riskBox?.checked && adviceBox?.checked);
    if(accept){
      accept.disabled = !state.agreementChecked;
      accept.style.opacity = state.agreementChecked ? "" : ".55";
      accept.style.cursor = state.agreementChecked ? "" : "not-allowed";
    }
  };

  riskBox?.addEventListener("change", syncAcceptState);
  adviceBox?.addEventListener("change", syncAcceptState);
  syncAcceptState();

  accept?.addEventListener("click", () => {
    syncAcceptState();
    if(!state.agreementChecked) return;
    state.showOnboarding = false;
    storage.set("midnight-agreement-build", BUILD_NUMBER);
    render();
  });
}
function renderGlossaryShell(){if(!state.glossaryOpen)return "";const topic=GLOSSARY[state.glossaryTopic]||GLOSSARY.signal;return `<section class="card glossary-shell"><div class="row-start"><div><div class="caps">Glossary / FAQ</div><div class="title" style="font-size:28px;margin-top:6px">${topic.title}</div><div class="subtitle" style="margin-top:8px">Fast reference for terms and common questions.</div></div><button id="glossaryClose">Close</button></div><div class="glossary-grid"><div class="mini" style="display:grid;gap:8px;align-content:start">${Object.entries(GLOSSARY).map(([key,item])=>`<button type="button" data-topic="${key}" style="text-align:left;${state.glossaryTopic===key?'border-color:rgba(139,168,255,.35);background:rgba(139,168,255,.12)':''}">${item.title}</button>`).join("")}<button type="button" id="reopenOnboarding" class="reopen-btn" style="text-align:left">Reopen Agreement</button></div><div><div class="mini"><div style="font-size:15px;line-height:1.7;color:rgba(247,247,247,.86)">${topic.body}</div></div><div class="mini faq-block"><div class="caps">FAQ</div><div style="display:grid;gap:14px;margin-top:12px">${FAQ.map(item=>`<div><div style="font-weight:700">${item.q}</div><div class="tiny" style="margin-top:6px;color:rgba(247,247,247,.76)">${item.a}</div></div>`).join("")}</div></div></div></div></section><div id="glossaryBackdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.66);backdrop-filter:blur(6px);z-index:30"></div>`}
function render(){renderOnboarding();const app=document.getElementById("app");const sortedCoins=getFilteredCoins();const summary={bullish:state.coins.filter(c=>c.regime==="Bullish").length,enter:state.coins.filter(c=>c.timing==="Enter").length,avgSignal:state.coins.length?Math.round(state.coins.reduce((s,c)=>s+c.signal,0)/state.coins.length*100):0,topCoin:sortedCoins[0]};const selected=state.selected?state.coins.find(c=>c.symbol===state.selected):null;const topSignal=summary.topCoin;const topShift=getTopSignalShift(topSignal?.symbol||"");const topNarrative=getTopSignalNarrative(topSignal);const explain=buildExplainableSignal(topSignal);updateVisitStreak();const decision=buildDecisionLayer(topSignal);const brief=buildTonightBrief(topSignal, explain);const contextDrivers=buildSignalContext(topSignal);const topSignalFlashClass=state.signalChange!=="neutral"?"signal-flash":"";maybeTriggerAlert(topSignal); maybeTriggerWatchlistAlerts(state.coins);const showSignalsTab=state.activeTab==="signals";const showAlertsTab=state.activeTab==="alerts";const showProfileTab=state.activeTab==="profile"; updateSignalChange(topSignal);
app.innerHTML=`<section class="card pulse-frame tab-section ${showSignalsTab ? "" : "tab-hidden"}"><div class="row"><div><div style="font-size:20px;font-weight:700">What’s the signal tonight? 🌙</div><div class="subtitle">Midnight Signal helps you scan, understand, and compare crypto setups in one place.</div></div><div style="width:min(420px,100%)"><input id="searchInput" value="${state.assetQuery}" placeholder="Search crypto…" /></div></div></section>
<section class="grid grid-hero tab-section ${showSignalsTab ? "" : "tab-hidden"}"><div class="card"><div class="row-start"><div><div class="caps">Midnight Signal</div><div class="row" style="justify-content:flex-start;margin-top:6px"><div class="logo-lockup"><div class="logo-badge"></div><div class="logo-wordmark"><div class="title" style="font-size:30px">Midnight Signal</div><div class="tiny">Logo placeholder • easy to swap later</div></div></div><button id="toggleMode">${state.beginnerMode?"Switch to Pro":"Switch to Beginner"}</button></div><p class="subtitle">Signal-first dashboard powered by a Vercel API snapshot.</p><div class="mode-note" style="margin-top:10px">${state.beginnerMode?"Beginner mode is on. You’ll see extra guidance and plain-English framing.":"Pro mode is on. Helper text is reduced for a cleaner signal-first view."}</div></div><div><div class="controls"><span class="badge live-pill">Live engine</span><span class="badge">${state.timeframe}D timeframe</span></div><div class="live-updated">${getLastUpdatedLabel()}</div></div></div><div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr));margin-top:18px"><div class="metric"><div class="label">Bullish Regimes</div><div class="value">${summary.bullish}/20</div></div><div class="metric"><div class="label">Enter Signals</div><div class="value">${summary.enter}</div></div><div class="metric"><div class="label">Average Confidence</div><div class="value">${summary.avgSignal}%</div></div><div class="metric"><div class="label">Top Opportunity</div><div class="value">${summary.topCoin?.symbol||"—"}</div></div></div></div>
<section class="card"><div class="row-start"><div><div class="caps">Session Controls</div><div style="font-size:22px;font-weight:700;margin-top:4px">Controls</div></div><span class="badge live-pill">API connected</span></div><div class="grid" style="margin-top:14px"><button type="button" id="soundToggle" class="${state.soundEnabled?'sound-toggle-on':''}">Sound: ${state.soundEnabled?'On':'Off'}</button><label><div class="tiny" style="margin-bottom:6px">Strategy</div><select id="strategySelect">${STRATEGY_OPTIONS.map(s=>`<option value="${s}" ${state.strategy===s?"selected":""}>${s[0].toUpperCase()+s.slice(1)}</option>`).join("")}</select></label><label><div class="tiny" style="margin-bottom:6px">Timeframe</div><select id="timeframeSelect">${["7","30","90"].map(t=>`<option value="${t}" ${state.timeframe===t?"selected":""}>${t}D</option>`).join("")}</select></label><div class="metric"><div class="label">Feed Source</div><div style="margin-top:8px;font-size:14px">Vercel API → CoinGecko snapshot</div></div><div class="metric"><div class="label">Last Updated</div><div style="margin-top:8px;font-size:14px">${state.lastUpdated?state.lastUpdated.toLocaleTimeString():"—"}</div></div></div></section></section>

${brief ? `
<div class="brief-card fade-in">
  <div class="brief-title">Tonight’s Brief</div>
  <div class="brief-main">${brief.title} • ${brief.confidence}%</div>
  <div class="brief-line">→ ${brief.what}</div>
  <div class="brief-line">→ ${brief.meaning}</div>
  <div class="streak">🔥 ${state.visitStreak} day streak</div>
</div>
` : ``}

<section class="card top-signal fade-in pulse-frame"><div class="caps">Tonight’s Top Signal</div>${topSignal?`<div style="margin-top:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><div class="title" style="font-size:28px">${topSignal.symbol}</div><span class="signal-label ${topSignal.adaptiveLabel.cls}">${topSignal.adaptiveLabel.title}</span>${badge(topSignal.regime)}${badge(topSignal.timing)}</div><div class="subtitle" style="margin-top:8px">${topSignal.name}</div><div class="grid" style="grid-template-columns:1fr 1fr;margin-top:16px"><div class="mini"><div class="tiny">Signal</div><div style="margin-top:6px;font-weight:700">${Math.round(topSignal.signal*100)}%</div><div class="tiny" style="margin-top:4px">${getConfidenceContext(topSignal.signal)}</div></div><div class="mini"><div class="tiny">Suggested Posture</div><div style="margin-top:6px">${postureBadge(topSignal)}</div></div></div>
<div class="mini" style="margin-top:16px">
  <div class="tiny">Current read</div>
  <div style="margin-top:8px;font-size:14px;color:rgba(247,247,247,.86)">${topNarrative}</div>
</div>


<div class="explain-block">
  <div class="explain-title">Decision support</div>
  <div class="decision-grid">
    <div class="decision-card">
      <div class="explain-title">Current stance</div>
      <div style="margin-top:8px">
        <span class="decision-chip ${decision.chipClass}">${decision.stance}</span>
      </div>
      <div class="decision-note">${decision.learningNote}</div>
    </div>
    <div class="decision-card">
      <div class="explain-title">Confidence read</div>
      <div class="explain-text">${decision.confidenceLabel}</div>
      <div class="decision-note">${decision.timingRead}</div>
    </div>
  </div>
</div>

<div class="explain-block">
  <div class="explain-title">How to use this responsibly</div>
  <div class="explain-text">Use this as a decision aid, not a command. If the read is mixed, your best move may simply be to wait and learn what stronger alignment looks like.</div>
</div>

<div class="share-box">
  ${buildShareText(topSignal, explain)}
</div>

<div class="share-actions">
  <button id="copyShare">Copy Post</button>
  <button id="openX">Open X</button>
</div>

<div class="explain-block">
  <div class="explain-title">What’s happening</div>
  <div class="explain-text">${explain.what}</div>
</div>

<div class="share-box">
  ${buildShareText(topSignal, explain)}
</div>

<div class="share-actions">
  <button id="copyShare">Copy Post</button>
  <button id="openX">Open X</button>
</div>

<div class="explain-block">
  <div class="explain-title">Why</div>
  <div class="explain-text">${explain.why}</div>
</div>

<div class="share-box">
  ${buildShareText(topSignal, explain)}
</div>

<div class="share-actions">
  <button id="copyShare">Copy Post</button>
  <button id="openX">Open X</button>
</div>

<div class="explain-block">
  <div class="explain-title">What it means</div>
  <div class="explain-text">${explain.meaning}</div>

  <div class="signal-tags">
    ${explain.tags.map(t=>`<span class="signal-tag">${t}</span>`).join("")}
  </div>
</div>

<div class="explain-block">
  <div class="explain-title">What’s driving this</div>
  <div class="context-grid">
    ${contextDrivers.map(item => `<div class="context-row"><div style="font-size:14px;color:rgba(247,247,247,.9)">${item}</div></div>`).join("")}
  </div>
</div>

<div class="share-box">
  ${buildShareText(topSignal, explain)}
</div>

<div class="share-actions">
  <button id="copyShare">Copy Post</button>
  <button id="openX">Open X</button>
</div>
<div class="row" style="margin-top:16px;justify-content:space-between"><div class="tiny ${state.signalChange==='up'?'change-up':state.signalChange==='down'?'change-down':'change-neutral'}">Signal change: ${state.signalChange==='up'?'▲ Rising':state.signalChange==='down'?'▼ Cooling':'• Stable'}</div><button type="button" class="btn-primary" data-select="${topSignal.symbol}">View Details</button></div>`:`<div class="subtitle" style="margin-top:10px">Waiting for live market data…</div>`}</section>

<section class="card tab-section ${showSignalsTab ? "" : "tab-hidden"}">
  <div class="caps">Since your last visit</div>
  <div class="subtitle" style="margin-top:8px">Compared to your last session</div>
  ${topShift ? `<div class="last-visit-row" style="margin-top:14px"><div><div style="font-weight:700">Top Signal changed</div><div class="tiny" style="margin-top:4px">The leading setup is different now</div></div><div class="last-visit-badge change-up">${topShift}</div></div>` : ``}
  ${
    state.sinceLastVisit && state.sinceLastVisit.length
      ? `<div class="last-visit-grid">${
          state.sinceLastVisit.map(item => `
            <div class="last-visit-row">
              <div>
                <div style="font-weight:700">${item.symbol}</div>
                <div class="tiny" style="margin-top:4px">${
                  item.direction === "up" ? "Signal improved since your last visit" : "Signal weakened since your last visit"
                }</div>
              </div>
              <div class="last-visit-badge ${item.direction === "up" ? "change-up" : "change-down"}">
                ${item.direction === "up" ? "▲ Improved" : "▼ Weakened"} (${item.diff > 0 ? "+" : ""}${item.diff}%)
              </div>
            </div>
          `).join("")
        }</div>`
      : `<div class="tiny" style="margin-top:14px">No significant changes yet.</div>`
  }
</section>

${showSignalsTab && selected?`<section class="panel"><div class="row-start"><div><div class="caps">Asset Detail</div><div style="margin-top:6px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><div class="title" style="margin:0">${selected.symbol}</div><span class="signal-label ${selected.adaptiveLabel.cls}">${selected.adaptiveLabel.title}</span>${badge(selected.regime)}${badge(selected.timing)}${postureBadge(selected)}</div><div class="subtitle" style="margin-top:8px">${selected.name}</div></div></div><div class="detail-grid-6" style="margin-top:18px"><div class="mini"><div class="tiny">Price</div><div style="margin-top:6px;font-weight:700">${formatPrice(selected.price)}</div></div><div class="mini"><div class="tiny">24h Change</div><div style="margin-top:6px;font-weight:700" class="${selected.change24h>=0?"text-pos":"text-neg"}">${selected.change24h>=0?"+":""}${selected.change24h.toFixed(1)}%</div></div><div class="mini"><div class="tiny">Signal</div><div style="margin-top:6px;font-weight:700">${Math.round(selected.signal*100)}%</div><div class="tiny" style="margin-top:4px">${getConfidenceContext(selected.signal)}</div></div><div class="mini"><div class="tiny">Opportunity</div><div style="margin-top:6px;font-weight:700">${selected.opportunityScore}/100</div></div><div class="mini"><div class="tiny">RSI</div><div style="margin-top:6px;font-weight:700">${selected.indicators.rsi}</div></div><div class="mini"><div class="tiny">MA Trend</div><div style="margin-top:6px;font-weight:700">${selected.indicators.maTrend}</div></div></div><div class="detail-grid-half" style="margin-top:20px"><div class="mini"><div class="tiny">Bullish Confluence</div><div style="margin-top:8px;font-weight:700;color:var(--blue3)">${selected.confluence.bullish}/100</div></div><div class="mini"><div class="tiny">Bearish Confluence</div><div style="margin-top:8px;font-weight:700;color:var(--bear)">${selected.confluence.bearish}/100</div></div></div></section>`:""}
<section class="tab-section ${showSignalsTab ? "" : "tab-hidden"}"><div class="row-start" style="margin-bottom:10px"><div><div style="font-size:20px;font-weight:700">Top 20 Opportunity Grid</div><div class="subtitle">${state.beginnerMode?"Compare setup quality, timing, and confluence across the current top 20.":"Top 20 live opportunities."}</div></div></div><section class="grid grid-cards">${sortedCoins.map(coin=>`<div class="${getCoinClasses(coin,state.selected===coin.symbol)}" data-select="${coin.symbol}" role="button" tabindex="0"><div class="row-start" style="position:relative"><button type="button" data-watch="${coin.symbol}" style="padding:6px 10px">${state.watchlist.includes(coin.symbol)?"★":"☆"}</button><div style="flex:1;min-width:0"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><div style="font-size:20px;font-weight:700">${coin.symbol}</div>${badge(coin.regime)}</div><div class="subtitle" style="margin-top:4px">${coin.name}</div><div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span class="signal-label ${coin.adaptiveLabel.cls}">${coin.adaptiveLabel.title}</span>${postureBadge(coin)}</div></div></div><div><div style="font-size:28px;font-weight:700">${formatPrice(coin.price)}</div><div class="${coin.change24h>=0?"text-pos":"text-neg"}" style="font-size:14px;font-weight:600">${coin.change24h>=0?"+":""}${coin.change24h.toFixed(1)}% (24h)</div></div><div><div class="row"><span class="subtitle">Signal Confidence</span><span>${Math.round(coin.signal*100)}%</span></div><div class="tiny" style="margin-top:4px;color:rgba(247,247,247,.65)">${getConfidenceContext(coin.signal)}</div><div class="progress"><span style="width:${Math.round(coin.signal*100)}%"></span></div></div><div class="grid" style="grid-template-columns:1fr 1fr"><div class="mini"><div class="tiny">Timing</div><div style="margin-top:8px">${badge(coin.timing)}</div></div><div class="mini"><div class="tiny">Opportunity</div><div style="margin-top:8px;font-weight:700">${coin.opportunityScore}/100</div><div class="tiny" style="margin-top:4px">MTF: ${coin.mtf.label}</div></div></div><div class="grid" style="grid-template-columns:1fr 1fr"><div class="mini"><div class="tiny">Bullish Confluence</div><div style="margin-top:8px;font-weight:700;color:var(--blue3)">${coin.confluence.bullish}/100</div></div><div class="mini"><div class="tiny">Bearish Confluence</div><div style="margin-top:8px;font-weight:700;color:var(--bear)">${coin.confluence.bearish}/100</div></div></div><div class="row" style="padding-top:8px;border-top:1px solid rgba(247,247,247,.08)"><div><span class="subtitle">Volume </span><span>${coin.volume}</span></div><div>${coin.risk} risk</div></div></div>`).join("")}</section></section>
${renderGlossaryShell()}
<button type="button" class="btn-primary floating-glossary" id="floatingGlossaryBtn">Glossary / FAQ</button>
<
${state.showUpgradeModal ? `
<div class="upgrade-modal-backdrop" id="upgradeBackdrop">
  <div class="upgrade-modal">
    <div class="caps">Upgrade to Pro</div>
    <div style="font-size:24px;font-weight:700;margin-top:6px">Unlock full signal intelligence</div>
    <div class="price">$15<span style="font-size:16px;font-weight:400">/month</span></div>
    <div style="margin-top:14px;color:rgba(247,247,247,.75)">
      • Watchlist alerts<br/>
      • Multiple profiles<br/>
      • Expanded asset coverage<br/>
      • Advanced signal context
    </div>
    <div class="row" style="margin-top:18px;justify-content:flex-end">
      <button id="closeUpgrade">Maybe later</button>
      <button class="btn-primary" id="confirmUpgrade">Go Pro</button>
    </div>
  </div>
</div>

<div class="share-box">
  ${buildShareText(topSignal, explain)}
</div>

<div class="share-actions">
  <button id="copyShare">Copy Post</button>
  <button id="openX">Open X</button>
</div>
` : ``}

<div class="bottom-nav">
  <div class="nav-item ${showSignalsTab?'active':''}" data-tab="signals">📊<div>Signals</div></div>
  <div class="nav-item ${showAlertsTab?'active':''}" data-tab="alerts">🔔<div>Alerts</div></div>
  <div class="nav-item ${showProfileTab?'active':''}" data-tab="profile">👤<div>Profile</div></div>
</div>

<div class="share-box">
  ${buildShareText(topSignal, explain)}
</div>

<div class="share-actions">
  <button id="copyShare">Copy Post</button>
  <button id="openX">Open X</button>
</div>
<section style="margin-top:20px;text-align:center"><div class="tiny" style="color:rgba(247,247,247,.5)">
${state.activeTooltip ? `<div class="tooltip-box">${state.glossaryTerms[state.activeTooltip]}</div>` : ``}
<button class="glossary-btn" id="openGlossary">📘</button>
${state.showGlossary ? `
<div class="upgrade-modal-backdrop">
  <div class="upgrade-modal">
    <div class="caps">Glossary</div>
    ${Object.entries(state.glossaryTerms).map(([k,v])=>`
      <div style="margin-top:10px">
        <div style="font-weight:700">${k}</div>
        <div class="tiny">${v}</div>
      </div>`).join("")}
    <div style="margin-top:14px;text-align:right">
      <button id="closeGlossary">Close</button>
    </div>
  </div>
</div>`:``}

Midnight Signal • Educational only • Not financial advice • Build ${BUILD_NUMBER}</div></section>`;
const searchInput=app.querySelector("#searchInput");if(searchInput)searchInput.addEventListener("input",e=>{state.assetQuery=e.target.value;render()});
app.querySelectorAll("[data-select]").forEach(el=>{el.addEventListener("click",()=>{state.selected=el.dataset.select;render()});el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();state.selected=el.dataset.select;render()}})});
app.querySelectorAll("[data-watch]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();const sym=el.dataset.watch;state.watchlist=state.watchlist.includes(sym)?state.watchlist.filter(s=>s!==sym):[...state.watchlist,sym];storage.set("midnight-html-watchlist",state.watchlist);saveCurrentProfile();render()}));
const floatingGlossaryBtn=app.querySelector("#floatingGlossaryBtn");if(floatingGlossaryBtn)floatingGlossaryBtn.addEventListener("click",()=>{state.glossaryOpen=true;render()});
const glossaryClose=app.querySelector("#glossaryClose");if(glossaryClose)glossaryClose.addEventListener("click",()=>{state.glossaryOpen=false;render()});
const glossaryBackdrop=app.querySelector("#glossaryBackdrop");if(glossaryBackdrop)glossaryBackdrop.addEventListener("click",()=>{state.glossaryOpen=false;render()});
app.querySelectorAll("[data-topic]").forEach(el=>el.addEventListener("click",()=>{state.glossaryTopic=el.dataset.topic;render()}));
const reopenOnboarding=app.querySelector("#reopenOnboarding");if(reopenOnboarding)reopenOnboarding.addEventListener("click",()=>{state.glossaryOpen=false;state.showOnboarding=true;render()});
const strategySelect=app.querySelector("#strategySelect");if(strategySelect)strategySelect.addEventListener("change",e=>{state.strategy=e.target.value;storage.set("midnight-html-strategy",state.strategy);saveCurrentProfile();render()});
const timeframeSelect=app.querySelector("#timeframeSelect");if(timeframeSelect)timeframeSelect.addEventListener("change",e=>{state.timeframe=e.target.value;storage.set("midnight-html-timeframe",state.timeframe);saveCurrentProfile();loadMarkets()});
const soundToggle=app.querySelector("#soundToggle");if(soundToggle)soundToggle.addEventListener("click",()=>{state.soundEnabled=!state.soundEnabled;storage.set("midnight-sound-enabled",state.soundEnabled?"on":"off");render()});
const alertsToggle=app.querySelector("#alertsToggle");if(alertsToggle)alertsToggle.addEventListener("click",()=>{
  state.alertsEnabled=!state.alertsEnabled;
  storage.set("midnight-alerts-enabled",state.alertsEnabled?"on":"off");
  render();
});

const watchlistAlertsToggle=app.querySelector("#watchlistAlertsToggle");
if(watchlistAlertsToggle)watchlistAlertsToggle.addEventListener("click",()=>{
  if(!isPro()){
    openUpgradeModal(); setUpgradeMessage("Watchlist alerts are part of Pro.");
    render();
    return;
  }
  state.watchlistAlertsEnabled=!state.watchlistAlertsEnabled;
  storage.set("midnight-watchlist-alerts",state.watchlistAlertsEnabled?"on":"off");
  render();
});
const browserNotifyToggle=app.querySelector("#browserNotifyToggle");if(browserNotifyToggle)browserNotifyToggle.addEventListener("click",async ()=>{
  if(!state.browserNotifyEnabled){
    await enableBrowserNotifications();
  } else {
    state.browserNotifyEnabled=false;
    storage.set("midnight-browser-notify","off");
    render();
  }
});


const freePlanBtn=app.querySelector("#freePlanBtn");
if(freePlanBtn)freePlanBtn.addEventListener("click",()=>{
  state.planTier = "free";
  storage.set("midnight-plan-tier","free");
  if(state.activeProfileName !== "Default"){
    loadProfile("Default");
  }
  state.watchlistAlertsEnabled = false;
  storage.set("midnight-watchlist-alerts","off");
  render();
});
const proPlanBtn=app.querySelector("#proPlanBtn");
if(proPlanBtn)proPlanBtn.addEventListener("click",()=>{
  state.planTier = "pro";
  storage.set("midnight-plan-tier","pro");
  render();
});
const clearUpgradeMsg=app.querySelector("#clearUpgradeMsg");
if(clearUpgradeMsg)clearUpgradeMsg.addEventListener("click",()=>{
  state.upgradeMessage = "";
  render();
});
const profileSelect=app.querySelector("#profileSelect");
if(profileSelect)profileSelect.addEventListener("change",e=>{
  loadProfile(e.target.value);
  render();
  loadMarkets();
});
const saveProfileBtn=app.querySelector("#saveProfileBtn");
if(saveProfileBtn)saveProfileBtn.addEventListener("click",()=>{
  saveCurrentProfile();
  render();
});
const newProfileBtn=app.querySelector("#newProfileBtn");
if(newProfileBtn)newProfileBtn.addEventListener("click",()=>{
  createProfileFromCurrent();
  render();
});

app.querySelectorAll('.nav-item').forEach(el=>{el.addEventListener('click',()=>{state.activeTab = el.dataset.tab; render();});});
const toggleMode=app.querySelector("#toggleMode");if(toggleMode)toggleMode.addEventListener("click",()=>{state.beginnerMode=!state.beginnerMode;storage.set("midnight-mode",state.beginnerMode?"beginner":"pro");render()})}
render(); loadMarkets(); setInterval(loadMarkets,30000);
