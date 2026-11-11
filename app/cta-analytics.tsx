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
export function CtaAnalytics({ stickyLayout = "default" }: { stickyLayout?: "default" | "hub" | "campaign" } = {}) {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const el = target?.closest<HTMLElement>("[data-analytics-event], [data-cta]");
      if (!el) return;

      if (el.getAttribute("href") === "#book-preview") {
        requestAnimationFrame(() => document.querySelector<HTMLInputElement>("#book-preview input[type=email]")?.focus({ preventScroll: true }));
      }
      const taggedEvent = el.dataset.analyticsEvent;
      const eventName = taggedEvent === "select_content" || taggedEvent === "resource_open" ? taggedEvent : "cta_click";
      const destination = el.dataset.destination || el.getAttribute("href") || "unknown";
      const location = el.dataset.location || el.dataset.ctaLocation || "unknown";
      const item = el.dataset.item || el.dataset.cta;
      const offerPlacement = location.startsWith("homepage_") || (stickyLayout === "hub" && ["sticky_header", "mobile_sticky"].includes(location));
      const params = {
        location,
        destination,
        item,
        ...(offerPlacement || taggedEvent === "resource_open"
          ? { offer_id: location === "homepage_book_formats" ? "the_book" : item, placement: location }
          : readCampaignAttribution()),
      };
      trackNavigationEvent(eventName, params);
    }

    document.addEventListener("click", onClick, { capture: true });

    // Primary offer impressions require half of the control to be visible for a second.
    // The hidden book form is mounted from the start and observed when revealed.
    const viewTimers = new Map<Element, ReturnType<typeof setTimeout>>();
    const viewed = new Set<string>();
    const viewObserver = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const timer = viewTimers.get(entry.target);
        if (timer) clearTimeout(timer);
        viewTimers.delete(entry.target);
        if (!entry.isIntersecting || entry.intersectionRatio < 0.5) continue;
        const element = entry.target as HTMLElement;
        const item = element.dataset.item || "unknown";
        const location = element.dataset.location || element.dataset.ctaLocation || "unknown";
        const key = `${item}:${location}`;
        if (viewed.has(key)) continue;
        viewTimers.set(element, setTimeout(() => {
          viewTimers.delete(element);
          if (viewed.has(key) || !element.isConnected || document.visibilityState !== "visible") return;
          const sent = trackNavigationEvent("cta_view", {
            item, location, offer_id: item, placement: location,
            destination: element.dataset.destination || element.getAttribute("href") || "unknown",
          });
          if (sent) viewed.add(key);
        }, 1000));
      }
    }, { threshold: [0, 0.5] });
    document.querySelectorAll('[data-primary-cta="true"]').forEach(element => viewObserver?.observe(element));
    const refreshViewTimers = () => {
      viewTimers.forEach(clearTimeout);
      viewTimers.clear();
      if (document.visibilityState === "visible") {
        document.querySelectorAll('[data-primary-cta="true"]').forEach(element => {
          viewObserver?.unobserve(element);
          viewObserver?.observe(element);
        });
      }
    };
    document.addEventListener("visibilitychange", refreshViewTimers);
    const cleanupViews = () => {
      document.removeEventListener("visibilitychange", refreshViewTimers);
      viewObserver?.disconnect();
      viewTimers.forEach(clearTimeout);
    };

    const stickyCta = document.querySelector<HTMLElement>('[data-location="mobile_sticky"]');
    const hero = document.getElementById("top");
    const finalCta = document.querySelector<HTMLElement>('[aria-labelledby="final-cta-title"]');
    const stickyBoundary = stickyLayout === "hub" ? document.getElementById("book-preview") : hero;
    const stickyExclusions = stickyLayout === "hub"
      ? document.querySelectorAll<HTMLElement>("#free-guides form, #opportunity, #resume-start, #join-the-movement")
      : [];
    const visibleExclusions = new Set<Element>();
    const mobileQuery = window.matchMedia("(max-width: 720px)");

    let heroPassed = false;
    let finalCtaVisible = false;

    const syncStickyCta = () => {
      if (!stickyCta) return;
      const editing = document.activeElement?.matches("input, textarea, select, [contenteditable=true]");
      const shouldShow = mobileQuery.matches && heroPassed && !finalCtaVisible && visibleExclusions.size === 0 && !editing;
      stickyCta.style.display = shouldShow ? "flex" : "none";
      stickyCta.setAttribute("aria-hidden", shouldShow ? "false" : "true");
    };

    syncStickyCta();
    if (!stickyCta || typeof IntersectionObserver === "undefined") {
      return () => {
        cleanupViews();
        document.removeEventListener("click", onClick, { capture: true });
      };
    }

    const heroObserver = stickyBoundary
      ? new IntersectionObserver(
          ([entry]) => {
            heroPassed = !entry.isIntersecting && entry.boundingClientRect.bottom <= 62;
            syncStickyCta();
          },
          { threshold: 0, rootMargin: "-62px 0px 0px 0px" },
        )
      : null;

    if (stickyBoundary && heroObserver) heroObserver.observe(stickyBoundary);

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

    const exclusionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visibleExclusions.add(entry.target);
        else visibleExclusions.delete(entry.target);
      }
      syncStickyCta();
    });
    for (const element of stickyExclusions) exclusionObserver.observe(element);

    const onFocusChange = () => queueMicrotask(syncStickyCta);
    mobileQuery.addEventListener("change", syncStickyCta);
    document.addEventListener("focusin", onFocusChange);
    document.addEventListener("focusout", onFocusChange);

    return () => {
      cleanupViews();
      document.removeEventListener("click", onClick, { capture: true });
      heroObserver?.disconnect();
      finalCtaObserver?.disconnect();
      exclusionObserver.disconnect();
      mobileQuery.removeEventListener("change", syncStickyCta);
      document.removeEventListener("focusin", onFocusChange);
      document.removeEventListener("focusout", onFocusChange);
    };
  }, [stickyLayout]);

  return null;
}
