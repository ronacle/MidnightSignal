export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "11.11.0",
    build: "polish-identity-lock",
  });
}
