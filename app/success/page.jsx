"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export default function SuccessPage() {
  const [status, setStatus] = useState('Verifying your Stripe subscription…');
  const [verified, setVerified] = useState(false);

  const sessionId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get('session_id') || '';
    } catch {
      return '';
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (!sessionId) {
        setStatus('Missing checkout session. Your plan was not upgraded.');
        return;
      }

      try {
        const response = await fetch(`/api/stripe/verify?session_id=${encodeURIComponent(sessionId)}`, { cache: 'no-store' });
        const data = await response.json();
        if (cancelled) return;

        if (data?.ok && data?.verified && data?.entitlement) {
          const entitlement = data.entitlement;
          const stored = {
            entitlement,
            planTier: 'pro',
            updatedAt: new Date().toISOString(),
          };

          try {
            const raw = window.localStorage.getItem('midnight-signal-local-state-v11.64')
              || window.localStorage.getItem('midnight-signal-local-state-v11.48')
              || window.localStorage.getItem('midnight-signal-local-state-v11.47')
              || window.localStorage.getItem('midnight-signal-local-state-v11.45')
              || window.localStorage.getItem('midnight-signal-local-state-v11.44')
              || window.localStorage.getItem('midnight-signal-local-state-v11.43');
            const parsed = raw ? JSON.parse(raw) : {};
            window.localStorage.setItem('midnight-signal-plan', 'pro');
            window.localStorage.setItem('midnight-signal-upgrade-success', new Date().toISOString());
            window.localStorage.setItem('midnight-signal-last-stripe-session', sessionId);
            window.localStorage.setItem('midnight-signal-local-state-v11.64', JSON.stringify({
              ...parsed,
              ...stored,
            }));
          } catch {}

          setVerified(true);
          setStatus('Pro verified — your entitlement is now tied to Stripe.');
          return;
        }

        setStatus(data?.error || 'Stripe checkout completed, but entitlement could not be verified yet.');
      } catch {
        if (!cancelled) {
          setStatus('Verification failed. Your plan stays Basic until Stripe verification succeeds.');
        }
      }
    }

    void verify();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <main style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: "radial-gradient(circle at top, rgba(42,107,255,.14), transparent 28%), linear-gradient(135deg, #0d1530 0%, #181c2f 45%, #0f1330 100%)",
      color: "#f7f7f7",
      padding: 24,
      fontFamily: "Inter, system-ui, Arial, sans-serif"
    }}>
      <div style={{
        maxWidth: 640,
        width: "100%",
        borderRadius: 28,
        padding: 30,
        background: "rgba(24,28,47,.86)",
        border: "1px solid rgba(247,247,247,.1)",
        boxShadow: "0 20px 80px rgba(0,0,0,.35)"
      }}>
        <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 10 }}>Midnight Signal Premium</div>
        <h1 style={{ fontSize: 36, lineHeight: 1.05, margin: "0 0 12px" }}>{verified ? 'You’re verified.' : 'Checking your unlock.'}</h1>
        <p style={{ color: "#cbd5e1", lineHeight: 1.7 }}>
          {status}
        </p>
        <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/" style={{
            display: "inline-flex",
            padding: "12px 16px",
            borderRadius: 14,
            background: "linear-gradient(135deg, #2563eb, #4f46e5)",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 800
          }}>
            Return to Midnight Signal
          </Link>
          {!verified ? (
            <Link href="/api/stripe/checkout" style={{
              display: "inline-flex",
              padding: "12px 16px",
              borderRadius: 14,
              background: "rgba(255,255,255,.06)",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 700,
              border: "1px solid rgba(255,255,255,.12)"
            }}>
              Retry checkout
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
