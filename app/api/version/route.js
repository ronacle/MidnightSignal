export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "11.83",
    build: "real-in-app-alert-center-integration",
  });
}
