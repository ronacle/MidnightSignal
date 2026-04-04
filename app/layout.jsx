export const metadata = {
  title: "Midnight Signal",
  description: "Midnight Signal render polish buildfix"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#07111f", color: "#eef2ff", fontFamily: "Inter, Arial, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
