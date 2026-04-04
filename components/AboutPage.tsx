import TopNav from "./TopNav";
import Beacon from "./Beacon";

export default function AboutPage() {
  return (
    <div className="container page-shell">
      <TopNav tagline="About Midnight Signal" />
      <div className="feature-grid" style={{gridTemplateColumns:"1.1fr .9fr"}}>
        <div className="panel panel-glow">
          <div className="eyebrow">About</div>
          <h1 className="page-title" style={{fontSize:"clamp(36px, 5vw, 64px)"}}>The visual system matters.</h1>
          <p className="section-text">Midnight Signal is not just data on a page. The beacon is part of the product language: noise becoming structure, structure becoming meaning.</p>
          <p className="section-text">This pass restores the sense of motion and life that the UI needs to feel like Midnight Signal again.</p>
        </div>
        <div className="panel panel-glow" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:420}}>
          <Beacon size={340} labels />
        </div>
      </div>
    </div>
  );
}
