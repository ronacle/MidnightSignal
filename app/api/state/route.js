import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    version: '11.10.3',
    feature: 'exact-shell-restore-sync-graft'
  });
}
