export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "11.1",
    build: "launch-mode-control-panel",
  });
}
