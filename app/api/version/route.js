import { APP_VERSION } from '@/lib/version';

export async function GET() {
  return Response.json({ ok: true, version: APP_VERSION });
}
