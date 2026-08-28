export type MetaCommerceContentName = "resume_builder" | "ebook";
export type MetaCommerceEventName = "InitiateCheckout" | "Purchase";

export type CheckoutSessionResult = {
  checkoutUrl?: string;
  checkoutSessionId?: string;
  message?: string;
};

export type VerifiedPurchase = {
  verified?: boolean;
  transactionId?: string;
  contentName?: MetaCommerceContentName;
  value?: number;
  currency?: string;
};

type MetaCommerceParameters = {
  content_name: MetaCommerceContentName;
  value: 9.99;
  currency: "USD";
};

type MetaCommerceWindow = Window & {
  fbq?: (
    command: "track",
    eventName: MetaCommerceEventName,
    parameters: MetaCommerceParameters,
    options: { eventID: string },
  ) => void;
};

const VALUE = 9.99 as const;
const CURRENCY = "USD" as const;
const memoryDedup = new Set<string>();

function dedupKey(eventName: MetaCommerceEventName, contentName: MetaCommerceContentName, transactionId: string) {
  return `tradehustl3:meta:${eventName}:${contentName}:${transactionId}`;
}

/**
 * Emits a commerce event once per Stripe Checkout Session. localStorage keeps
 * confirmation-page reloads quiet, while Meta's deterministic eventID also
 * gives the receiving platform the same stable deduplication key.
 */
export function trackMetaCommerceEvent(
  eventName: MetaCommerceEventName,
  contentName: MetaCommerceContentName,
  transactionId: string,
): boolean {
  const normalizedTransactionId = transactionId.trim();
  if (!normalizedTransactionId) return false;

  const key = dedupKey(eventName, contentName, normalizedTransactionId);
  let storage: Storage | undefined;
  try {
    storage = window.localStorage;
    if (storage.getItem(key)) return false;
  } catch {
    // Meta's eventID remains a cross-reload fallback when storage is blocked.
  }
  if (memoryDedup.has(key)) return false;

  const fbq = (window as MetaCommerceWindow).fbq;
  if (typeof fbq !== "function") return false;

  memoryDedup.add(key);
  try {
    storage?.setItem(key, "1");
    fbq(
      "track",
      eventName,
      { content_name: contentName, value: VALUE, currency: CURRENCY },
      { eventID: `${eventName}:${contentName}:${normalizedTransactionId}` },
    );
    return true;
  } catch {
    memoryDedup.delete(key);
    try {
      storage?.removeItem(key);
    } catch {
      // Analytics failures must never interrupt checkout or fulfillment.
    }
    return false;
  }
}

/** Creates a Stripe Checkout Session and tracks only the confirmed response. */
export async function createTrackedCheckout(
  endpoint: string,
  contentName: MetaCommerceContentName,
  fetchImpl: typeof fetch = fetch,
): Promise<Required<Pick<CheckoutSessionResult, "checkoutUrl" | "checkoutSessionId">>> {
  const response = await fetchImpl(endpoint, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const result = await response.json() as CheckoutSessionResult;
  if (!response.ok || !result.checkoutUrl || !result.checkoutSessionId) {
    throw new Error(result.message || "Secure checkout is temporarily unavailable.");
  }

  trackMetaCommerceEvent("InitiateCheckout", contentName, result.checkoutSessionId);
  return { checkoutUrl: result.checkoutUrl, checkoutSessionId: result.checkoutSessionId };
}

/** Tracks Purchase only from the exact server-verified product and price. */
export function trackVerifiedMetaPurchase(
  purchase: VerifiedPurchase,
  expectedContentName: MetaCommerceContentName,
): boolean {
  if (
    purchase.verified !== true
    || purchase.contentName !== expectedContentName
    || purchase.value !== VALUE
    || purchase.currency !== CURRENCY
    || typeof purchase.transactionId !== "string"
  ) return false;

  return trackMetaCommerceEvent("Purchase", expectedContentName, purchase.transactionId);
}
