export const metadata = {
  title: "Midnight Signal",
  description: "No-TypeScript clean rebuild",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#07111f",
          color: "#eef2ff",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
