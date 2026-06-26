import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Editorial serif for large display moments.
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

// Refined grotesque for the interface.
const grotesque = Inter({
  subsets: ["latin"],
  variable: "--font-grotesque",
  display: "swap",
});

// Monospace seam for technical surfaces and numerals.
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Eliot OS",
  description: "The outward facing layer of a private operating system.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${grotesque.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
