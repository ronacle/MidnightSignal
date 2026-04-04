export const metadata = {
  title: "Midnight Signal",
  description: "Midnight Signal safe motion build",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#050816", color: "#e5e7eb", fontFamily: "Inter, system-ui, Arial, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
