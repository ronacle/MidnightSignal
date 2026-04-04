import Dashboard from '@/components/Dashboard';
import { getFallbackMarketData } from '@/lib/market';

export default function Page() {
  const initialData = getFallbackMarketData();
  return <Dashboard initialData={initialData} />;
}
