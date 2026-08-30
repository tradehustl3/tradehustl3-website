"use client";

import Script from "next/script";

const DEFAULT_MEASUREMENT_ID = "G-PHLN0C7BWF";

export function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || DEFAULT_MEASUREMENT_ID;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        window.gtag = window.gtag || gtag;

        (function captureCampaignAttribution() {
          try {
            var search = new URLSearchParams(window.location.search);
            var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
            var attribution = {};
            keys.forEach(function(key) {
              var value = search.get(key);
              if (value) attribution[key] = value.slice(0, 120);
            });
            if (Object.keys(attribution).length) {
              window.localStorage.setItem('tradehustl3_campaign_attribution', JSON.stringify(attribution));
            }
          } catch (_) {}
        })();

        gtag('js', new Date());
        gtag('config', '${measurementId}', { page_path: window.location.pathname + window.location.search });
      `}</Script>
    </>
  );
}
