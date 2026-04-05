export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "10.0",
    build: "ritual-experience",
  });
}
