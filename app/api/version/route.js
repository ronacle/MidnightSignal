export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "10.2",
    build: "signal-context-news-integration",
  });
}
