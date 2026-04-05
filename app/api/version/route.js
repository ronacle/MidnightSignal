export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "9.3.0",
    build: "smart-refresh",
  });
}
