export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "11.51",
    build: "context-scoring-polish",
  });
}
