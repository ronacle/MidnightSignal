export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "11.43",
    build: "email-alert-hardening-digest-polish",
  });
}
