export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "11.2.2",
    build: "update-mode-cadence-fix",
  });
}
