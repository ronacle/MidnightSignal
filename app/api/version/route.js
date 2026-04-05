export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "9.7.0",
    build: "watchlist-priority-alerts",
  });
}
