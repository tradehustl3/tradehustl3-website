"use client";

import { useEffect } from "react";
import { readCampaignAttribution } from "./campaign-attribution";
import { trackNavigationEvent } from "./meta-pixel";

/**
 * Fires centralized GA4 + Meta navigation events. Homepage cards use
 * select_content; buttons and text links use cta_click.
 *
 * Also keeps the mobile sticky CTA out of the hero so visitors never see
 * the header CTA, hero CTA, and sticky CTA stacked together. The sticky CTA
 * appears only after the hero has been scrolled past and hides again when
 * the final CTA is visible.
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

    const stickyCta = document.querySelector<HTMLElement>('[data-location="mobile_sticky"]');
    const hero = document.getElementById("top");
    const finalCta = document.querySelector<HTMLElement>('[aria-labelledby="final-cta-title"]');
    const mobileQuery = window.matchMedia("(max-width: 720px)");

    let heroPassed = false;
    let finalCtaVisible = false;

    const syncStickyCta = () => {
      if (!stickyCta) return;
      const shouldShow = mobileQuery.matches && heroPassed && !finalCtaVisible;
      stickyCta.style.display = shouldShow ? "flex" : "none";
      stickyCta.setAttribute("aria-hidden", shouldShow ? "false" : "true");
    };

    // Hide immediately on hydration so the hero never shows duplicate CTAs.
    syncStickyCta();

    const heroObserver = hero
      ? new IntersectionObserver(
          ([entry]) => {
            heroPassed = !entry.isIntersecting && entry.boundingClientRect.bottom <= 62;
            syncStickyCta();
          },
          { threshold: 0, rootMargin: "-62px 0px 0px 0px" },
        )
      : null;

    if (hero && heroObserver) heroObserver.observe(hero);

    const finalCtaObserver = finalCta
      ? new IntersectionObserver(
          ([entry]) => {
            finalCtaVisible = entry.isIntersecting;
            syncStickyCta();
          },
          { threshold: 0.08 },
        )
      : null;

    if (finalCta && finalCtaObserver) finalCtaObserver.observe(finalCta);

    const onViewportChange = () => syncStickyCta();
    mobileQuery.addEventListener("change", onViewportChange);

    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      heroObserver?.disconnect();
      finalCtaObserver?.disconnect();
      mobileQuery.removeEventListener("change", onViewportChange);
    };
  }, []);

  return null;
}
