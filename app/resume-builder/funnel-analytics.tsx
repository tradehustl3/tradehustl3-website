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

function getOrCreateAnalyticsId(
  storage: Storage,
  key: string,
): string {
  const existing = storage.getItem(key);
  if (existing) return existing;

  const value = crypto.randomUUID();
  storage.setItem(key, value);
  return value;
}

function firstPartyDedupeKey(
  eventName: string,
  resumeId?: string,
): string {
  return [
    "tradehustl3_first_party_funnel",
    eventName,
    resumeId || "session",
  ].join(":");
}

function sendFirstPartyFunnelEvent(
  eventName: string,
  parameters: FunnelParams,
): void {
  try {
    const attribution = readCampaignAttribution();

    const anonymousId = getOrCreateAnalyticsId(
      window.localStorage,
      "tradehustl3_funnel_anonymous_id",
    );

    const sessionId = getOrCreateAnalyticsId(
      window.sessionStorage,
      "tradehustl3_funnel_session_id",
    );

    const resumeId =
      typeof parameters.resume_id === "string"
        ? parameters.resume_id
        : undefined;

    const dedupeKey = firstPartyDedupeKey(eventName, resumeId);

    if (window.sessionStorage.getItem(dedupeKey) === "1") {
      return;
    }

    const metadata = {
      ...attribution,
    };

    void fetch("/api/resume-builder/funnel-events", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
      },
      keepalive: true,
      body: JSON.stringify({
        eventName,
        anonymousId,
        sessionId,
        resumeId,
        path: window.location.pathname,
        metadata,
        occurredAt: new Date().toISOString(),
      }),
    })
      .then((response) => {
        if (response.ok) {
          window.sessionStorage.setItem(dedupeKey, "1");
        }
      })
      .catch(() => {
        // First-party telemetry must never interfere with the Resume Builder.
      });
  } catch {
    // First-party telemetry must never interfere with the Resume Builder.
  }
}

export function trackResumeFunnelEvent(eventName: string, parameters: FunnelParams = {}): boolean {
  let gaTracked = false;

  try {
    const analyticsWindow = window as AnalyticsWindow;

    if (typeof analyticsWindow.gtag === "function") {
      analyticsWindow.gtag("event", eventName, {
        product: "resume_builder",
        ...readCampaignAttribution(),
        ...parameters,
      });

      gaTracked = true;
    }
  } catch {
    gaTracked = false;
  }

  if (eventName !== "purchase") {
    sendFirstPartyFunnelEvent(eventName, parameters);
  }

  return gaTracked;
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
    const intakeKey = "tradehustl3_ga4_resume_intake_started";
    try {
      if (window.sessionStorage.getItem(intakeKey) !== "1") {
        if (trackResumeFunnelEvent("resume_intake_started")) window.sessionStorage.setItem(intakeKey, "1");
      }
    } catch {
      trackResumeFunnelEvent("resume_intake_started");
    }

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
      } catch {
        // Analytics observation must never interfere with autosave or intake completion.
      }
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
      } catch {
        // Analytics observation must never interfere with generation or checkout.
      }
      return response;
    };
    return () => { window.fetch = originalFetch; };
  }, []);
  return null;
}
