import type { Metadata } from "next";
import { Anton, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from "./google-analytics";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "./site";

const display = Anton({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const body = Space_Grotesk({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Zachary Cameron Ellis", url: SITE_URL }],
  creator: "Zachary Cameron Ellis",
  publisher: SITE_NAME,
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "TRADE HUSTL3 — Built by Hustle, Backed by Trades" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/trade-hustl3-logo.png`,
        width: 1536,
        height: 1536,
      },
      founder: { "@id": `${SITE_URL}/#zachary-cameron-ellis` },
      sameAs: ["https://github.com/tradehustl3"],
    },
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#zachary-cameron-ellis`,
      name: "Zachary Cameron Ellis",
      jobTitle: "HVAC and facilities maintenance professional",
      url: SITE_URL,
      worksFor: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-US",
    },
    {
      "@type": "Book",
      "@id": `${SITE_URL}/book#book`,
      name: "TRADE HUSTL3: Built by Hustle, Backed by Trades",
      description: "A practical career guide for entering, earning, and elevating in the skilled trades.",
      isbn: "9798193043355",
      datePublished: "2026-09-15",
      numberOfPages: 586,
      inLanguage: "en-US",
      url: `${SITE_URL}/book`,
      image: `${SITE_URL}/trade-hustl3-book-cover.jpg`,
      author: { "@id": `${SITE_URL}/#zachary-cameron-ellis` },
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
