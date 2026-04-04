export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "9.0.0",
    build: "trust-layer-simple",
  });
}
