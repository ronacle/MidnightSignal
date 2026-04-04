import TopNav from "./TopNav";
import Beacon from "./Beacon";

export default function LandingPage() {
  return (
    <div className="container">
      <TopNav tagline="Beacon motion polish • From Noise to Wisdom." />
      <section className="hero">
        <div>
          <div className="eyebrow">Beacon motion polish</div>
          <h1 className="page-title">The signal beacon feels <span className="hero-gradient">alive</span> again.</h1>
          <p className="section-text">This build restores spinning segmented rings, floating outer dots, a pulsing core, and stronger panel depth without changing the working engine.</p>
          <div className="hero-actions">
            <a className="button-primary" href="/app">Open App</a>
            <a className="button-secondary" href="/about">Read About</a>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-inner panel-glow">
            <Beacon size={340} labels />
            <div className="metrics">
              <div className="metric"><small>Outer Ring</small><strong>Spinning</strong></div>
              <div className="metric"><small>Core</small><strong>Pulsing</strong></div>
              <div className="metric"><small>Dots</small><strong>Floating</strong></div>
              <div className="metric"><small>Panels</small><strong>Polished</strong></div>
            </div>
          </div>
        </div>
      </section>
      <footer className="footer"><div>MIDNIGHT SIGNAL</div><div>Beacon motion polish build</div></footer>
    </div>
  );
}
