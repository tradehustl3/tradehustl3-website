"use client";

import { useEffect } from "react";
import { readCampaignAttribution } from "./campaign-attribution";
import { trackNavigationEvent } from "./meta-pixel";

/**
 * Fires centralized GA4 + Meta navigation events. Homepage cards use
 * select_content; buttons and text links use cta_click.
 */
export function CtaAnalytics() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const el = target?.closest<HTMLElement>("[data-analytics-event], [data-cta]");
      if (!el) return;

      const eventName = el.dataset.analyticsEvent === "select_content" ? "select_content" : "cta_click";
      const destination = el.dataset.destination || el.getAttribute("href") || "unknown";
      const params: { location: string; destination: string; item?: string } & Record<string, string | undefined> = {
        location: el.dataset.location || el.dataset.ctaLocation || "unknown",
        destination,
        item: el.dataset.item || el.dataset.cta,
        ...readCampaignAttribution(),
      };
      trackNavigationEvent(eventName, params);
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
