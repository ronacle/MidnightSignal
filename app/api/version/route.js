export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "9.6.0",
    build: "alerts-ritual-layer",
  });
}
