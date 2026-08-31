import type { Metadata } from "next";
import { Anton, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from "./google-analytics";
import { MetaCampaignViewTracker } from "./meta-view-content";
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

  authors: [
    {
      name: "Zachary Ellis",
      url: SITE_URL,
    },
  ],

  creator: "Zachary Ellis",
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
        alt: "TRADE HUSTL3 — Built by Hustle, Backed by Trades",
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
      url: SITE_URL,
      description: SITE_DESCRIPTION,

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
      name: "Zachary Ellis",
      jobTitle: "HVAC and facilities maintenance professional",
      url: SITE_URL,

      worksFor: {
        "@id": `${SITE_URL}/#organization`,
      },
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

    {
      "@type": "Book",
      "@id": `${SITE_URL}/book#book`,
      name: "TRADE HUSTL3: Built by Hustle, Backed by Trades",
      description:
        "A practical career guide for entering, earning, and elevating in the skilled trades.",

      isbn: "9798193043355",
      datePublished: "2026-09-15",
      numberOfPages: 586,
      inLanguage: "en-US",

      url: `${SITE_URL}/book`,
      image: `${SITE_URL}/trade-hustl3-book-cover.jpg`,

      author: {
        "@id": `${SITE_URL}/#zachary-ellis`,
      },

      publisher: {
        "@id": `${SITE_URL}/#organization`,
      },
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
      <body className={`${display.variable} ${body.variable}`}>
        {/* Meta Pixel */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {
                if(f.fbq)return;
                n=f.fbq=function(){
                  n.callMethod
                    ? n.callMethod.apply(n,arguments)
                    : n.queue.push(arguments)
                };

                if(!f._fbq)f._fbq=n;

                n.push=n;
                n.loaded=!0;
                n.version='2.0';
                n.queue=[];

                t=b.createElement(e);
                t.async=!0;
                t.src=v;

                s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s);

              }(
                window,
                document,
                'script',
                'https://connect.facebook.net/en_US/fbevents.js'
              );

              fbq('init', '2260020274539615');
              fbq('track', 'PageView');
            `,
          }}
        />

        {/* Meta Pixel fallback when JavaScript is disabled */}
        <noscript
          dangerouslySetInnerHTML={{
            __html:
              '<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=2260020274539615&ev=PageView&noscript=1" />',
          }}
        />

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

        {/* Google Analytics */}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
