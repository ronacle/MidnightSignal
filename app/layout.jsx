import './globals.css';

export const metadata = {
  title: 'Midnight Signal | Learn the market signal tonight',
  description: 'Midnight Signal helps users interpret live crypto market posture with explainable signals, watchlists, alerts, and plan-aware learning tools.',
  keywords: ['Midnight Signal', 'crypto signals', 'market education', 'watchlist', 'CoinGecko', 'Cardano Midnight'],
  openGraph: {
    title: 'Midnight Signal',
    description: 'Explainable market signals, live board scans, watchlists, alerts, and a cleaner learning-first flow.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Midnight Signal',
    description: 'A learning-first signal board for clearer market awareness.',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
