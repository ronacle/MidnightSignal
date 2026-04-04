export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        background: "radial-gradient(circle at top, #0f172a, #020617)",
        color: "#e5e7eb",
        fontFamily: "system-ui, sans-serif"
      }}>
        {children}
      </body>
    </html>
  );
}
