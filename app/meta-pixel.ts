export type MetaLeadContentName = "top_10_trades" | "book_sample";
export type MetaViewContentName = MetaLeadContentName | "book_sample_reader";
type AnalyticsEventName = "generate_lead" | "form_start" | "cta_click" | "select_content";

type MetaPixelWindow = Window & {
  fbq?: (
    command: "track" | "trackCustom",
    eventName: "Lead" | "ViewContent" | "form_start" | "cta_click" | "select_content",
    parameters: Record<string, string>,
  ) => void;
  gtag?: (command: "event", eventName: string, parameters?: Record<string, string>) => void;
  __tradeHustl3LastViewContent?: {
    key: string;
    firedAt: number;
  };
};

export type MetaLeadTracker = () => boolean;

function safelyTrack(eventName: AnalyticsEventName, parameters: Record<string, string>, standardMetaEvent?: "Lead" | "ViewContent"): boolean {
  const analyticsWindow = window as MetaPixelWindow;
  let tracked = false;

  try {
    if (typeof analyticsWindow.gtag === "function") {
      analyticsWindow.gtag("event", eventName, parameters);
      tracked = true;
    }
  } catch {
    // A blocked analytics library must never break a user journey.
  }

  try {
    if (typeof analyticsWindow.fbq === "function") {
      if (standardMetaEvent) analyticsWindow.fbq("track", standardMetaEvent, parameters);
      else if (eventName !== "generate_lead") analyticsWindow.fbq("trackCustom", eventName, parameters);
      tracked = true;
    }
  } catch {
    // A blocked analytics library must never break a user journey.
  }

  return tracked;
}

export function trackNavigationEvent(
  eventName: "cta_click" | "select_content",
  parameters: { location: string; destination: string; item?: string } & Record<string, string | undefined>,
): boolean {
  return safelyTrack(eventName, Object.fromEntries(Object.entries(parameters).filter((entry): entry is [string, string] => typeof entry[1] === "string")));
}

export function createFormStartTracker(contentName: MetaLeadContentName): () => boolean {
  let hasTracked = false;
  return () => {
    if (hasTracked) return false;
    const tracked = safelyTrack("form_start", { content_name: contentName, signup_source: contentName });
    if (tracked) hasTracked = true;
    return tracked;
  };
}

/**
 * Creates a tracker that can emit one successful Meta Lead event during a
 * form component's lifetime. Keeping the guard in the analytics helper makes
 * concurrent responses, retries, and rerenders safe without coupling the
 * forms to Meta's global API.
 */
export function createMetaLeadTracker(contentName: MetaLeadContentName): MetaLeadTracker {
  let hasTracked = false;

  return () => {
    if (hasTracked) return false;
    const tracked = safelyTrack("generate_lead", { content_name: contentName, signup_source: contentName }, "Lead");
    if (tracked) hasTracked = true;
    return tracked;
  };
}

/**
 * Emits a Meta ViewContent event for a campaign/resource page. The short
 * dedupe window prevents React development remounts or duplicate effects from
 * double-counting the same view while still allowing a later genuine revisit
 * to generate a new ViewContent event.
 */
export function trackMetaViewContent(contentName: MetaViewContentName): boolean {
  const metaWindow = window as MetaPixelWindow;
  const fbq = metaWindow.fbq;
  if (typeof fbq !== "function") return false;

  const key = `${window.location.pathname}:${contentName}`;
  const now = Date.now();
  const previous = metaWindow.__tradeHustl3LastViewContent;
  if (previous?.key === key && now - previous.firedAt < 1500) return false;

  try {
    fbq("track", "ViewContent", { content_name: contentName });
    metaWindow.__tradeHustl3LastViewContent = { key, firedAt: now };
    return true;
  } catch {
    return false;
  }
}
