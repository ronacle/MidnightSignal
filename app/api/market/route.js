import { fetchMarketData } from '@/lib/market';

export async function GET() {
  const payload = await fetchMarketData();
  return Response.json(payload, {
    status: 200,
    headers: {
      'Cache-Control': 's-maxage=300, stale-while-revalidate=600'
    }
  });
}
