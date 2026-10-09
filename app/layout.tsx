import type { Metadata } from "next";
import { Anton, Space_Grotesk } from "next/font/google";
import "./globals.css";
import "./mobile-header-tune.css";
import "./proof-section-enhance.css";
import { GoogleAnalytics } from "./google-analytics";
import { MarketingPixels } from "./marketing-pixels";
import { MetaCampaignViewTracker } from "./meta-view-content";
import { FooterEnhancements } from "./footer-enhancements";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "./site";

const display = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,

  verification: {
    other: {
      "p:domain_verify": "88c69a5f98ee745a68038300b88af777",
    },
  },

  authors: [
    {
      name: "Da Maintenance Mane",
      url: SITE_URL,
    },
  ],

  creator: "Da Maintenance Mane",
  publisher: SITE_NAME,

  alternates: {
    canonical: "/",
  },

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

  icons: {
    icon: "/trade-hustl3-logo.png",
    shortcut: "/trade-hustl3-logo.png",
    apple: "/optimized/trade-hustl3-logo.webp",
    other: [
      {
        rel: "mask-icon",
        url: "/favicon.svg",
        color: "#071A2B",
      },
    ],
  },

  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/optimized/og.webp",
        width: 1200,
        height: 630,
        alt: "TRADE HUSTL3 — Built by Trades. Backed by HUSTL3.",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/optimized/og.webp"],
  },
};

const structuredData = {
  "@context": "https://schema.org",

  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      legalName: "TRADE HUSTL3 LLC",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      email: "support@tradehustl3.com",
      areaServed: "US",

      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/trade-hustl3-logo.png`,
        width: 1536,
        height: 1536,
      },

      founder: {
        "@id": `${SITE_URL}/#zachary-ellis`,
      },

      sameAs: [
        "https://www.facebook.com/profile.php?id=61593457675674",
        "https://www.instagram.com/tradehustl3/",
        "https://www.youtube.com/@tradehustl3",
        "https://x.com/maintenancmt1k",
        "https://www.linkedin.com/in/zachary-ellis-a797193ab",
        "https://www.tiktok.com/@da.maintenance.ma5",
        "https://github.com/tradehustl3",
      ],
    },

    {
      "@type": "Person",
      "@id": `${SITE_URL}/#zachary-ellis`,
      name: "Da Maintenance Mane",
      alternateName: "Zachary Ellis",
      jobTitle: "Founder of TRADE HUSTL3 and HVAC/facilities maintenance professional",
      url: SITE_URL,

      worksFor: {
        "@id": `${SITE_URL}/#organization`,
      },
    },

    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#resume-builder`,
      name: "TRADE HUSTL3 Resume Builder",
      url: `${SITE_URL}/#resume-start`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: SITE_DESCRIPTION,
      offers: {
        "@type": "Offer",
        price: "9.99",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
      provider: { "@id": `${SITE_URL}/#organization` },
    },

    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,

      publisher: {
        "@id": `${SITE_URL}/#organization`,
      },

      inLanguage: "en-US",
    },

    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: SITE_URL,
      name: SITE_TITLE,
      description: SITE_DESCRIPTION,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-US",
    },

  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
      </head>
      <body className={`${display.variable} ${body.variable}`}>

        <MarketingPixels />

        {/* Route-specific Meta ViewContent events for campaign funnels */}
        <MetaCampaignViewTracker />

        {/* SEO Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />

        {children}
        <FooterEnhancements />

        {/* Google Analytics */}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
