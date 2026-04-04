"use client";
import { useEffect, useMemo, useState } from "react";
import TopNav from "./TopNav";
import Beacon from "./Beacon";

type Weight = { label: string; value: number };
type AlertLabel = "HIGH SIGNAL" | "DEVELOPING" | "WEAKENING" | "BREAKDOWN WATCH";
type Signal = { id:string; title:string; contextWeights:Weight[]; previousWeights?:Weight[]; finalScore:number; changed:number; confidenceLabel:"HIGH SIGNAL"|"DEVELOPING"|"WEAK"; alertLabel:AlertLabel };

const baseSignals = (): Signal[] => [
  { id:"1", title:"Cardano market context", contextWeights:[{label:"Recency",value:74},{label:"Sentiment",value:68},{label:"Diversity",value:61},{label:"Volume",value:57},{label:"Momentum",value:63}], finalScore:67, changed:0, confidenceLabel:"DEVELOPING", alertLabel:"DEVELOPING" },
  { id:"2", title:"Bitcoin market context", contextWeights:[{label:"Recency",value:78},{label:"Sentiment",value:73},{label:"Diversity",value:76},{label:"Volume",value:71},{label:"Momentum",value:69}], finalScore:74, changed:0, confidenceLabel:"DEVELOPING", alertLabel:"DEVELOPING" },
  { id:"3", title:"Ethereum market context", contextWeights:[{label:"Recency",value:65},{label:"Sentiment",value:60},{label:"Diversity",value:72},{label:"Volume",value:64},{label:"Momentum",value:52}], finalScore:63, changed:0, confidenceLabel:"DEVELOPING", alertLabel:"DEVELOPING" }
];

function calc(weights: Weight[]) {
  const m = Object.fromEntries(weights.map(w => [w.label, w.value])) as Record<string, number>;
  return Math.round(m.Recency*0.30 + m.Sentiment*0.20 + m.Diversity*0.15 + m.Volume*0.20 + m.Momentum*0.15);
}
function conf(score:number):Signal["confidenceLabel"]{ if(score>75) return "HIGH SIGNAL"; if(score>=50) return "DEVELOPING"; return "WEAK"; }
function alert(score:number, changed:number, weights:Weight[], previous?:Weight[]):AlertLabel{
  const sentiment = weights.find(w => w.label === "Sentiment")?.value ?? 0;
  const momentum = weights.find(w => w.label === "Momentum")?.value ?? 0;
  const prevSent = previous?.find(w => w.label === "Sentiment")?.value ?? sentiment;
  const prevMom = previous?.find(w => w.label === "Momentum")?.value ?? momentum;
  if(score > 75) return "HIGH SIGNAL";
  if(sentiment < prevSent - 4 && momentum < prevMom - 4) return "BREAKDOWN WATCH";
  if(changed < -3) return "WEAKENING";
  return "DEVELOPING";
}
function explain(signal: Signal): string[] {
  const previous = signal.previousWeights;
  if(!previous) return [];
  return signal.contextWeights.map((w, i) => {
    const prev = previous[i];
    if(!prev) return null;
    const delta = w.value - prev.value;
    if(Math.abs(delta) < 2) return null;
    if(w.label === "Momentum" && delta > 0) return "Momentum is accelerating";
    if(w.label === "Momentum" && delta < 0) return "Momentum is cooling";
    if(w.label === "Sentiment" && delta > 0) return "Sentiment is strengthening";
    if(w.label === "Sentiment" && delta < 0) return "Sentiment is weakening";
    return delta > 0 ? `${w.label} is strengthening` : `${w.label} is weakening`;
  }).filter((v): v is string => Boolean(v));
}
function tierClass(label:Signal["confidenceLabel"]){ return label === "HIGH SIGNAL" ? "tier tier-high" : label === "DEVELOPING" ? "tier tier-mid" : "tier tier-low"; }
function alertClass(label:AlertLabel){ return label === "HIGH SIGNAL" ? "alert-pill alert-high" : label === "DEVELOPING" ? "alert-pill alert-developing" : label === "WEAKENING" ? "alert-pill alert-weakening" : "alert-pill alert-breakdown"; }

export default function Dashboard() {
  const [signals, setSignals] = useState<Signal[]>(baseSignals());
  const [refreshedAt, setRefreshedAt] = useState(new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSignals(prev => prev.map(s => {
        const nextWeights = s.contextWeights.map(w => ({
          ...w,
          value: Math.max(0, Math.min(100, w.value + (Math.random() * 4 - 2)))
        }));
        const nextScore = calc(nextWeights);
        const changed = nextScore - s.finalScore;
        return {
          ...s,
          previousWeights: s.contextWeights,
          contextWeights: nextWeights,
          finalScore: nextScore,
          changed,
          confidenceLabel: conf(nextScore),
          alertLabel: alert(nextScore, changed, nextWeights, s.contextWeights)
        };
      }));
      setRefreshedAt(new Date());
    }, 4000);
    return () => window.clearInterval(interval);
  }, []);

  const topSignal = useMemo(() => [...signals].sort((a,b) => b.finalScore - a.finalScore)[0], [signals]);

  return (
    <div className="container page-shell">
      <TopNav tagline={`Beacon motion polish • Last refreshed ${refreshedAt.toLocaleTimeString()}`} />
      <div style={{marginTop:40}}>
        <div className="eyebrow">Beacon Motion Polish</div>
        <h1 className="page-title" style={{fontSize:"clamp(36px, 5vw, 64px)"}}>Restored motion. Better feel.</h1>
        <p className="section-text" style={{maxWidth:780}}>The beacon spins again, the core pulses again, and the UI regains the Midnight Signal feel without breaking the working alert engine.</p>
      </div>

      {topSignal ? (
        <section className="alert-banner panel-glow">
          <div className="row">
            <div>
              <div className={alertClass(topSignal.alertLabel)}>{topSignal.alertLabel}</div>
              <h3 style={{margin:"10px 0 6px"}}>{topSignal.title}</h3>
              <p className="muted small" style={{margin:0}}>Top signal score: {topSignal.finalScore}</p>
            </div>
            <div className="live-dot"></div>
          </div>
        </section>
      ) : null}

      <section className="page-shell dashboard-grid">
        <div className="stack">
          <div className="panel panel-glow">
            <div className="eyebrow" style={{marginBottom:10,padding:"6px 10px",fontSize:11}}>Signal Output</div>
            <h3 style={{marginTop:10}}>What deserves attention right now</h3>
            <div className="stack">
              {signals.map((s) => (
                <div className="item item-glow" key={s.id}>
                  <div className="row"><div style={{fontWeight:700}}>{s.title}</div><div className="score">{s.finalScore}</div></div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <div className={tierClass(s.confidenceLabel)}>{s.confidenceLabel}</div>
                    <div className={alertClass(s.alertLabel)}>{s.alertLabel}</div>
                    {s.changed > 0 ? <div className="change up">⬆ Strengthening</div> : null}
                    {s.changed < 0 ? <div className="change down">⬇ Weakening</div> : null}
                  </div>
                  <div style={{marginTop:14}}>
                    <strong>Why it changed:</strong>
                    <ul style={{marginTop:8}}>
                      {explain(s).length ? explain(s).map((r, i) => <li key={i}>{r}</li>) : <li>Waiting for the next meaningful move.</li>}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="panel panel-glow" style={{minHeight:420,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Beacon size={360} labels />
          </div>
          <div className="panel panel-glow">
            <div className="eyebrow" style={{marginBottom:10,padding:"6px 10px",fontSize:11}}>Context Strength</div>
            <h3 style={{marginTop:10}}>{topSignal.title}</h3>
            <p className="muted small">Weighted inputs behind the current leader.</p>
            {topSignal.contextWeights.map((w) => (
              <div key={w.label} style={{display:"grid",gap:8,marginBottom:12}}>
                <div className="row"><span>{w.label}</span><strong>{w.value}</strong></div>
                <div className="bar"><div className="fill" style={{width:`${w.value}%`}} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="stack">
          <div className="card panel-glow">
            <div className="eyebrow" style={{marginBottom:10,padding:"6px 10px",fontSize:11}}>Top Alert</div>
            <div className={alertClass(topSignal.alertLabel)}>{topSignal.alertLabel}</div>
            <p className="muted small">{topSignal.title}</p>
          </div>
          <div className="card panel-glow">
            <div className="eyebrow" style={{marginBottom:10,padding:"6px 10px",fontSize:11}}>Signal Confidence</div>
            <div className="page-title" style={{fontSize:30}}>{topSignal.finalScore}</div>
            <p className="muted small">{topSignal.confidenceLabel}</p>
          </div>
          <div className="panel panel-glow">
            <div className="eyebrow" style={{marginBottom:10,padding:"6px 10px",fontSize:11}}>Motion Restore Notes</div>
            <div className="stack">
              <div className="item item-glow"><strong>Outer ring</strong><div className="muted small">Slow clockwise rotation restored.</div></div>
              <div className="item item-glow"><strong>Middle ring</strong><div className="muted small">Reverse spin restored for tension.</div></div>
              <div className="item item-glow"><strong>Core</strong><div className="muted small">Pulse and glow restored.</div></div>
              <div className="item item-glow"><strong>Dots</strong><div className="muted small">Floating motion restored.</div></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
