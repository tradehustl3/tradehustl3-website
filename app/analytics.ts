export type MetaStandardEvent = "PageView" | "ViewContent" | "Lead" | "InitiateCheckout" | "Purchase";
export type MetaLeadContentName = "top_10_trades" | "book_sample";
export type ProductContentName = "resume_builder" | "ebook";
export type Currency = "USD";

export type AnalyticsParameters = Record<string, string | number | string[] | undefined>;

type BrowserWindow = Window & {
  fbq?: (
    command: "track",
    eventName: MetaStandardEvent,
    parameters?: AnalyticsParameters,
    options?: { eventID: string },
  ) => void;
  gtag?: (command: "event", eventName: string, parameters?: AnalyticsParameters) => void;
};

export type MetaLeadTracker = () => boolean;

export type CheckoutResult = {
  checkoutUrl?: string;
  checkoutSessionId?: string;
  value?: number;
  currency?: string;
  message?: string;
};

export type VerifiedPurchase = {
  verified?: boolean;
  transactionId?: string;
  contentName?: ProductContentName;
  value?: number;
  currency?: string;
};

export const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
] as const;

export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];

const memoryDedup = new Set<string>();
const META_STORAGE_PREFIX = "tradehustl3:meta";
const ATTRIBUTION_STORAGE_PREFIX = "tradehustl3:attribution";
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim();
const GOOGLE_ADS_LABELS = {
  book_sample: process.env.NEXT_PUBLIC_GOOGLE_ADS_BOOK_SAMPLE_LEAD_LABEL?.trim(),
  top_10_trades: process.env.NEXT_PUBLIC_GOOGLE_ADS_TOP_TRADES_LEAD_LABEL?.trim(),
  resume_checkout: process.env.NEXT_PUBLIC_GOOGLE_ADS_RESUME_CHECKOUT_LABEL?.trim(),
  resume_purchase: process.env.NEXT_PUBLIC_GOOGLE_ADS_RESUME_PURCHASE_LABEL?.trim(),
  ebook_checkout: process.env.NEXT_PUBLIC_GOOGLE_ADS_EBOOK_CHECKOUT_LABEL?.trim(),
  ebook_purchase: process.env.NEXT_PUBLIC_GOOGLE_ADS_EBOOK_PURCHASE_LABEL?.trim(),
} as const;

function browserWindow(): BrowserWindow | null {
  return typeof window === "undefined" ? null : window as BrowserWindow;
}

function storageFor(persistence: "session" | "local"): Storage | null {
  const currentWindow = browserWindow();
  if (!currentWindow) return null;
  try {
    return persistence === "local" ? currentWindow.localStorage : currentWindow.sessionStorage;
  } catch {
    return null;
  }
}

function storedDedupKey(eventName: MetaStandardEvent, key: string): string {
  return `${META_STORAGE_PREFIX}:${eventName}:${key}`;
}

function hasTrackedConversion(eventName: MetaStandardEvent, key: string, persistence: "session" | "local"): boolean {
  const storageKey = storedDedupKey(eventName, key);
  if (memoryDedup.has(storageKey)) return true;
  try {
    return storageFor(persistence)?.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

function rememberConversion(eventName: MetaStandardEvent, key: string, persistence: "session" | "local"): void {
  const storageKey = storedDedupKey(eventName, key);
  memoryDedup.add(storageKey);
  try {
    storageFor(persistence)?.setItem(storageKey, "1");
  } catch {
    // Storage is a best-effort cross-refresh duplicate guard.
  }
}

function trackMeta(
  eventName: MetaStandardEvent,
  parameters: AnalyticsParameters = {},
  dedup?: { key: string; persistence: "session" | "local" },
): boolean {
  const currentWindow = browserWindow();
  const fbq = currentWindow?.fbq;
  if (typeof fbq !== "function") return false;

  const key = dedup ? storedDedupKey(eventName, dedup.key) : "";
  const storage = dedup ? storageFor(dedup.persistence) : null;
  if (key) {
    try {
      if (storage?.getItem(key)) return false;
    } catch {
      // Storage is optional; the in-memory guard still protects rerenders.
    }
    if (memoryDedup.has(key)) return false;
  }

  try {
    if (key) {
      memoryDedup.add(key);
      fbq("track", eventName, parameters, { eventID: `${eventName}:${dedup!.key}` });
      try {
        storage?.setItem(key, "1");
      } catch {
        // A blocked storage API must not break tracking or the funnel.
      }
    } else {
      fbq("track", eventName, parameters);
    }
    return true;
  } catch {
    if (key) memoryDedup.delete(key);
    return false;
  }
}

export function trackGoogleEvent(eventName: string, parameters: AnalyticsParameters = {}): boolean {
  const gtag = browserWindow()?.gtag;
  if (typeof gtag !== "function") return false;
  try {
    gtag("event", eventName, parameters);
    return true;
  } catch {
    return false;
  }
}

function trackGoogleAdsConversion(
  conversion: keyof typeof GOOGLE_ADS_LABELS,
  parameters: AnalyticsParameters = {},
): boolean {
  const label = GOOGLE_ADS_LABELS[conversion];
  if (!GOOGLE_ADS_ID || !label) return false;
  return trackGoogleEvent("conversion", { ...parameters, send_to: `${GOOGLE_ADS_ID}/${label}` });
}

export function captureAttribution(search = browserWindow()?.location.search ?? ""): Record<string, string> {
  const values: Record<string, string> = {};
  if (!browserWindow()) return values;
  const params = new URLSearchParams(search);
  const storage = storageFor("session");

  for (const key of ATTRIBUTION_KEYS) {
    const current = params.get(key)?.trim().slice(0, 160) ?? "";
    const storageKey = `${ATTRIBUTION_STORAGE_PREFIX}:${key}`;
    try {
      if (current) storage?.setItem(storageKey, current);
      const preserved = current || storage?.getItem(storageKey) || "";
      if (preserved) values[key] = preserved;
    } catch {
      if (current) values[key] = current;
    }
  }
  return values;
}

export function trackViewContent(
  contentName: MetaLeadContentName | ProductContentName,
  parameters: AnalyticsParameters = {},
  eventKey: string = contentName,
): boolean {
  const eventParameters = { content_name: contentName, ...parameters };
  trackGoogleEvent("view_item", eventParameters);
  return trackMeta("ViewContent", eventParameters, { key: eventKey, persistence: "session" });
}

export function createMetaLeadTracker(contentName: MetaLeadContentName): MetaLeadTracker {
  let hasTracked = false;
  return () => {
    if (hasTracked) return false;
    const eventParameters = { content_name: contentName, content_category: "lead_offer" };
    const storage = storageFor("local");
    const storageKey = storedDedupKey("Lead", contentName);
    try {
      if (storage?.getItem(storageKey)) return false;
    } catch {
      // The component-lifetime guard remains available when storage is blocked.
    }
    const currentWindow = browserWindow();
    let metaTracked = false;
    try {
      if (typeof currentWindow?.fbq === "function") {
        currentWindow.fbq("track", "Lead", eventParameters, { eventID: `Lead:${contentName}` });
        metaTracked = true;
      }
    } catch {
      // A blocked Pixel must never turn a confirmed signup into a form error.
    }
    const googleTracked = trackGoogleEvent("generate_lead", { form_name: contentName });
    const adsTracked = trackGoogleAdsConversion(contentName, {
      value: 1,
      currency: "USD",
    });
    const tracked = metaTracked || googleTracked || adsTracked;
    if (tracked) {
      hasTracked = true;
      try {
        storage?.setItem(storageKey, "1");
      } catch {
        // Best-effort persistence across refreshes.
      }
    }
    return tracked;
  };
}

export function trackCheckoutInitiated(
  contentName: ProductContentName,
  transactionId: string,
  value: number,
  currency: Currency,
  persistence: "session" | "local" = "local",
): boolean {
  const parameters = { content_name: contentName, content_type: "product", value, currency, num_items: 1 };
  const eventKey = `${contentName}:${transactionId}`;
  if (hasTrackedConversion("InitiateCheckout", eventKey, persistence)) return false;
  const metaTracked = trackMeta("InitiateCheckout", parameters, { key: eventKey, persistence });
  const googleTracked = trackGoogleEvent("begin_checkout", parameters);
  const adsTracked = trackGoogleAdsConversion(
    contentName === "resume_builder" ? "resume_checkout" : "ebook_checkout",
    parameters,
  );
  if (metaTracked || googleTracked || adsTracked) rememberConversion("InitiateCheckout", eventKey, persistence);
  return metaTracked || googleTracked || adsTracked;
}

export async function createTrackedCheckout(
  endpoint: string,
  contentName: ProductContentName,
  body: Record<string, unknown> = {},
  fetchImpl: typeof fetch = fetch,
): Promise<Required<Pick<CheckoutResult, "checkoutUrl" | "checkoutSessionId" | "value" | "currency">>> {
  const response = await fetchImpl(endpoint, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json() as CheckoutResult;
  if (
    !response.ok
    || !result.checkoutUrl
    || !result.checkoutSessionId
    || typeof result.value !== "number"
    || result.currency !== "USD"
  ) {
    throw new Error(result.message || "Secure checkout is temporarily unavailable.");
  }

  trackCheckoutInitiated(contentName, result.checkoutSessionId, result.value, result.currency);
  return {
    checkoutUrl: result.checkoutUrl,
    checkoutSessionId: result.checkoutSessionId,
    value: result.value,
    currency: result.currency,
  };
}

export function trackVerifiedPurchase(
  purchase: VerifiedPurchase,
  expectedContentName: ProductContentName,
): boolean {
  if (
    purchase.verified !== true
    || purchase.contentName !== expectedContentName
    || typeof purchase.value !== "number"
    || purchase.value <= 0
    || purchase.currency !== "USD"
    || typeof purchase.transactionId !== "string"
    || !purchase.transactionId.trim()
  ) return false;

  const transactionId = purchase.transactionId.trim();
  const parameters = {
    content_name: expectedContentName,
    content_type: "product",
    value: purchase.value,
    currency: purchase.currency,
    transaction_id: transactionId,
  };
  const eventKey = `${expectedContentName}:${transactionId}`;
  if (hasTrackedConversion("Purchase", eventKey, "local")) return false;
  const metaTracked = trackMeta("Purchase", parameters, {
    key: eventKey,
    persistence: "local",
  });
  const googleTracked = trackGoogleEvent("purchase", parameters);
  const adsTracked = trackGoogleAdsConversion(
    expectedContentName === "resume_builder" ? "resume_purchase" : "ebook_purchase",
    parameters,
  );
  if (metaTracked || googleTracked || adsTracked) rememberConversion("Purchase", eventKey, "local");
  return metaTracked || googleTracked || adsTracked;
}
