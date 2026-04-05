
"use client";
import {useEffect,useState} from "react";

export default function Page(){
  const [data,setData]=useState(null);
  const [selected,setSelected]=useState(null);

  useEffect(()=>{
    fetch("/api/signal").then(r=>r.json()).then(setData);
  },[]);

  if(!data) return <div className="container">Loading...</div>;

  return(
    <div className="container">
      <div className="panel header">
        <div>
          <div style={{opacity:.6,fontSize:12}}>Midnight Signal Panel</div>
          <div className="title">🌙 What's the signal tonight?</div>
        </div>
        <div>
          <button className="badge">Beginner</button>
          <button className="badge">Pro</button>
        </div>
      </div>

      <div className="row">
        <div className="panel">
          <div style={{opacity:.6}}>Tonight's Top Signal</div>
          <div className="signal">{data.top.asset} • {data.top.label}</div>
          <div style={{marginTop:10}}>Confidence: {data.top.confidence}%</div>
        </div>

        <div className="panel">
          <div>Session Settings</div>
          <div style={{marginTop:10,opacity:.6}}>Mode: Beginner</div>
        </div>
      </div>

      <div className="grid">
        {data.grid.map((a,i)=>(
          <div key={i} className="card" onClick={()=>setSelected(a)}>
            <div>{a.asset}</div>
            <div>{a.confidence}%</div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="drawer" onClick={()=>setSelected(null)}>
          <h2>{selected.asset}</h2>
          <p>Confidence {selected.confidence}%</p>
        </div>
      )}
    </div>
  );
}
