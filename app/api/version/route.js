export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "10.5",
    build: "live-context-rss-x-integration",
  });
}
