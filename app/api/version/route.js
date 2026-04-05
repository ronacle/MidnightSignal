export async function GET() {
  return Response.json({
    ok: true,
    app: "midnight-signal",
    version: "9.4.1",
    build: "card-clarity-polish",
  });
}
