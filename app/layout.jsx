import './globals.css';

export const metadata = {
  title: 'Midnight Signal v11.8',
  description: 'Cross-device account sync build for Midnight Signal.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
