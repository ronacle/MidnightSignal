export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "11.0",
    build: "launch-mode-control-panel",
  });
}
