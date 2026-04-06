export async function POST() {
  return Response.json(
    {
      ok: false,
      feature: 'checkout-disabled',
      message: 'Checkout is disabled in this bundle until Stripe is intentionally re-enabled.'
    },
    { status: 503 }
  );
}
