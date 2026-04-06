import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    version: '11.13.1',
    feature: 'wire-detail-sheet-actions'
  });
}
