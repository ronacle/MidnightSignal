export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "11.85",
    build: "real-email-alert-delivery-test-send",
  });
}
