import { APP_VERSION, BUILD_LABEL } from '@/lib/version';

export async function GET() {
  return Response.json({
    version: APP_VERSION,
    build: BUILD_LABEL,
    generatedAt: new Date().toISOString()
  });
}
