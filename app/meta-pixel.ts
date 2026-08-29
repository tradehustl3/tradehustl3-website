export type MetaLeadContentName = "top_10_trades" | "book_sample";
export type MetaViewContentName = MetaLeadContentName | "book_sample_reader";

type MetaContentName = MetaLeadContentName | MetaViewContentName;

type MetaPixelWindow = Window & {
  fbq?: (
    command: "track",
    eventName: "Lead" | "ViewContent",
    parameters: { content_name: MetaContentName },
  ) => void;
  __tradeHustl3LastViewContent?: {
    key: string;
    firedAt: number;
  };
};

export type MetaLeadTracker = () => boolean;

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

    const fbq = (window as MetaPixelWindow).fbq;
    if (typeof fbq !== "function") return false;

    try {
      fbq("track", "Lead", { content_name: contentName });
      hasTracked = true;
      return true;
    } catch {
      // Analytics must never turn a confirmed signup into a form error.
      return false;
    }
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
