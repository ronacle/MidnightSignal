export async function POST() {
  return Response.json(
    {
      ok: true,
      message: "Stripe webhook endpoint is present. Add verification + DB writes when you connect your live Stripe account."
    },
    { status: 200 }
  );
}
