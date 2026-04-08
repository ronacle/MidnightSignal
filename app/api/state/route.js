import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    version: '11.46',
    feature: 'stripe-webhook-sync-subscription-status-refresh',
    includes: [
      'verified-stripe-success-flow',
      'server-side-session-verification',
      'subscription-status-refresh',
      'stripe-webhook-sync'
    ]
  });
}
