'use client';

import { useEffect, useMemo, useState } from 'react';
import SignalBeacon from '@/components/SignalBeacon';
import { APP_VERSION } from '@/lib/version';

const glass = {
  background: 'linear-gradient(180deg, rgba(10,16,31,0.90), rgba(6,11,22,0.96))',
  border: '1px solid rgba(139, 168, 255, 0.16)',
  boxShadow: '0 24px 72px rgba(2, 6, 23, 0.56), inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px rgba(96,103,249,0.03)',
  backdropFilter: 'blur(16px)'
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

export default function Dashboard({ initialData }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState(initialData.source);
  const [updatedAt, setUpdatedAt] = useState(initialData.updatedAt);

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

  return (
    <main style={{ minHeight: '100vh', background: 'radial-gradient(circle at 18% 0%, rgba(139,168,255,0.20), transparent 22%), radial-gradient(circle at 82% 0%, rgba(96,103,249,0.14), transparent 18%), linear-gradient(180deg, #060b14 0%, #08111f 42%, #050b15 100%)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '28px 20px 48px' }}>
        <header style={{ ...glass, borderRadius: 30, padding: 30, marginBottom: 24, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 18% 20%, rgba(139,168,255,0.18), transparent 30%), radial-gradient(circle at 82% 10%, rgba(96,103,249,0.16), transparent 28%)' }} />
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
                Transforming market noise into market wisdom with a stable, branded dashboard that keeps rendering even when live data misbehaves.
              </p>
              <div style={{ color: '#8cb3eb', fontSize: 14 }}>
                Data • Information • Knowledge • Understanding • Wisdom
              </div>
            </div>
            <div style={{ ...glass, borderRadius: 22, padding: 18 }}>
              <div style={{ color: '#7dd3fc', fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>Session Settings</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
                {['Beginner', 'Swing', 'USD'].map((label) => (
                  <div key={label} style={{ borderRadius: 14, padding: '12px 10px', textAlign: 'center', background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(9, 14, 26, 0.96))', border: '1px solid rgba(139,168,255,0.14)', color: '#ecf4ff', fontWeight: 700, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
                    {label}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', fontSize: 13, color: '#93a9cc' }}>
                <span>Source: {source === 'coingecko' ? 'Live market feed' : 'Safe fallback data'}</span>
                <span>{loading ? 'Refreshing…' : 'Stable render'}</span>
              </div>
            </div>
          </div>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.18fr) minmax(320px, 0.82fr)', gap: 22, marginBottom: 22 }}>
          <div style={{ ...glass, borderRadius: 28, padding: 24 }}>
            <div style={{ color: '#7dd3fc', fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}>Tonight’s Top Signal</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 34 }}>{topSignal.name} <span style={{ color: '#7dd3fc' }}>({topSignal.symbol})</span></h2>
                <div style={{ marginTop: 8, color: '#dbeafe', fontSize: 18 }}>${formatPrice(topSignal.current_price)}</div>
              </div>
              <div style={{ minWidth: 150, textAlign: 'right' }}>
                <div style={{ color: topSignal.signalScore >= 70 ? '#86efac' : topSignal.signalScore >= 55 ? '#7dd3fc' : topSignal.signalScore >= 45 ? '#fcd34d' : '#fca5a5', fontSize: 34, fontWeight: 800, textShadow: topSignal.signalScore >= 70 ? '0 0 16px rgba(59, 130, 246, 0.35)' : 'none' }}>
                  {topSignal.signalScore}
                </div>
                <div style={{ color: '#9fb8df' }}>{topSignal.posture}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 16 }}>
              <div style={{ borderRadius: 22, padding: 18, background: 'linear-gradient(180deg, rgba(8, 15, 27, 0.88), rgba(7, 12, 22, 0.96))', border: '1px solid rgba(139,168,255,0.12)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)' }}>
                <div style={{ color: '#dbeafe', fontWeight: 700, marginBottom: 8 }}>Tonight’s Brief</div>
                <p style={{ margin: 0, color: '#b6c9ea', lineHeight: 1.6 }}>{topSignal.brief}</p>
                <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                  {['Explainable signal', 'Decision layer ready', 'Daily ritual compatible'].map((chip) => (
                    <span key={chip} style={{ padding: '8px 10px', borderRadius: 999, background: 'rgba(30, 41, 59, 0.85)', color: '#cfe1ff', fontSize: 12, border: '1px solid rgba(96,165,250,0.14)' }}>{chip}</span>
                  ))}
                </div>
              </div>
              <div style={{ borderRadius: 22, padding: 18, background: 'linear-gradient(180deg, rgba(10,20,34,0.98), rgba(7,13,24,0.98))', border: '1px solid rgba(139,168,255,0.12)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)' }}>
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
            <div style={{ color: '#7dd3fc', fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>Midnight Signal Panel</div>
            <div style={{ display: 'grid', gap: 12 }}>
              {topFive.map((asset) => (
                <div key={asset.id} style={{ borderRadius: 20, padding: 16, background: 'linear-gradient(180deg, rgba(10, 16, 30, 0.96), rgba(8, 13, 24, 0.98))', border: '1px solid rgba(139,168,255,0.12)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)', display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <strong style={{ fontSize: 16 }}>{asset.name}</strong>
                      <span style={{ color: '#7dd3fc', fontSize: 13 }}>{asset.symbol}</span>
                    </div>
                    <div style={{ color: '#8fa8cf', fontSize: 13 }}>{asset.brief}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: 22, color: asset.signalScore >= 70 ? '#86efac' : asset.signalScore >= 55 ? '#7dd3fc' : asset.signalScore >= 45 ? '#fcd34d' : '#fca5a5' }}>{asset.signalScore}</div>
                    <div style={{ fontSize: 13, color: '#b7cae6' }}>{formatChange(asset.price_change_percentage_24h)}</div>
                  </div>
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
              <div key={asset.id} style={{ borderRadius: 22, padding: 18, background: 'linear-gradient(180deg, rgba(12,20,35,0.98), rgba(7,13,24,0.99))', border: '1px solid rgba(139,168,255,0.10)', boxShadow: '0 10px 28px rgba(2,6,23,0.26), inset 0 1px 0 rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <strong>{asset.symbol}</strong>
                  <span style={{ color: asset.price_change_percentage_24h >= 0 ? '#86efac' : '#fca5a5', fontSize: 13 }}>{formatChange(asset.price_change_percentage_24h)}</span>
                </div>
                <div style={{ color: '#dbeafe', marginBottom: 6 }}>{asset.name}</div>
                <div style={{ color: '#8eb1e3', fontSize: 14, marginBottom: 10 }}>${formatPrice(asset.current_price)}</div>
                <div style={{ height: 8, borderRadius: 999, background: 'rgba(30, 41, 59, 0.9)', overflow: 'hidden' }}>
                  <div style={{ width: `${asset.signalScore}%`, height: '100%', borderRadius: 999, background: asset.signalScore >= 70 ? 'linear-gradient(90deg, #6067F9, #8BA8FF)' : asset.signalScore >= 55 ? 'linear-gradient(90deg, #0033AD, #6067F9)' : asset.signalScore >= 45 ? 'linear-gradient(90deg, #f59e0b, #fcd34d)' : 'linear-gradient(90deg, #0033AD, #2A6BFF)' }} />
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
  );
}
