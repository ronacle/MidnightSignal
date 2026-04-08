export async function POST() {
  return Response.json({
    ok: true,
    url: '/api/stripe/checkout'
  });
}
