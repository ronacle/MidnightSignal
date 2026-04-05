export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "10.1",
    build: "ritual-experience",
  });
}
