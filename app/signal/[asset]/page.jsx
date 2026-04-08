"use client";

import Link from "next/link";

export default async function SignalPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const asset = (resolvedParams?.asset || "btc").toUpperCase();
  const posture = resolvedSearch?.posture || "Bullish";
  const confidence = resolvedSearch?.confidence || "72";

  return (
    <main style={{minHeight:"100vh",background:"radial-gradient(circle at top, rgba(96,103,249,.18), transparent 40%), #050816",color:"#fff",padding:"40px 20px"}}>
      <div style={{maxWidth:760,margin:"0 auto",display:"grid",gap:18}}>
        <div style={{fontSize:13,letterSpacing:".14em",textTransform:"uppercase",color:"#bcd0ff"}}>Public Signal Preview</div>
        <div style={{padding:24,borderRadius:28,border:"1px solid rgba(247,247,247,.08)",background:"linear-gradient(180deg, rgba(11,18,39,.96), rgba(24,28,47,.94))",boxShadow:"0 20px 60px rgba(0,0,0,.35)"}}>
          <div style={{fontSize:32,fontWeight:900,marginBottom:10}}>🌙 {asset} — {posture}</div>
          <div style={{display:"inline-flex",padding:"10px 14px",borderRadius:999,background:"rgba(96,103,249,.16)",border:"1px solid rgba(96,103,249,.26)",fontWeight:800,marginBottom:16}}>{confidence}% confidence</div>
          <p style={{margin:0,color:"#cbd5e1",lineHeight:1.8,fontSize:16}}>Tonight’s signal suggests that {asset} has a {posture.toLowerCase()} posture with the market structure leaning toward a cleaner directional read. Unlock the full breakdown, factor weighting, and nightly context inside Midnight Signal.</p>
        </div>

        <div style={{padding:24,borderRadius:24,border:"1px solid rgba(247,247,247,.08)",background:"rgba(247,247,247,.03)"}}>
          <div style={{fontSize:14,color:"#94a3b8",marginBottom:10}}>What you get with full access</div>
          <div style={{display:"grid",gap:10,color:"#e2e8f0",lineHeight:1.7}}>
            <div>• Tonight’s full signal breakdown</div>
            <div>• Multi-timeframe weighting</div>
            <div>• Signal context + nightly narrative</div>
            <div>• Watchlist-driven alerts and return loop</div>
          </div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:18}}>
            <Link href="/" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"12px 18px",borderRadius:16,background:"linear-gradient(135deg, #6067F9, #0033AD)",color:"#fff",fontWeight:800,textDecoration:"none"}}>Unlock Full Signal</Link>
            <Link href="/" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"12px 18px",borderRadius:16,border:"1px solid rgba(247,247,247,.14)",background:"rgba(247,247,247,.03)",color:"#fff",fontWeight:700,textDecoration:"none"}}>Back to Midnight Signal</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
