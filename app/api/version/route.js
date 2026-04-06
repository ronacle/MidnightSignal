export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "11.10.5",
    build: "sync-request-storm-hotfix",
  });
}
