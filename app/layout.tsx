import type { Metadata } from "next";
import { Anton, Space_Grotesk } from "next/font/google";
import "./globals.css";

const display = Anton({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const body = Space_Grotesk({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "TRAD3 HUSTL3 | Built by Hustle, Backed by Trades",
  description: "Tools, resources, and opportunity for the skilled trades. Enter, earn, elevate.",
  openGraph: {
    title: "TRAD3 HUSTL3",
    description: "Built by Hustle, Backed by Trades. Enter, earn, elevate.",
    type: "website",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "TRAD3 HUSTL3 — Built by Hustle, Backed by Trades" }],
  },
  twitter: { card: "summary_large_image", title: "TRAD3 HUSTL3", description: "Built by Hustle, Backed by Trades.", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>{children}</body>
    </html>
  );
}
