export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "8.4.2",
    build: "logo-static-no-center-pulse",
  });
}
