import { VERSION } from '@/lib/version';

export async function GET() {
  return Response.json({
    ok: true,
    app: 'midnight-signal',
    version: VERSION,
    build: 'landing-conversion-engine',
  });
}
