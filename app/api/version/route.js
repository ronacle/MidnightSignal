export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "9.5.0",
    build: "interpretation-layer",
  });
}
