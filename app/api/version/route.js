export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "11.6",
    build: "mobile-hero-reset-animated-beacon-return",
  });
}
