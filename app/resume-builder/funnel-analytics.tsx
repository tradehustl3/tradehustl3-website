"use client";

import { useEffect } from "react";
import { readCampaignAttribution } from "../campaign-attribution";
import { optionalTrackingAllowed } from "../marketing-pixels";

/*
 * Resume Builder funnel milestones are reported ONLY to the first-party
 * endpoint. The Worker stores them for Agent #1 and, when the visitor has not
 * opted out (and sends no Global Privacy Control signal), forwards them to
 * GA4 through the Measurement Protocol (worker/ga4-measurement-protocol.ts).
 *
 * Browser gtag calls are deliberately not used here: gtag.js is never loaded
 * on the private Resume Builder pages and races hydration on the homepage,
 * so those calls were silently dropped. Sending from both places would also
 * double-count. GA4 `purchase` is sent only by the verified Stripe webhook.
 */

type FunnelParams = Record<string, string | number | boolean | undefined>;

const ANONYMOUS_ID_KEY = "tradehustl3_funnel_anonymous_id";

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
): boolean {
  try {
    const attribution = readCampaignAttribution();

    const anonymousId = getOrCreateAnalyticsId(
      window.localStorage,
      ANONYMOUS_ID_KEY,
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
      return true;
    }

    const metadata = {
      ...attribution,
      // The only non-campaign field forwarded; the Worker allowlists its values.
      ...(typeof parameters.auth_method === "string" ? { auth_method: parameters.auth_method } : {}),
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
        analyticsConsent: optionalTrackingAllowed(),
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
    return true;
  } catch {
    // First-party telemetry must never interfere with the Resume Builder.
    return false;
  }
}

/** Returns true when the event was dispatched (or was already sent this session). */
export function trackResumeFunnelEvent(eventName: string, parameters: FunnelParams = {}): boolean {
  return sendFirstPartyFunnelEvent(eventName, parameters);
}

/**
 * Carries the resume ID so a paid resume_orders row can be joined back to the
 * campaign stored on this event. It also dedupes per resume instead of once per
 * browser session.
 */
export function trackResumeCheckout(resumeId?: string): boolean {
  return trackResumeFunnelEvent("begin_checkout", resumeId ? { resume_id: resumeId } : {});
}

/**
 * Sent with the checkout request so the verified Stripe webhook can attribute
 * the GA4 purchase. The Worker ignores it unless consent is true.
 */
export function analyticsCheckoutContext(): { analyticsConsent: boolean; anonymousId?: string } {
  try {
    const analyticsConsent = optionalTrackingAllowed();
    if (!analyticsConsent) return { analyticsConsent };
    return { analyticsConsent, anonymousId: getOrCreateAnalyticsId(window.localStorage, ANONYMOUS_ID_KEY) };
  } catch {
    return { analyticsConsent: false };
  }
}

/**
 * `resume_builder_start` = the visitor reached the Resume Builder entry.
 *
 * - `trigger="mount"`: the page itself is a builder landing (campaign or
 *   trade-landing visit with `?trade=`), so arriving counts.
 * - `trigger="visible"`: the page is the hub homepage, where many visitors only
 *   read free resources. The start fires once the account-start section
 *   (`#resume-start`) is at least 40% on screen. Changed Oct 21 2026 — before
 *   that, every homepage view counted (see docs/analytics-changes.md).
 */
export function ResumeBuilderStartAnalytics({ trigger = "mount", targetId = "resume-start" }: { trigger?: "mount" | "visible"; targetId?: string } = {}) {
  useEffect(() => {
    const key = "tradehustl3_ga4_resume_builder_start";
    const fire = () => {
      try {
        if (window.sessionStorage.getItem(key) === "1") return;
        if (trackResumeFunnelEvent("resume_builder_start")) window.sessionStorage.setItem(key, "1");
      } catch {
        trackResumeFunnelEvent("resume_builder_start");
      }
    };

    if (trigger === "mount") {
      fire();
      return;
    }

    const target = document.getElementById(targetId);
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          fire();
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [trigger, targetId]);
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
          trackResumeCheckout(resumeId === "unknown" ? undefined : resumeId);
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
