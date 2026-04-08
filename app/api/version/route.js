export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "11.47",
    build: "billing-account-center-manage-cancel-flow",
  });
}
