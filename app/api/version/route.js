export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "11.41",
    build: "trigger-tightening-real-alert-engine-pass",
  });
}
