import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    version: '11.64',
    feature: 'auth-account-polish',
    includes: [
      'magic-link-account-center',
      'cross-device-settings-sync',
      'restore-last-asset-and-panel-state',
      'verified-stripe-success-flow'
    ]
  });
}
