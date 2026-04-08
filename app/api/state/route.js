import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    version: '11.43',
    feature: 'auth-cloud-alert-state-hardening',
    includes: [
      'supabase-account-sync',
      'cloud-alert-memory',
      'cloud-digest-queue',
      'device-label-persistence'
    ]
  });
}
