"use client";

import { useEffect } from "react";
import { readCampaignAttribution } from "./campaign-attribution";

type AnalyticsWindow = Window & {
  gtag?: (command: "event", eventName: string, parameters?: Record<string, string>) => void;
};

/**
 * Fires one GA4 `cta_click` event per click on any element carrying a
 * `data-cta` attribute, so the free book-sample CTA, the Top 10 Trades CTA,
 * and the Resume Builder CTA can be told apart in analytics. Campaign UTM
 * attribution captured on entry is carried forward into later CTA events.
 */
export function CtaAnalytics() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const el = target?.closest<HTMLElement>("[data-cta]");
      if (!el) return;

      const params: Record<string, string> = {
        cta_id: el.dataset.cta || "unknown",
        cta_location: el.dataset.ctaLocation || "homepage",
        ...readCampaignAttribution(),
      };

      const label = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80);
      if (label) params.cta_label = label;

      (window as AnalyticsWindow).gtag?.("event", "cta_click", params);
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
