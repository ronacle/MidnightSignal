'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import SignalBeacon from '@/components/SignalBeacon';
import { APP_VERSION } from '@/lib/version';

const glass = {
  background: 'linear-gradient(180deg, rgba(15,23,42,0.76), rgba(10,17,32,0.88))',
  border: '1px solid rgba(96, 165, 250, 0.16)',
  boxShadow: '0 18px 60px rgba(2, 6, 23, 0.45), inset 0 1px 0 rgba(255,255,255,0.03)',
  backdropFilter: 'blur(14px)'
};

function formatPrice(value) {
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (value >= 1) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatChange(value) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function scoreColor(score) {
  if (score >= 70) return '#86efac';
  if (score >= 55) return '#7dd3fc';
  if (score >= 45) return '#fcd34d';
  return '#fca5a5';
}

export default function Dashboard({ initialData }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState(initialData.source);
  const [updatedAt, setUpdatedAt] = useState(initialData.updatedAt);
  const [pulseTick, setPulseTick] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const previousTopRef = useRef(null);

  useEffect(() => {
    let live = true;
    async function refresh() {
      try {
        setLoading(true);
        const res = await fetch('/api/market', { cache: 'no-store' });
        const json = await res.json();
        if (!live) return;
        setData(json);
        setSource(json.source);
        setUpdatedAt(json.updatedAt);
      } catch {
        // keep initial fallback safely
      } finally {
        if (live) setLoading(false);
      }
    }

    refresh();
    const intervalId = window.setInterval(refresh, 120000);
    return () => {
      live = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const topSignal = useMemo(() => {
    return [...data.assets].sort((a, b) => b.signalScore - a.signalScore)[0];
  }, [data.assets]);

  const topFive = useMemo(() => {
    return [...data.assets].sort((a, b) => b.signalScore - a.signalScore).slice(0, 5);
  }, [data.assets]);

  useEffect(() => {
    if (!topSignal) return;
    const previous = previousTopRef.current;
    if (!previous || previous.id !== topSignal.id || previous.signalScore !== topSignal.signalScore) {
      setPulseTick((value) => value + 1);
      if (soundEnabled && typeof window !== 'undefined') {
        try {
          const context = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = context.createOscillator();
          const gainNode = context.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.value = 880;
          gainNode.gain.value = 0.012;
          oscillator.connect(gainNode);
          gainNode.connect(context.destination);
          oscillator.start();
          oscillator.stop(context.currentTime + 0.08);
        } catch {
          // ignore audio failures safely
        }
      }
      previousTopRef.current = topSignal;
    }
  }, [topSignal, soundEnabled]);

  return (
    <>
      <style jsx global>{`
        @keyframes msGradientDrift {
          0% { transform: translate3d(0, 0, 0) scale(1); opacity: .85; }
          50% { transform: translate3d(0, -1.5%, 0) scale(1.04); opacity: 1; }
          100% { transform: translate3d(0, 0, 0) scale(1); opacity: .85; }
        }
        @keyframes msPulseRing {
          0% { transform: translate(-50%, -50%) scale(.88); opacity: .65; }
          70% { transform: translate(-50%, -50%) scale(1.25); opacity: 0; }
          100% { transform: translate(-50%, -50%) scale(1.28); opacity: 0; }
        }
        @keyframes msShimmer {
          0% { transform: translateX(-160%) skewX(-16deg); opacity: 0; }
          20% { opacity: .16; }
          100% { transform: translateX(260%) skewX(-16deg); opacity: 0; }
        }
        .ms-hover-card {
          transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease, background .22s ease, opacity .22s ease;
        }
        .ms-hover-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 22px 70px rgba(2, 6, 23, .5), 0 0 0 1px rgba(125, 211, 252, .12);
          border-color: rgba(125, 211, 252, .26) !important;
        }
      `}</style>
      <main style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', background: 'linear-gradient(180deg, #08111f 0%, #09111d 45%, #050b15 100%)' }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: -120, background: 'radial-gradient(circle at 15% 18%, rgba(56,189,248,0.20), transparent 26%), radial-gradient(circle at 85% 10%, rgba(99,102,241,0.16), transparent 28%), radial-gradient(circle at 50% 70%, rgba(37,99,235,0.12), transparent 35%)', animation: 'msGradientDrift 12s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', padding: '28px 20px 48px' }}>
          <header style={{ ...glass, borderRadius: 28, padding: 28, marginBottom: 22, overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 20% 20%, rgba(56,189,248,0.14), transparent 30%), radial-gradient(circle at 80% 10%, rgba(37,99,235,0.12), transparent 30%)' }} />
            <div style={{ position: 'relative', display: 'grid', gap: 18, gridTemplateColumns: 'minmax(0, 1.3fr) minmax(320px, 0.7fr)', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 10, flexWrap: 'wrap' }}>
                  <SignalBeacon size={88} />
                  <div>
                    <div style={{ color: '#7dd3fc', fontSize: 12, letterSpacing: '0.24em', textTransform: 'uppercase', marginBottom: 6 }}>Midnight Signal</div>
                    <h1 style={{ margin: 0, fontSize: 'clamp(2rem, 4vw, 3.4rem)', lineHeight: 1.02 }}>What’s the signal tonight?</h1>
                  </div>
                </div>
                <p style={{ margin: '0 0 12px', color: '#bfd4f7', fontSize: 17, maxWidth: 760 }}>
                  Transforming market noise into market wisdom with a stable, branded dashboard that feels alive without sacrificing deploy safety.
                </p>
                <div style={{ color: '#8cb3eb', fontSize: 14 }}>
                  Data • Information • Knowledge • Understanding • Wisdom
                </div>
              </div>
              <div style={{ ...glass, borderRadius: 22, padding: 18 }}>
                <div style={{ color: '#7dd3fc', fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>Session Settings</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
                  {['Beginner', 'Swing', 'USD', soundEnabled ? 'Ping On' : 'Ping Off'].map((label) => (
                    <div
                      key={label}
                      onClick={label.includes('Ping') ? () => setSoundEnabled((value) => !value) : undefined}
                      style={{ cursor: label.includes('Ping') ? 'pointer' : 'default', borderRadius: 14, padding: '12px 10px', textAlign: 'center', background: label === 'Ping On' ? 'rgba(8, 145, 178, 0.18)' : 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(96,165,250,0.15)', color: '#dbeafe', fontWeight: 600 }}>
                      {label}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', fontSize: 13, color: '#93a9cc' }}>
                  <span>Source: {source === 'coingecko' ? 'Live market feed' : 'Safe fallback data'}</span>
                  <span>{loading ? 'Refreshing…' : 'Alive layer active'}</span>
                </div>
              </div>
            </div>
          </header>

          <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(320px, 0.85fr)', gap: 22, marginBottom: 22 }}>
            <div style={{ ...glass, borderRadius: 28, padding: 24, position: 'relative', overflow: 'hidden' }}>
              <div key={pulseTick} aria-hidden="true" style={{ position: 'absolute', left: '78%', top: 86, width: 150, height: 150, borderRadius: '50%', border: '1px solid rgba(125, 211, 252, 0.45)', boxShadow: '0 0 40px rgba(56, 189, 248, 0.16)', animation: 'msPulseRing 1.8s ease-out 1' }} />
              <div style={{ color: '#7dd3fc', fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}>Tonight’s Top Signal</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 34 }}>{topSignal.name} <span style={{ color: '#7dd3fc' }}>({topSignal.symbol})</span></h2>
                  <div style={{ marginTop: 8, color: '#dbeafe', fontSize: 18 }}>${formatPrice(topSignal.current_price)}</div>
                </div>
                <div style={{ minWidth: 150, textAlign: 'right', position: 'relative', padding: '8px 14px', borderRadius: 18, background: topSignal.signalScore >= 70 ? 'radial-gradient(circle at center, rgba(14,165,233,0.18), rgba(8,15,27,0) 70%)' : 'transparent' }}>
                  <div style={{ color: scoreColor(topSignal.signalScore), fontSize: 34, fontWeight: 800, textShadow: topSignal.signalScore >= 70 ? '0 0 20px rgba(59, 130, 246, 0.42)' : 'none' }}>
                    {topSignal.signalScore}
                  </div>
                  <div style={{ color: '#9fb8df' }}>{topSignal.posture}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 16 }}>
                <div className="ms-hover-card" style={{ borderRadius: 22, padding: 18, background: 'rgba(8, 15, 27, 0.78)', border: '1px solid rgba(96,165,250,0.14)', position: 'relative', overflow: 'hidden' }}>
                  {topSignal.signalScore >= 70 ? <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg, transparent 0%, rgba(125, 211, 252, 0.02) 44%, rgba(125, 211, 252, 0.14) 50%, rgba(125, 211, 252, 0.02) 56%, transparent 100%)', animation: 'msShimmer 3.6s linear infinite' }} /> : null}
                  <div style={{ color: '#dbeafe', fontWeight: 700, marginBottom: 8, position: 'relative' }}>Tonight’s Brief</div>
                  <p style={{ margin: 0, color: '#b6c9ea', lineHeight: 1.6, position: 'relative' }}>{topSignal.brief}</p>
                  <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', position: 'relative' }}>
                    {['Explainable signal', 'Decision layer ready', 'Daily ritual compatible'].map((chip) => (
                      <span key={chip} style={{ padding: '8px 10px', borderRadius: 999, background: 'rgba(30, 41, 59, 0.85)', color: '#cfe1ff', fontSize: 12, border: '1px solid rgba(96,165,250,0.14)' }}>{chip}</span>
                    ))}
                  </div>
                </div>
                <div className="ms-hover-card" style={{ borderRadius: 22, padding: 18, background: 'linear-gradient(180deg, rgba(10,20,34,0.95), rgba(7,13,24,0.98))', border: '1px solid rgba(96,165,250,0.12)' }}>
                  <div style={{ color: '#dbeafe', fontWeight: 700, marginBottom: 14 }}>Since your last visit</div>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div>
                      <div style={{ color: '#7dd3fc', fontSize: 12, marginBottom: 4 }}>Signal posture</div>
                      <div style={{ color: '#e5eefc' }}>{topSignal.posture} bias is still leading</div>
                    </div>
                    <div>
                      <div style={{ color: '#7dd3fc', fontSize: 12, marginBottom: 4 }}>24h change</div>
                      <div style={{ color: topSignal.price_change_percentage_24h >= 0 ? '#86efac' : '#fca5a5' }}>{formatChange(topSignal.price_change_percentage_24h)}</div>
                    </div>
                    <div>
                      <div style={{ color: '#7dd3fc', fontSize: 12, marginBottom: 4 }}>Updated</div>
                      <div style={{ color: '#c6d7f3' }}>{new Date(updatedAt).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ ...glass, borderRadius: 28, padding: 24 }}>
              <div style={{ color: '#7dd3fc', fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}>Tonight’s Top 5</div>
              <div style={{ display: 'grid', gap: 12 }}>
                {topFive.map((asset, index) => (
                  <div key={asset.id} className="ms-hover-card" style={{ borderRadius: 20, padding: 16, background: index === 0 ? 'linear-gradient(180deg, rgba(8, 47, 73, 0.45), rgba(10, 17, 32, 0.92))' : 'rgba(7, 13, 24, 0.84)', border: '1px solid rgba(96,165,250,0.12)', opacity: index === 0 ? 1 : 0.9 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div>
                        <strong style={{ fontSize: 18 }}>{index + 1}. {asset.name}</strong>
                        <span style={{ color: '#7dd3fc', fontSize: 13, marginLeft: 8 }}>{asset.symbol}</span>
                      </div>
                      <div style={{ color: scoreColor(asset.signalScore), fontWeight: 800, textShadow: asset.signalScore >= 70 ? '0 0 14px rgba(56, 189, 248, 0.24)' : 'none' }}>{asset.signalScore}</div>
                    </div>
                    <div style={{ color: '#8fa8cf', fontSize: 13, marginBottom: 4 }}>{asset.brief}</div>
                    <div style={{ fontSize: 13, color: '#b7cae6' }}>{formatChange(asset.price_change_percentage_24h)}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section style={{ ...glass, borderRadius: 28, padding: 24, marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
              <div>
                <div style={{ color: '#7dd3fc', fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>Top 20 / Watchlist style block</div>
                <h3 style={{ margin: 0, fontSize: 26 }}>Tracked Assets</h3>
              </div>
              <div style={{ color: '#94a9c9', fontSize: 14 }}>Safe client refresh • No prerender dependency</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              {data.assets.map((asset) => (
                <div key={asset.id} className="ms-hover-card" style={{ borderRadius: 22, padding: 18, background: 'linear-gradient(180deg, rgba(12,20,35,0.95), rgba(7,13,24,0.96))', border: '1px solid rgba(96,165,250,0.12)', position: 'relative', overflow: 'hidden' }}>
                  {asset.signalScore >= 70 ? <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top, rgba(56,189,248,0.12), transparent 55%)' }} /> : null}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 10, position: 'relative' }}>
                    <strong>{asset.symbol}</strong>
                    <span style={{ color: asset.price_change_percentage_24h >= 0 ? '#86efac' : '#fca5a5', fontSize: 13 }}>{formatChange(asset.price_change_percentage_24h)}</span>
                  </div>
                  <div style={{ color: '#dbeafe', marginBottom: 6, position: 'relative' }}>{asset.name}</div>
                  <div style={{ color: '#8eb1e3', fontSize: 14, marginBottom: 10, position: 'relative' }}>${formatPrice(asset.current_price)}</div>
                  <div style={{ height: 8, borderRadius: 999, background: 'rgba(30, 41, 59, 0.9)', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ width: `${asset.signalScore}%`, height: '100%', borderRadius: 999, background: asset.signalScore >= 70 ? 'linear-gradient(90deg, #38bdf8, #86efac)' : asset.signalScore >= 55 ? 'linear-gradient(90deg, #2563eb, #38bdf8)' : asset.signalScore >= 45 ? 'linear-gradient(90deg, #f59e0b, #fcd34d)' : 'linear-gradient(90deg, #ef4444, #fca5a5)' }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <footer style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', color: '#88a2c7', fontSize: 13, flexWrap: 'wrap', padding: '6px 4px' }}>
            <div>Midnight Signal v{APP_VERSION}</div>
            <div>Educational signal layer • Not financial advice</div>
          </footer>
        </div>
      </main>
    </>
  );
}
