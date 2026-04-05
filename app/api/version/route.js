export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "9.2.0",
    build: "coingecko-on-load",
  });
}
