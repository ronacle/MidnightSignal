import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Midnight Signal",
  description: "Educational market posture ritual"
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
