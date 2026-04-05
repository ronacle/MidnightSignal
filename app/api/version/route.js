export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "10.6",
    build: "mobile-ux-polish",
  });
}
