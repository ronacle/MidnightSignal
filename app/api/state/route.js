import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    version: '11.45',
    feature: 'stripe-truth-pass-real-entitlement-verification',
    includes: [
      'verified-stripe-success-flow',
      'server-side-session-verification',
      'entitlement-state-sync',
      'no-local-pro-unlock-fallback'
    ]
  });
}
