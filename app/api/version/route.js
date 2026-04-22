export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "11.92",
    build: "personal-signal-memory",
  });
}
