import Link from "next/link";

export default function TopNav({ tagline }: { tagline: string }) {
  return (
    <header className="topbar panel-glow">
      <div className="brand">
        <div className="beacon-glow" style={{width:44,height:44,borderRadius:999,border:"1px solid rgba(255,255,255,.12)",display:"grid",placeItems:"center"}}>🌙</div>
        <div>
          <div className="brand-wordmark">MIDNIGHT SIGNAL</div>
          <div className="brand-tagline">{tagline}</div>
        </div>
      </div>
      <nav className="nav">
        <a href="/">Home</a>
        <a href="/app">App</a>
        <a href="/about">About</a>
      </nav>
    </header>
  );
}
