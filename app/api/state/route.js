import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    version: '11.10.1',
    feature: 'restore-pre-sync-ui-with-cross-device-sync'
  });
}
