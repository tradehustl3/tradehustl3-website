"use client";

import { useEffect } from "react";
import { readCampaignAttribution } from "../campaign-attribution";

type FunnelParams = Record<string, string | number | boolean | Array<Record<string, unknown>> | undefined>;
type AnalyticsWindow = Window & {
  gtag?: (command: "event", eventName: string, parameters?: FunnelParams) => void;
};

const ITEM = {
  item_id: "trade_hustl3_resume_builder",
  item_name: "TRADE HUSTL3 Resume Builder",
  price: 9.99,
  quantity: 1,
};

export function trackResumeFunnelEvent(eventName: string, parameters: FunnelParams = {}): boolean {
  try {
    const analyticsWindow = window as AnalyticsWindow;
    if (typeof analyticsWindow.gtag !== "function") return false;
    analyticsWindow.gtag("event", eventName, {
      product: "resume_builder",
      ...readCampaignAttribution(),
      ...parameters,
    });
    return true;
  } catch {
    return false;
  }
}

export function trackResumeCheckout(): boolean {
  return trackResumeFunnelEvent("begin_checkout", {
    currency: "USD",
    value: 9.99,
    items: [ITEM],
  });
}

export function trackResumePurchase(transactionId: string): boolean {
  if (!transactionId) return false;
  try {
    const key = `tradehustl3_ga4_purchase:${transactionId}`;
    if (window.localStorage.getItem(key) === "1") return false;
    const tracked = trackResumeFunnelEvent("purchase", {
      transaction_id: transactionId,
      currency: "USD",
      value: 9.99,
      items: [ITEM],
    });
    if (tracked) window.localStorage.setItem(key, "1");
    return tracked;
  } catch {
    return false;
  }
}

export function ResumeBuilderStartAnalytics() {
  useEffect(() => {
    const key = "tradehustl3_ga4_resume_builder_start";
    try {
      if (window.sessionStorage.getItem(key) === "1") return;
      if (trackResumeFunnelEvent("resume_builder_start")) window.sessionStorage.setItem(key, "1");
    } catch {
      trackResumeFunnelEvent("resume_builder_start");
    }
  }, []);
  return null;
}

export function ResumeIntakeAnalytics() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await originalFetch(input, init);
      try {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
        const body = typeof init?.body === "string" ? init.body : "";
        if (response.ok && (method === "POST" || method === "PUT") && /\/api\/resume-builder\/resumes(?:\/[^/]+)?$/.test(url) && body.includes('"lastStep":6')) {
          const payload = await response.clone().json().catch(() => ({})) as { resumeId?: string };
          const id = payload.resumeId || new URLSearchParams(window.location.search).get("resume_id") || "unknown";
          const key = `tradehustl3_ga4_intake_complete:${id}`;
          if (window.sessionStorage.getItem(key) !== "1") {
            trackResumeFunnelEvent("resume_intake_complete", { resume_id: id });
            window.sessionStorage.setItem(key, "1");
          }
        }
      } catch {}
      return response;
    };
    return () => { window.fetch = originalFetch; };
  }, []);
  return null;
}

export function ResumeReviewAnalytics() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await originalFetch(input, init);
      try {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
        const resumeId = new URLSearchParams(window.location.search).get("resume_id") || "unknown";
        if (response.ok && method === "POST" && /\/generate$/.test(url)) {
          const key = `tradehustl3_ga4_preview:${resumeId}`;
          if (window.sessionStorage.getItem(key) !== "1") {
            trackResumeFunnelEvent("resume_preview_generated", { resume_id: resumeId });
            window.sessionStorage.setItem(key, "1");
          }
        }
        if (response.ok && method === "POST" && /\/checkout$/.test(url)) {
          trackResumeCheckout();
        }
      } catch {}
      return response;
    };
    return () => { window.fetch = originalFetch; };
  }, []);
  return null;
}
