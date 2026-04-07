export async function POST() {
  return Response.json(
    { ok: false, message: 'Checkout disabled' },
    { status: 503 }
  );
}
