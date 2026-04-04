export const metadata = {
  title: 'Midnight Signal',
  description: 'Transforming Market Noise into Market Wisdom'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#07111f', color: '#e5eefc', fontFamily: 'Inter, Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
