import type { Metadata } from "next";
import { Anton, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from "./google-analytics";

const display = Anton({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const body = Space_Grotesk({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "TRADE HUSTL3 | Built by Hustle, Backed by Trades",
  description: "Tools, resources, and opportunity for the skilled trades. Enter, earn, elevate.",
  openGraph: {
    title: "TRADE HUSTL3",
    description: "Built by Hustle, Backed by Trades. Enter, earn, elevate.",
    type: "website",
    images: [{ url: "/trade-hustl3-logo.png", width: 1536, height: 1536, alt: "TRADE HUSTL3 logo" }],
  },
  twitter: { card: "summary_large_image", title: "TRADE HUSTL3", description: "Built by Hustle, Backed by Trades.", images: ["/trade-hustl3-logo.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>{children}<GoogleAnalytics /></body>
    </html>
  );
}
