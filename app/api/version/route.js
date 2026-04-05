export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "10.7",
    build: "growth-loop",
  });
}
