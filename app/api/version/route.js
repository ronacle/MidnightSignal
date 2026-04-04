export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "8.5.0",
    build: "since-last-visit-b",
  });
}
