export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "8.6.0",
    build: "why-this-signal-b",
  });
}
