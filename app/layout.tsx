import type { Metadata } from "next";
import { Anton, Space_Grotesk } from "next/font/google";
import "./globals.css";
import "./mobile-header-tune.css";
import "./proof-section-enhance.css";
import { GoogleAnalytics } from "./google-analytics";
import { MarketingPixels } from "./marketing-pixels";
import { MetaCampaignViewTracker } from "./meta-view-content";
import { FooterEnhancements } from "./footer-enhancements";
import { BRAND_DESCRIPTION, BRAND_LOGO_512, HOME_DESCRIPTION, HOME_TITLE, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "./site";

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

  // Public pages declare their own canonical. Index/follow is the default;
  // keeping both out of the root also prevents contradictory tags on 404s.

  icons: {
    // TH3 monogram drawn for small sizes; the full logo is unreadable at 16px.
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    other: [
      {
        rel: "mask-icon",
        url: "/favicon.svg",
        color: "#02142B",
      },
    ],
  },
  manifest: "/site.webmanifest",

  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/optimized/og-v2.webp",
        width: 1200,
        height: 630,
        alt: "TRADE HUSTL3 Resume Builder",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/optimized/og-v2.webp"],
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
      description: BRAND_DESCRIPTION,
      email: "support@tradehustl3.com",
      areaServed: "US",

      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}${BRAND_LOGO_512}`,
        width: 512,
        height: 512,
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
      description: BRAND_DESCRIPTION,

      publisher: {
        "@id": `${SITE_URL}/#organization`,
      },

      inLanguage: "en-US",
    },

    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: SITE_URL,
      name: HOME_TITLE,
      description: HOME_DESCRIPTION,
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
