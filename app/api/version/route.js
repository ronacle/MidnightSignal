export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "9.7.1",
    build: "watchlist-priority-alerts-buildfix",
  });
}
