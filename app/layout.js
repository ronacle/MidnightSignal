export const metadata = {
  title: "Midnight Signal v10",
  description: "Backend-ready Midnight Signal build"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        background: "radial-gradient(1200px 800px at 50% -10%, #0b1220 0%, #020617 45%, #000 100%)",
        color: "#e5e7eb",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
      }}>
        {children}
      </body>
    </html>
  );
}
