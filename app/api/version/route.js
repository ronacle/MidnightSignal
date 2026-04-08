export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "11.46",
    build: "stripe-webhook-sync-subscription-status-refresh",
  });
}
