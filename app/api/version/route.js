export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "8.9.0",
    build: "asset-inspector-panel",
  });
}
