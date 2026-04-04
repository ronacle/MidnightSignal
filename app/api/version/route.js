export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "8.7.0",
    build: "soft-gate-stripe-scaffold",
  });
}
