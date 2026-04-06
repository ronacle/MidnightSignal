import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    version: '11.10.4',
    feature: 'preferred-ui-modular-panels-stable-sync-nav'
  });
}
