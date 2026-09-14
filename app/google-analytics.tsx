"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { optionalTrackingAllowed, subscribeToTrackingPreference } from "./marketing-pixels";

const DEFAULT_MEASUREMENT_ID = "G-PHLN0C7BWF";
const PRIVATE_PREFIXES = [
  "/resume-builder/intake",
  "/resume-builder/review",
  "/resume-builder/confirm",
  "/resume-builder/payment-confirmed",
];

function analyticsAllowed(pathname: string): boolean {
  if (PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))) return false;
  return optionalTrackingAllowed();
}

export function GoogleAnalytics() {
  const pathname = usePathname();
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || DEFAULT_MEASUREMENT_ID;
  const allowed = useSyncExternalStore(
    subscribeToTrackingPreference,
    () => analyticsAllowed(pathname),
    () => false,
  );

  if (!allowed) return null;

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
