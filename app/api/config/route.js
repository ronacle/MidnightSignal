export async function GET() {
  const status = {
    stripeReady: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID),
    supabaseReady: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    siteUrlReady: Boolean(process.env.NEXT_PUBLIC_SITE_URL)
  };

  return Response.json(status, { status: 200 });
}
