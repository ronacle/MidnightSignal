import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    version: '11.10.0',
    feature: 'hero-flow-trust-layer'
  });
}
