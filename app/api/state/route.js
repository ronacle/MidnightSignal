import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    version: '11.44',
    feature: 'saved-user-profiles-plan-gating-cleanup',
    includes: [
      'saved-profiles',
      'cloud-membership-state',
      'checkout-route-cleanup',
      'legacy-local-state-migration'
    ]
  });
}
