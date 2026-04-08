export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "11.44",
    build: "saved-user-profiles-plan-gating-cleanup",
  });
}
