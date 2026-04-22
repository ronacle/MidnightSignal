export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "11.90",
    build: "signal-intelligence-layer",
  });
}
