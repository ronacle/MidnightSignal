import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Midnight Signal v17',
  description: 'Educational market-signal dashboard with strategy guidance, learning, Midnight Network basket intelligence, personalization, and performance tracking.',
  applicationName: 'Midnight Signal',
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
