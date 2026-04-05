export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "11.5.1",
    build: "section-anchors-flow-structure",
  });
}
