export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "11.4",
    build: "conversion-polish",
  });
}
