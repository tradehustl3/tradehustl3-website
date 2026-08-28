export type MetaLeadContentName = "top_10_trades" | "book_sample";

type MetaPixelWindow = Window & {
  fbq?: (
    command: "track",
    eventName: "Lead",
    parameters: { content_name: MetaLeadContentName },
  ) => void;
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
