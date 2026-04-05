export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "9.1.0",
    build: "multi-timeframe-clean-stack",
  });
}
