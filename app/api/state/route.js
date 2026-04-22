import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    version: '11.47',
    feature: 'billing-account-center-manage-cancel-flow',
    includes: [
      'verified-stripe-success-flow',
      'server-side-session-verification',
      'subscription-status-refresh',
      'stripe-webhook-sync'
    ]
  });
}
