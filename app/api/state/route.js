import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    version: '11.63',
    feature: 'real-email-alerts',
    includes: [
      'verified-stripe-success-flow',
      'server-side-session-verification',
      'subscription-status-refresh',
      'stripe-webhook-sync'
    ]
  });
}
