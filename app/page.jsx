
"use client";

import { useEffect, useMemo, useState } from "react";
import BeaconLogo from "../components/BeaconLogo";

const STORAGE_KEYS = {
  agreed: "ms_agreement_accepted",
  mode: "ms_mode",
  strategy: "ms_strategy",
  selectedAsset: "ms_selected_asset",
  watchlist: "ms_watchlist",
  timeframe: "ms_timeframe",
  sound: "ms_sound_ping",
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
  const [symbol,name,price,change24h,volumeNum]=row;
  const rank=index+1;
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
  return {symbol,name,price,change24h,volumeNum,volume:formatVolume(volumeNum),rank,signal,confidence,posture,timing,risk:riskFrom(change24h),rsi,maTrend,history,brief:`${symbol} is showing ${posture.toLowerCase()} posture with ${confidence}% confidence. ${reasons.join(" • ")}.`};
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

function pillTone(value){ if(value==="Bullish"||value==="Enter") return {bg:"rgba(96,103,249,.18)",color:"#8BA8FF",border:"rgba(96,103,249,.45)"}; if(value==="Bearish"||value==="Reduce") return {bg:"rgba(0,51,173,.16)",color:"#2A6BFF",border:"rgba(42,107,255,.42)"}; return {bg:"rgba(247,247,247,.04)",color:"#e5e7eb",border:"rgba(247,247,247,.14)"}; }
function Pill({children,tone}){ const s=pillTone(tone||children); return <span style={{display:"inline-flex",alignItems:"center",gap:8,borderRadius:999,padding:"8px 12px",border:`1px solid ${s.border}`,background:s.bg,fontSize:12,color:s.color,fontWeight:700}}>{children}</span>; }

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
  const [pulseKey, setPulseKey] = useState(0);
  const [lastInsight, setLastInsight] = useState("");

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
    } catch {}
  }, []);
  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEYS.mode, mode); } catch {} }, [mode]);
  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEYS.strategy, strategy); } catch {} }, [strategy]);
  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEYS.timeframe, timeframe); } catch {} }, [timeframe]);
  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEYS.selectedAsset, selected); } catch {} }, [selected]);
  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEYS.watchlist, JSON.stringify(watchlist)); } catch {} }, [watchlist]);
  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEYS.sound, soundOn ? "true" : "false"); } catch {} }, [soundOn]);

  useEffect(() => {
    const id=window.setInterval(() => {
      setCoins(prev => prev.map((coin,i) => {
        const nextPrice=Math.max(0.0001, coin.price*(1+(Math.random()-0.5)*0.02));
        const nextChange=Math.max(-12, Math.min(12, coin.change24h+(Math.random()-0.5)*1.2));
        return enrich([coin.symbol, coin.name, Number(nextPrice.toFixed(coin.price>=1?2:4)), Number(nextChange.toFixed(1)), coin.volumeNum], i);
      }));
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  const ordered=useMemo(() => {
    const sorted=[...coins].sort((a,b)=>b.confidence-a.confidence);
    sorted.sort((a,b)=>watchlist.includes(a.symbol)===watchlist.includes(b.symbol)?0:watchlist.includes(a.symbol)?-1:1);
    return sorted;
  }, [coins, watchlist]);
  const topSignal=ordered[0]||null;
  const active=ordered.find(c=>c.symbol===selected)||topSignal;

  useEffect(() => {
    if(!topSignal) return;
    if(topSignal.symbol!==lastInsight){
      setPulseKey(v=>v+1);
      setLastInsight(topSignal.symbol);
      try { window.localStorage.setItem("ms_last_insight", topSignal.symbol); } catch {}
      if(soundOn){
        try {
          const ctx=new (window.AudioContext||window.webkitAudioContext)();
          const osc=ctx.createOscillator(); const gain=ctx.createGain();
          osc.type="sine"; osc.frequency.value=880; gain.gain.value=0.0001;
          osc.connect(gain); gain.connect(ctx.destination); osc.start();
          gain.gain.exponentialRampToValueAtTime(0.03, ctx.currentTime+0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+0.12);
          osc.stop(ctx.currentTime+0.14);
        } catch {}
      }
    }
  }, [topSignal?.symbol, soundOn]);

  function acceptAgreement(){ if(!checkedEducation||!checkedRisk) return; setAgreed(true); try { window.localStorage.setItem(STORAGE_KEYS.agreed,"true"); } catch {} }
  function toggleWatch(symbol){ setWatchlist(prev => prev.includes(symbol)?prev.filter(s=>s!==symbol):[...prev,symbol]); }

  const stats=[["Bullish Regimes", `${coins.filter(c=>c.posture==="Bullish").length}/20`],["Enter Signals", `${coins.filter(c=>c.timing==="Enter").length}`],["Average Confidence", `${Math.round(coins.reduce((s,c)=>s+c.confidence,0)/coins.length)}%`],["Top Opportunity", topSignal?topSignal.symbol:"—"]];

  return (
    <main style={{minHeight:"100vh",color:"#f7f7f7",background:"radial-gradient(circle at top, rgba(42,107,255,.14), transparent 28%), linear-gradient(135deg, #0d1530 0%, #181c2f 45%, #0f1330 100%)",padding:"24px 0 40px"}}>
      <style>{`
        .ms-wrap{max-width:1320px;margin:0 auto;padding:0 24px;display:grid;gap:20px}
        .ms-card{background:rgba(24,28,47,.82);border:1px solid rgba(247,247,247,.1);border-radius:28px;box-shadow:0 20px 80px rgba(0,0,0,.35);backdrop-filter:blur(18px);padding:24px}
        .ms-grid{display:grid;gap:20px}.ms-hero{grid-template-columns:1.4fr 1fr}.ms-stats{grid-template-columns:repeat(4,minmax(0,1fr))}.ms-watch{grid-template-columns:repeat(3,minmax(0,1fr))}.ms-coins{grid-template-columns:repeat(4,minmax(0,1fr))}
        .ms-row{display:flex;gap:14px;align-items:center;justify-content:space-between}.ms-title{font-size:32px;font-weight:800;letter-spacing:-.03em;margin:0}.ms-sub{font-size:14px;color:rgba(247,247,247,.62)}
        .ms-metric{border:1px solid rgba(247,247,247,.08);background:rgba(247,247,247,.04);border-radius:18px;padding:16px}.ms-metric-label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:rgba(247,247,247,.55)}.ms-metric-value{margin-top:8px;font-size:24px;font-weight:700}
        .coin-btn{border:1px solid rgba(247,247,247,.08);background:rgba(24,28,47,.78);border-radius:24px;padding:18px;box-shadow:0 14px 50px rgba(0,0,0,.32);display:grid;gap:14px;text-align:left;color:#fff;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease,opacity .18s ease;cursor:pointer}
        .coin-btn:hover{transform:translateY(-3px);box-shadow:0 20px 56px rgba(0,0,0,.38),0 0 0 1px rgba(139,168,255,.14);border-color:rgba(139,168,255,.28)} .coin-btn.active{border-color:rgba(139,168,255,.65);box-shadow:0 0 0 2px rgba(139,168,255,.18),0 14px 50px rgba(0,0,0,.32)} .coin-btn.dim{opacity:.86}
        .watch-card{border:1px solid rgba(96,103,249,.35);background:linear-gradient(135deg, rgba(96,103,249,.16), rgba(0,51,173,.18));border-radius:24px;padding:16px;text-align:left;color:#fff;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease}.watch-card:hover{transform:translateY(-2px);box-shadow:0 16px 44px rgba(0,0,0,.28)}
        .top-signal-shell{position:relative;overflow:hidden}.top-signal-shell::after{content:"";position:absolute;inset:-120px;pointer-events:none;background:radial-gradient(circle, rgba(139,168,255,.11) 0%, rgba(139,168,255,0) 58%);opacity:.7}
        .pulse-ring{position:absolute;width:22px;height:22px;border-radius:999px;right:34px;top:34px;border:2px solid rgba(139,168,255,.55);animation:msPulse 2.15s ease-out infinite;pointer-events:none}.pulse-ring:nth-child(2){animation-delay:.7s}.pulse-ring:nth-child(3){animation-delay:1.4s}
        @keyframes msPulse{0%{transform:scale(.35);opacity:.85}100%{transform:scale(4.4);opacity:0}}
        .focus-chip{border-radius:16px;padding:12px 14px;font-weight:900;font-size:22px}.btn,.select{width:100%;padding:11px 14px;border-radius:16px;border:1px solid rgba(247,247,247,.12);background:rgba(247,247,247,.04);color:#fff}.btn-strong{border:0;cursor:pointer;padding:12px 16px;border-radius:14px;font-weight:800;background:linear-gradient(135deg,#2563eb,#4f46e5);color:white}
        @media (max-width:1100px){.ms-hero,.ms-stats,.ms-watch,.ms-coins{grid-template-columns:repeat(2,minmax(0,1fr))}} @media (max-width:700px){.ms-wrap{padding:0 14px}.ms-hero,.ms-stats,.ms-watch,.ms-coins{grid-template-columns:1fr}.ms-row{flex-direction:column;align-items:stretch}.ms-title{font-size:26px}}
      `}</style>

      {!agreed && <div style={{position:"fixed",inset:0,zIndex:60,display:"grid",placeItems:"center",background:"rgba(0,0,0,.72)",backdropFilter:"blur(8px)",padding:20}}><div className="ms-card" style={{maxWidth:560,width:"100%"}}><div style={{fontSize:13,color:"#93c5fd",fontWeight:700,marginBottom:10}}>AGREEMENT OF UNDERSTANDING</div><h1 style={{margin:0,fontSize:34,lineHeight:1.05,marginBottom:14}}>Midnight Signal is educational, not financial advice.</h1><p style={{color:"#cbd5e1",lineHeight:1.7,marginBottom:22}}>This product helps you interpret market posture, confluence, and confidence in a cleaner way. It does not guarantee outcomes and should not replace your own judgment.</p><div style={{display:"grid",gap:14,background:"rgba(15,23,42,0.55)",border:"1px solid rgba(148,163,184,0.12)",borderRadius:18,padding:16,marginBottom:20}}><label style={{display:"flex",gap:12,alignItems:"flex-start"}}><input type="checkbox" checked={checkedEducation} onChange={(e)=>setCheckedEducation(e.target.checked)} style={{marginTop:4}}/><span style={{color:"#e2e8f0",lineHeight:1.6}}>I understand Midnight Signal is an educational tool and not a trade recommendation engine.</span></label><label style={{display:"flex",gap:12,alignItems:"flex-start"}}><input type="checkbox" checked={checkedRisk} onChange={(e)=>setCheckedRisk(e.target.checked)} style={{marginTop:4}}/><span style={{color:"#e2e8f0",lineHeight:1.6}}>I understand markets are risky and I remain fully responsible for my own decisions.</span></label></div><div style={{display:"flex",gap:12,flexWrap:"wrap"}}><button onClick={acceptAgreement} disabled={!checkedEducation||!checkedRisk} className="btn-strong" style={{opacity:checkedEducation&&checkedRisk?1:.55,cursor:checkedEducation&&checkedRisk?"pointer":"not-allowed"}}>Agree and Enter</button></div></div></div>}

      <div className="ms-wrap">
        <section className="ms-card">
          <div className="ms-row">
            <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
              <div style={{ flex: "0 0 auto" }}>
                <BeaconLogo size={92} />
              </div>
              <div>
                <div style={{fontSize:14,color:"#94a3b8",marginBottom:6}}>Midnight Signal Panel</div>
                <h1 className="ms-title">What’s the signal tonight? 🌙</h1>
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
              </div>
            </div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
              <button onClick={()=>setMode("Beginner")} className="btn-strong" style={{background:mode==="Beginner"?"linear-gradient(135deg, #2563eb, #4f46e5)":"rgba(15,23,42,0.72)"}}>Beginner</button>
              <button onClick={()=>setMode("Pro")} className="btn-strong" style={{background:mode==="Pro"?"linear-gradient(135deg, #2563eb, #4f46e5)":"rgba(15,23,42,0.72)"}}>Pro</button>
            </div>
          </div>
        </section>

        {topSignal && <section className="ms-grid ms-hero"><div className="ms-card top-signal-shell" key={pulseKey}><div className="pulse-ring"></div><div className="pulse-ring"></div><div className="pulse-ring"></div><div className="ms-row"><div><div style={{fontSize:14,color:"#94a3b8"}}>Tonight’s Top Signal</div><div style={{fontSize:34,fontWeight:900,marginTop:4}}>{topSignal.symbol} • {topSignal.posture}</div><div className="ms-sub" style={{marginTop:8}}>Strategy: {strategy} • {timeframe}D derived history • beacon identity pass</div></div><div className="focus-chip" style={{background:topSignal.confidence>=70?"rgba(34,197,94,0.12)":topSignal.confidence<45?"rgba(59,130,246,0.10)":"rgba(148,163,184,0.10)",color:topSignal.confidence>=70?"#86efac":topSignal.confidence<45?"#93c5fd":"#cbd5e1"}}>{topSignal.confidence}%</div></div><div style={{marginTop:18,padding:18,borderRadius:18,background:"rgba(2,6,23,0.55)",border:"1px solid rgba(148,163,184,0.12)"}}><div style={{fontSize:13,color:"#94a3b8",marginBottom:10}}>Tonight’s Brief</div><div style={{lineHeight:1.7,color:"#e2e8f0",fontSize:16}}>{topSignal.brief}</div></div><div className="ms-grid ms-stats" style={{marginTop:18}}><div className="ms-metric"><div className="ms-metric-label">Price</div><div className="ms-metric-value">{formatPrice(topSignal.price)}</div></div><div className="ms-metric"><div className="ms-metric-label">24H Change</div><div className="ms-metric-value" style={{color:topSignal.change24h>=0?"#8BA8FF":"#2A6BFF"}}>{topSignal.change24h>=0?"+":""}{topSignal.change24h.toFixed(1)}%</div></div><div className="ms-metric"><div className="ms-metric-label">Volume</div><div className="ms-metric-value">{topSignal.volume}</div></div><div className="ms-metric"><div className="ms-metric-label">Risk Profile</div><div className="ms-metric-value">{topSignal.risk}</div></div></div></div>
          <aside className="ms-card"><div style={{fontSize:14,color:"#94a3b8",marginBottom:12}}>Session Settings</div><div style={{display:"grid",gap:14}}><label><div style={{fontSize:13,color:"#94a3b8",marginBottom:8}}>Trader style</div><select className="select" value={strategy} onChange={(e)=>setStrategy(e.target.value)}><option value="scalp">Scalp</option><option value="swing">Swing</option><option value="position">Position</option></select></label><label><div style={{fontSize:13,color:"#94a3b8",marginBottom:8}}>Timeframe</div><select className="select" value={timeframe} onChange={(e)=>setTimeframe(e.target.value)}><option value="7">7D</option><option value="30">30D</option><option value="90">90D</option></select></label><label style={{display:"flex",alignItems:"center",gap:10}}><input type="checkbox" checked={soundOn} onChange={(e)=>setSoundOn(e.target.checked)}/><span>Signal ping on leader change</span></label><div className="ms-sub">No heavy render layer here. Just a focused pulse on the top signal and cleaner card interactions.</div></div></aside></section>}

        <section className="ms-card"><div className="ms-grid ms-stats">{stats.map(([label,value]) => <div className="ms-metric" key={label}><div className="ms-metric-label">{label}</div><div className="ms-metric-value">{value}</div></div>)}</div></section>

        <section className="ms-card"><div className="ms-row"><div><div style={{fontSize:20,fontWeight:700}}>Watchlist</div><div className="ms-sub">Your pinned Midnight Signal picks, persisted on this device.</div></div><div style={{fontSize:12,color:"rgba(247,247,247,.5)"}}>{watchlist.length} tracked</div></div><div className="ms-grid ms-watch" style={{marginTop:14}}>{ordered.filter(c=>watchlist.includes(c.symbol)).map(coin => <button className="watch-card" key={coin.symbol} onClick={()=>setSelected(coin.symbol)}><div className="ms-row"><div><div style={{fontSize:20,fontWeight:700}}>{coin.symbol}</div><div className="ms-sub">{coin.name}</div></div><Pill>{coin.posture}</Pill></div><div style={{fontSize:28,fontWeight:700,marginTop:10}}>{formatPrice(coin.price)}</div><div style={{fontSize:14,fontWeight:600,color:coin.change24h>=0?"#8BA8FF":"#2A6BFF"}}>{coin.change24h>=0?"+":""}{coin.change24h.toFixed(1)}% today</div><div style={{marginTop:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8,fontSize:12,color:"rgba(247,247,247,.5)"}}><span>{timeframe}D derived sparkline</span><span>{coin.confidence}%</span></div>{sparkline(coin.history, coin.change24h>=0)}</div></button>)}</div></section>

        <section className="ms-card"><div className="ms-row"><div><div style={{display:"flex",gap:8,alignItems:"center"}}><h2 style={{fontSize:24,margin:0}}>Top 20 Opportunity Grid</h2>{mode==="Beginner"?<span style={{fontSize:12,color:"rgba(247,247,247,.5)"}}>ⓘ Higher scores = stronger alignment, not certainty.</span>:null}</div><div className="ms-sub">Click a coin to open the detail panel.</div></div></div><div className="ms-grid ms-coins" style={{marginTop:16}}>{ordered.map(coin => <button key={coin.symbol} className={`coin-btn ${active?.symbol===coin.symbol?"active":""} ${topSignal?.symbol!==coin.symbol?"dim":""}`} onClick={()=>setSelected(coin.symbol)}><div className="ms-row"><button type="button" onClick={(e)=>{e.stopPropagation();toggleWatch(coin.symbol);}} style={{border:"1px solid rgba(247,247,247,.12)",background:"rgba(247,247,247,.04)",color:"#fff",borderRadius:14,padding:"8px 10px",cursor:"pointer"}}>{watchlist.includes(coin.symbol)?"★":"☆"}</button><Pill>{coin.posture}</Pill></div><div><div style={{fontSize:22,fontWeight:800}}>{coin.symbol}</div><div className="ms-sub">{coin.name}</div></div><div style={{fontSize:28,fontWeight:700}}>{formatPrice(coin.price)}</div><div style={{fontSize:14,fontWeight:600,color:coin.change24h>=0?"#8BA8FF":"#2A6BFF"}}>{coin.change24h>=0?"+":""}{coin.change24h.toFixed(1)}% today</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Pill tone={coin.timing}>{coin.timing}</Pill><Pill tone={coin.posture}>{coin.posture}</Pill></div><div><div className="ms-row" style={{marginBottom:8}}><span style={{fontSize:12,color:"rgba(247,247,247,.5)"}}>Signal Confidence</span><span style={{fontSize:12,color:"rgba(247,247,247,.7)"}}>{coin.confidence}%</span></div><div style={{height:8,width:"100%",borderRadius:999,background:"rgba(247,247,247,.1)",overflow:"hidden"}}><span style={{display:"block",height:"100%",width:`${coin.confidence}%`,borderRadius:999,background:"linear-gradient(90deg, #0033AD, #6067F9, #8BA8FF)"}}></span></div></div></button>)}</div></section>

        {active && <section className="ms-card"><div className="ms-row"><div><div style={{fontSize:14,color:"#94a3b8"}}>Signal Detail Panel</div><div style={{fontSize:30,fontWeight:900,marginTop:4}}>{active.symbol} • {active.posture}</div><div className="ms-sub" style={{marginTop:8}}>{active.change24h>=0?"+":""}{active.change24h.toFixed(1)}% today</div></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Pill>{active.posture}</Pill><Pill tone={active.timing}>{active.timing}</Pill><Pill>{timeframe}D derived history</Pill></div></div><div className="ms-grid ms-stats" style={{marginTop:16}}><div className="ms-metric"><div className="ms-metric-label">Signal Confidence</div><div className="ms-metric-value">{active.confidence}%</div></div><div className="ms-metric"><div className="ms-metric-label">Opportunity Score</div><div className="ms-metric-value">{Math.min(100, Math.max(0, active.confidence + (active.timing==="Enter"?8:active.timing==="Reduce"?-8:0)))}/100</div></div><div className="ms-metric"><div className="ms-metric-label">RSI State</div><div className="ms-metric-value">{active.rsi}</div></div><div className="ms-metric"><div className="ms-metric-label">Risk Profile</div><div className="ms-metric-value">{active.risk}</div></div></div><div className="ms-grid ms-hero" style={{marginTop:18}}><div className="ms-metric"><div className="ms-metric-label">Tonight’s Top Signal Detail</div><div style={{fontSize:18,fontWeight:700,marginTop:10}}>{active.brief}</div>{mode==="Beginner"?<div className="ms-sub" style={{marginTop:12,lineHeight:1.7}}>Confidence reflects the app’s weighted read on posture, momentum, and stability. It is a learning aid, not certainty.</div>:<div className="ms-sub" style={{marginTop:12,lineHeight:1.7}}>Derived from weighted momentum, trend rank, and volatility normalization against the seeded market basket.</div>}</div><div className="ms-metric"><div className="ms-metric-label">Derived Sparkline</div><div style={{marginTop:12}}>{sparkline(active.history, active.change24h>=0)}</div><div className="ms-sub" style={{marginTop:12}}>This safe motion build leaves the background alone and concentrates movement on the top signal and card interactions only.</div></div></div></section>}

        <section style={{textAlign:"center",fontSize:12,color:"rgba(247,247,247,.45)",paddingTop:8}}><div style={{marginBottom:8}}>Midnight Signal • Terms • Privacy • Disclaimer</div><div>This application is provided for educational and informational purposes only. It does not constitute financial, investment, or trading advice.</div><div style={{marginTop:8}}>Midnight Signal v8.4.1 • logo pass B</div></section>
      </div>
    </main>
  );
}
