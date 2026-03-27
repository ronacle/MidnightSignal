
const BUILD_NUMBER = window.__MIDNIGHT_BUILD__ || "2026.03.26-api.6.2";
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
async function loadMarkets(){try{const res=await fetch("/api/markets");if(!res.ok)throw new Error(`markets ${res.status}`);const payload=await res.json();state.coins=(payload.coins||[]).map(enrich);state.lastUpdated=new Date();render()}catch(err){console.warn("Markets load failed.",err);render()}}
function getFilteredCoins(){const q=state.assetQuery.toLowerCase();let list=state.coins;if(q)list=list.filter(c=>`${c.symbol} ${c.name}`.toLowerCase().includes(q));return [...list].sort((a,b)=>b.signal-a.signal).sort((a,b)=>state.watchlist.includes(a.symbol)===state.watchlist.includes(b.symbol)?0:state.watchlist.includes(a.symbol)?-1:1)}
function renderOnboarding(){
  const root=document.getElementById("onboarding-root");
  if(!state.showOnboarding){root.innerHTML="";return}
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
            <input id="agreeRisk" type="checkbox" style="width:auto;margin-top:2px">
            <span>I understand this tool is for education and market interpretation only, and I remain responsible for my own decisions.</span>
          </label>
          <label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer">
            <input id="agreeNoAdvice" type="checkbox" style="width:auto;margin-top:2px">
            <span>I understand nothing shown here is financial advice, a guarantee, or a command to act.</span>
          </label>
        </div>
      </div>
      <div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-top:18px">
        ${STRATEGY_OPTIONS.map(s=>`<button type="button" class="${state.strategy===s?'strategy-selected':''}" data-onboard-strategy="${s}">${s[0].toUpperCase()+s.slice(1)}</button>`).join("")}
      </div>
      <div class="tiny" style="margin-top:14px">Choose a starting style now or change it later in Controls. Beginner mode explains the app in plain English. Pro mode reduces helper copy.</div>
      <div class="row" style="margin-top:18px;justify-content:space-between">
        <div class="tiny">Build ${BUILD_NUMBER}</div>
        <button type="button" class="btn-primary" id="acceptAgreement">I Agree & Enter</button>
      </div>
    </div>
  </div>`;
  const riskBox = root.querySelector("#agreeRisk");
  const adviceBox = root.querySelector("#agreeNoAdvice");
  if(riskBox) riskBox.checked = !!state.agreementChecked;
  if(adviceBox) adviceBox.checked = !!state.agreementChecked;
  const accept=root.querySelector("#acceptAgreement");
  const syncAcceptState = () => {
    const ok = !!(riskBox?.checked && adviceBox?.checked);
    state.agreementChecked = ok;
    if(accept){
      accept.disabled = !ok;
      accept.style.opacity = ok ? "" : ".55";
      accept.style.cursor = ok ? "" : "not-allowed";
    }
  };
  syncAcceptState();

  if(accept)accept.addEventListener("click",()=>{
    if(!state.agreementChecked) return;
    state.showOnboarding=false;
    storage.set("midnight-agreement-build",BUILD_NUMBER);
    render();
  });
}
function renderGlossaryShell(){if(!state.glossaryOpen)return "";const topic=GLOSSARY[state.glossaryTopic]||GLOSSARY.signal;return `<section class="card glossary-shell"><div class="row-start"><div><div class="caps">Glossary / FAQ</div><div class="title" style="font-size:28px;margin-top:6px">${topic.title}</div><div class="subtitle" style="margin-top:8px">Fast reference for terms and common questions.</div></div><button id="glossaryClose">Close</button></div><div class="glossary-grid"><div class="mini" style="display:grid;gap:8px;align-content:start">${Object.entries(GLOSSARY).map(([key,item])=>`<button type="button" data-topic="${key}" style="text-align:left;${state.glossaryTopic===key?'border-color:rgba(139,168,255,.35);background:rgba(139,168,255,.12)':''}">${item.title}</button>`).join("")}<button type="button" id="reopenOnboarding" class="reopen-btn" style="text-align:left">Reopen Agreement</button></div><div><div class="mini"><div style="font-size:15px;line-height:1.7;color:rgba(247,247,247,.86)">${topic.body}</div></div><div class="mini faq-block"><div class="caps">FAQ</div><div style="display:grid;gap:14px;margin-top:12px">${FAQ.map(item=>`<div><div style="font-weight:700">${item.q}</div><div class="tiny" style="margin-top:6px;color:rgba(247,247,247,.76)">${item.a}</div></div>`).join("")}</div></div></div></div></section><div id="glossaryBackdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.66);backdrop-filter:blur(6px);z-index:30"></div>`}
function render(){renderOnboarding();const app=document.getElementById("app");const sortedCoins=getFilteredCoins();const summary={bullish:state.coins.filter(c=>c.regime==="Bullish").length,enter:state.coins.filter(c=>c.timing==="Enter").length,avgSignal:state.coins.length?Math.round(state.coins.reduce((s,c)=>s+c.signal,0)/state.coins.length*100):0,topCoin:sortedCoins[0]};const selected=state.selected?state.coins.find(c=>c.symbol===state.selected):null;const topSignal=summary.topCoin; updateSignalChange(topSignal);
app.innerHTML=`<section class="card pulse-frame"><div class="row"><div><div style="font-size:20px;font-weight:700">What’s the signal tonight? 🌙</div><div class="subtitle">Midnight Signal helps you scan, understand, and compare crypto setups in one place.</div></div><div style="width:min(420px,100%)"><input id="searchInput" value="${state.assetQuery}" placeholder="Search crypto…" /></div></div></section>
<section class="grid grid-hero"><div class="card"><div class="row-start"><div><div class="caps">Midnight Signal</div><div class="row" style="justify-content:flex-start;margin-top:6px"><div class="logo-lockup"><div class="logo-badge"></div><div class="logo-wordmark"><div class="title" style="font-size:30px">Midnight Signal</div><div class="tiny">Logo placeholder • easy to swap later</div></div></div><button id="toggleMode">${state.beginnerMode?"Switch to Pro":"Switch to Beginner"}</button></div><p class="subtitle">Signal-first dashboard powered by a Vercel API snapshot.</p><div class="mode-note" style="margin-top:10px">${state.beginnerMode?"Beginner mode is on. You’ll see extra guidance and plain-English framing.":"Pro mode is on. Helper text is reduced for a cleaner signal-first view."}</div></div><div class="controls"><span class="badge live-pill">Live engine</span><span class="badge">${state.timeframe}D timeframe</span></div></div><div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr));margin-top:18px"><div class="metric"><div class="label">Bullish Regimes</div><div class="value">${summary.bullish}/20</div></div><div class="metric"><div class="label">Enter Signals</div><div class="value">${summary.enter}</div></div><div class="metric"><div class="label">Average Confidence</div><div class="value">${summary.avgSignal}%</div></div><div class="metric"><div class="label">Top Opportunity</div><div class="value">${summary.topCoin?.symbol||"—"}</div></div></div></div>
<section class="card"><div class="row-start"><div><div class="caps">Session Settings</div><div style="font-size:22px;font-weight:700;margin-top:4px">Controls</div></div><span class="badge live-pill">API connected</span></div><div class="grid" style="margin-top:14px"><button type="button" id="soundToggle" class="${state.soundEnabled?'sound-toggle-on':''}">Sound: ${state.soundEnabled?'On':'Off'}</button><label><div class="tiny" style="margin-bottom:6px">Strategy</div><select id="strategySelect">${STRATEGY_OPTIONS.map(s=>`<option value="${s}" ${state.strategy===s?"selected":""}>${s[0].toUpperCase()+s.slice(1)}</option>`).join("")}</select></label><label><div class="tiny" style="margin-bottom:6px">Timeframe</div><select id="timeframeSelect">${["7","30","90"].map(t=>`<option value="${t}" ${state.timeframe===t?"selected":""}>${t}D</option>`).join("")}</select></label><div class="metric"><div class="label">Feed Source</div><div style="margin-top:8px;font-size:14px">Vercel API → CoinGecko snapshot</div></div><div class="metric"><div class="label">Last Updated</div><div style="margin-top:8px;font-size:14px">${state.lastUpdated?state.lastUpdated.toLocaleTimeString():"—"}</div></div></div></section></section>
<section class="card top-signal pulse-frame"><div class="caps">Tonight’s Top Signal</div>${topSignal?`<div style="margin-top:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><div class="title" style="font-size:28px">${topSignal.symbol}</div><span class="signal-label ${topSignal.adaptiveLabel.cls}">${topSignal.adaptiveLabel.title}</span>${badge(topSignal.regime)}${badge(topSignal.timing)}</div><div class="subtitle" style="margin-top:8px">${topSignal.name}</div><div class="grid" style="grid-template-columns:1fr 1fr;margin-top:16px"><div class="mini"><div class="tiny">Signal</div><div style="margin-top:6px;font-weight:700">${Math.round(topSignal.signal*100)}%</div><div class="tiny" style="margin-top:4px">${getConfidenceContext(topSignal.signal)}</div></div><div class="mini"><div class="tiny">Suggested Posture</div><div style="margin-top:6px">${postureBadge(topSignal)}</div></div></div><div class="mini" style="margin-top:16px"><div class="tiny">Why it leads</div><div style="margin-top:8px;font-size:14px;color:rgba(247,247,247,.86)">${state.beginnerMode?"It currently ranks highest because its signal strength, timing, and overall alignment are beating the rest of the grid.":"Highest-ranked current setup by signal/opportunity alignment."}</div></div><div class="row" style="margin-top:16px;justify-content:space-between"><div class="tiny ${state.signalChange==='up'?'change-up':state.signalChange==='down'?'change-down':'change-neutral'}">Signal change: ${state.signalChange==='up'?'▲ Rising':state.signalChange==='down'?'▼ Cooling':'• Stable'}</div><button type="button" class="btn-primary" data-select="${topSignal.symbol}">View Details</button></div>`:`<div class="subtitle" style="margin-top:10px">Waiting for live market data…</div>`}</section>
${selected?`<section class="panel"><div class="row-start"><div><div class="caps">Asset Detail</div><div style="margin-top:6px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><div class="title" style="margin:0">${selected.symbol}</div><span class="signal-label ${selected.adaptiveLabel.cls}">${selected.adaptiveLabel.title}</span>${badge(selected.regime)}${badge(selected.timing)}${postureBadge(selected)}</div><div class="subtitle" style="margin-top:8px">${selected.name}</div></div></div><div class="detail-grid-6" style="margin-top:18px"><div class="mini"><div class="tiny">Price</div><div style="margin-top:6px;font-weight:700">${formatPrice(selected.price)}</div></div><div class="mini"><div class="tiny">24h Change</div><div style="margin-top:6px;font-weight:700" class="${selected.change24h>=0?"text-pos":"text-neg"}">${selected.change24h>=0?"+":""}${selected.change24h.toFixed(1)}%</div></div><div class="mini"><div class="tiny">Signal</div><div style="margin-top:6px;font-weight:700">${Math.round(selected.signal*100)}%</div><div class="tiny" style="margin-top:4px">${getConfidenceContext(selected.signal)}</div></div><div class="mini"><div class="tiny">Opportunity</div><div style="margin-top:6px;font-weight:700">${selected.opportunityScore}/100</div></div><div class="mini"><div class="tiny">RSI</div><div style="margin-top:6px;font-weight:700">${selected.indicators.rsi}</div></div><div class="mini"><div class="tiny">MA Trend</div><div style="margin-top:6px;font-weight:700">${selected.indicators.maTrend}</div></div></div><div class="detail-grid-half" style="margin-top:20px"><div class="mini"><div class="tiny">Bullish Confluence</div><div style="margin-top:8px;font-weight:700;color:var(--blue3)">${selected.confluence.bullish}/100</div></div><div class="mini"><div class="tiny">Bearish Confluence</div><div style="margin-top:8px;font-weight:700;color:var(--bear)">${selected.confluence.bearish}/100</div></div></div></section>`:""}
<section><div class="row-start" style="margin-bottom:10px"><div><div style="font-size:20px;font-weight:700">Top 20 Opportunity Grid</div><div class="subtitle">${state.beginnerMode?"Compare setup quality, timing, and confluence across the current top 20.":"Top 20 live opportunities."}</div></div></div><section class="grid grid-cards">${sortedCoins.map(coin=>`<div class="${getCoinClasses(coin,state.selected===coin.symbol)}" data-select="${coin.symbol}" role="button" tabindex="0"><div class="row-start" style="position:relative"><button type="button" data-watch="${coin.symbol}" style="padding:6px 10px">${state.watchlist.includes(coin.symbol)?"★":"☆"}</button><div style="flex:1;min-width:0"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><div style="font-size:20px;font-weight:700">${coin.symbol}</div>${badge(coin.regime)}</div><div class="subtitle" style="margin-top:4px">${coin.name}</div><div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span class="signal-label ${coin.adaptiveLabel.cls}">${coin.adaptiveLabel.title}</span>${postureBadge(coin)}</div></div></div><div><div style="font-size:28px;font-weight:700">${formatPrice(coin.price)}</div><div class="${coin.change24h>=0?"text-pos":"text-neg"}" style="font-size:14px;font-weight:600">${coin.change24h>=0?"+":""}${coin.change24h.toFixed(1)}% (24h)</div></div><div><div class="row"><span class="subtitle">Signal Confidence</span><span>${Math.round(coin.signal*100)}%</span></div><div class="tiny" style="margin-top:4px;color:rgba(247,247,247,.65)">${getConfidenceContext(coin.signal)}</div><div class="progress"><span style="width:${Math.round(coin.signal*100)}%"></span></div></div><div class="grid" style="grid-template-columns:1fr 1fr"><div class="mini"><div class="tiny">Timing</div><div style="margin-top:8px">${badge(coin.timing)}</div></div><div class="mini"><div class="tiny">Opportunity</div><div style="margin-top:8px;font-weight:700">${coin.opportunityScore}/100</div><div class="tiny" style="margin-top:4px">MTF: ${coin.mtf.label}</div></div></div><div class="grid" style="grid-template-columns:1fr 1fr"><div class="mini"><div class="tiny">Bullish Confluence</div><div style="margin-top:8px;font-weight:700;color:var(--blue3)">${coin.confluence.bullish}/100</div></div><div class="mini"><div class="tiny">Bearish Confluence</div><div style="margin-top:8px;font-weight:700;color:var(--bear)">${coin.confluence.bearish}/100</div></div></div><div class="row" style="padding-top:8px;border-top:1px solid rgba(247,247,247,.08)"><div><span class="subtitle">Volume </span><span>${coin.volume}</span></div><div>${coin.risk} risk</div></div></div>`).join("")}</section></section>
${renderGlossaryShell()}
<button type="button" class="btn-primary floating-glossary" id="floatingGlossaryBtn">Glossary / FAQ</button>
<section style="margin-top:20px;text-align:center"><div class="tiny" style="color:rgba(247,247,247,.5)">Midnight Signal • Educational only • Not financial advice • Build ${BUILD_NUMBER}</div></section>`;
const searchInput=app.querySelector("#searchInput");if(searchInput)searchInput.addEventListener("input",e=>{state.assetQuery=e.target.value;render()});
app.querySelectorAll("[data-select]").forEach(el=>{el.addEventListener("click",()=>{state.selected=el.dataset.select;render()});el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();state.selected=el.dataset.select;render()}})});
app.querySelectorAll("[data-watch]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();const sym=el.dataset.watch;state.watchlist=state.watchlist.includes(sym)?state.watchlist.filter(s=>s!==sym):[...state.watchlist,sym];storage.set("midnight-html-watchlist",state.watchlist);render()}));
const floatingGlossaryBtn=app.querySelector("#floatingGlossaryBtn");if(floatingGlossaryBtn)floatingGlossaryBtn.addEventListener("click",()=>{state.glossaryOpen=true;render()});
const glossaryClose=app.querySelector("#glossaryClose");if(glossaryClose)glossaryClose.addEventListener("click",()=>{state.glossaryOpen=false;render()});
const glossaryBackdrop=app.querySelector("#glossaryBackdrop");if(glossaryBackdrop)glossaryBackdrop.addEventListener("click",()=>{state.glossaryOpen=false;render()});
app.querySelectorAll("[data-topic]").forEach(el=>el.addEventListener("click",()=>{state.glossaryTopic=el.dataset.topic;render()}));
const reopenOnboarding=app.querySelector("#reopenOnboarding");if(reopenOnboarding)reopenOnboarding.addEventListener("click",()=>{state.glossaryOpen=false;state.showOnboarding=true;render()});
const strategySelect=app.querySelector("#strategySelect");if(strategySelect)strategySelect.addEventListener("change",e=>{state.strategy=e.target.value;storage.set("midnight-html-strategy",state.strategy);render()});
const timeframeSelect=app.querySelector("#timeframeSelect");if(timeframeSelect)timeframeSelect.addEventListener("change",e=>{state.timeframe=e.target.value;storage.set("midnight-html-timeframe",state.timeframe);loadMarkets()});
const soundToggle=app.querySelector("#soundToggle");if(soundToggle)soundToggle.addEventListener("click",()=>{state.soundEnabled=!state.soundEnabled;storage.set("midnight-sound-enabled",state.soundEnabled?"on":"off");render()});const toggleMode=app.querySelector("#toggleMode");if(toggleMode)toggleMode.addEventListener("click",()=>{state.beginnerMode=!state.beginnerMode;storage.set("midnight-mode",state.beginnerMode?"beginner":"pro");render()})}
render(); loadMarkets(); setInterval(loadMarkets,30000);
