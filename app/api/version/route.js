export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "9.9",
    build: "premium-flow-cleanup",
  });
}
