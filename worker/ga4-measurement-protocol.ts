/**
 * Server-side GA4 delivery for Resume Builder funnel milestones.
 *
 * Why this exists: gtag.js is intentionally never loaded on the private
 * Resume Builder pages (intake, review, confirm, payment-confirmed), and the
 * homepage start event races the afterInteractive gtag bootstrap. Browser
 * `gtag("event", ...)` calls on those pages were therefore silently dropped,
 * so GA4 never saw the funnel even though first-party telemetry did.
 *
 * Funnel events are now forwarded from the Worker with the GA4 Measurement
 * Protocol. No third-party script runs on private pages, the visitor's
 * existing `_ga` / `_ga_<stream>` first-party cookies stitch the event to the
 * same GA user and session, and delivery is not affected by ad blockers.
 *
 * Privacy rules (fail closed):
 * - Nothing is sent without the API secret configured.
 * - Nothing is sent unless the browser reported optional-tracking consent
 *   AND the request does not carry a Global Privacy Control signal.
 * - Only allowlisted event names and parameters leave the Worker. No email,
 *   name, resume ID, resume content, or free-form client values are sent.
 */

export type Ga4Context = { waitUntil(promise: Promise<unknown>): void };

export type Ga4Config = {
  GA4_MEASUREMENT_ID?: string;
  /** Measurement Protocol API secret (GA Admin → Data streams → Measurement Protocol). Unset disables delivery. */
  GA4_MEASUREMENT_PROTOCOL_API_SECRET?: string;
};

/** Must match the browser tag in app/google-analytics.tsx. */
export const DEFAULT_GA4_MEASUREMENT_ID = "G-PHLN0C7BWF";

const MP_ENDPOINT = "https://www.google-analytics.com/mp/collect";
const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,20}$/;
const CLIENT_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;
const SESSION_ID_PATTERN = /^\d{6,20}$/;

export const RESUME_GA4_ITEM = {
  item_id: "trade_hustl3_resume_builder",
  item_name: "TRADE HUSTL3 Resume Builder",
  price: 9.99,
  quantity: 1,
} as const;

/** Funnel milestones GA4 may receive. `purchase` is only ever sent from the verified Stripe webhook. */
export const GA4_FUNNEL_EVENTS: ReadonlySet<string> = new Set([
  "resume_builder_start",
  "sign_up",
  "resume_intake_started",
  "resume_intake_complete",
  "resume_preview_generated",
  "begin_checkout",
]);

const CAMPAIGN_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export type Ga4Identity = { clientId: string; sessionId: string | null };

type Ga4ParamValue = string | number | ReadonlyArray<Record<string, string | number>>;
type Ga4Event = { name: string; params: Record<string, Ga4ParamValue> };

function setting(config: Ga4Config | undefined, key: keyof Ga4Config): string {
  const fromEnv = config?.[key];
  const value = typeof fromEnv === "string" && fromEnv.trim()
    ? fromEnv
    : typeof process !== "undefined" ? process.env?.[key] : undefined;
  return typeof value === "string" ? value.trim() : "";
}

export function ga4MeasurementId(config?: Ga4Config): string {
  const configured = setting(config, "GA4_MEASUREMENT_ID");
  return MEASUREMENT_ID_PATTERN.test(configured) ? configured : DEFAULT_GA4_MEASUREMENT_ID;
}

function readCookie(request: Request, name: string): string {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      return "";
    }
  }
  return "";
}

/** `_ga=GA1.1.1234567890.1700000000` → `1234567890.1700000000`. */
export function parseGaClientId(cookie: string): string | null {
  const parts = cookie.split(".");
  if (parts.length < 4 || !/^GA\d$/.test(parts[0])) return null;
  const clientId = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  return /^\d+\.\d+$/.test(clientId) ? clientId : null;
}

/**
 * Stream session cookie, both formats:
 * `GS1.1.1700000000.3.1.1700000500.0.0.0` and `GS2.1.s1700000000$o3$g1$t1700000500$j0$l0$h0`.
 */
export function parseGaSessionId(cookie: string): string | null {
  if (cookie.startsWith("GS1.")) {
    const sessionId = cookie.split(".")[2] ?? "";
    return SESSION_ID_PATTERN.test(sessionId) ? sessionId : null;
  }
  if (cookie.startsWith("GS2.")) {
    const body = cookie.split(".").slice(2).join(".");
    const token = body.split("$").find((part) => part.startsWith("s")) ?? "";
    const sessionId = token.slice(1);
    return SESSION_ID_PATTERN.test(sessionId) ? sessionId : null;
  }
  return null;
}

/**
 * Prefer the visitor's real GA identity so server events join their existing
 * GA session; fall back to the first-party anonymous ID (already random, no PII).
 */
export function ga4IdentityFromRequest(request: Request, fallbackClientId: unknown, config?: Ga4Config): Ga4Identity | null {
  const streamSuffix = ga4MeasurementId(config).slice(2);
  const cookieClientId = parseGaClientId(readCookie(request, "_ga"));
  const fallback = typeof fallbackClientId === "string" ? fallbackClientId.trim() : "";
  const clientId = cookieClientId || (CLIENT_ID_PATTERN.test(fallback) ? fallback : "");
  if (!clientId) return null;
  return { clientId, sessionId: parseGaSessionId(readCookie(request, `_ga_${streamSuffix}`)) };
}

/** The browser's opt-out lives in localStorage, so the client reports it; GPC is enforced server-side too. */
export function ga4ConsentGranted(request: Request, reportedConsent: unknown): boolean {
  return reportedConsent === true && request.headers.get("Sec-GPC")?.trim() !== "1";
}

export function ga4CampaignParams(metadata: unknown): Record<string, string> {
  const params: Record<string, string> = {};
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return params;
  for (const key of CAMPAIGN_KEYS) {
    const value = (metadata as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) params[key] = value.trim().slice(0, 100);
  }
  return params;
}

export function ga4FunnelEvent(eventName: string, extra: Record<string, string> = {}): Ga4Event | null {
  if (!GA4_FUNNEL_EVENTS.has(eventName)) return null;
  const params: Record<string, Ga4ParamValue> = { product: "resume_builder", ...extra };
  if (eventName === "sign_up") params.method = "magic_link";
  if (eventName === "begin_checkout") {
    params.currency = "USD";
    params.value = RESUME_GA4_ITEM.price;
    params.items = [{ ...RESUME_GA4_ITEM }];
  }
  return { name: eventName, params };
}

export function ga4PurchaseEvent(transactionId: string, amountCents: number): Ga4Event {
  const value = Math.round(amountCents) / 100;
  return {
    name: "purchase",
    params: {
      product: "resume_builder",
      transaction_id: transactionId,
      currency: "USD",
      value,
      items: [{ ...RESUME_GA4_ITEM, price: value }],
    },
  };
}

/**
 * Best-effort delivery: never joined to the customer response and never
 * throws. Logs carry no identifiers, URLs, secrets, or response bodies.
 */
export function sendGa4Event(
  identity: Ga4Identity,
  event: Ga4Event,
  options: { context?: Ga4Context; config?: Ga4Config; fetchImpl?: typeof fetch } = {},
): boolean {
  try {
    const apiSecret = setting(options.config, "GA4_MEASUREMENT_PROTOCOL_API_SECRET");
    if (!apiSecret) {
      // Without the secret every funnel event (and purchase) silently never reaches GA4,
      // which leaves A04/A08 blind. Say so in the Worker logs; the name is not a secret.
      console.warn("GA4 Measurement Protocol disabled: GA4_MEASUREMENT_PROTOCOL_API_SECRET is not set", event.name);
      return false;
    }
    if (!CLIENT_ID_PATTERN.test(identity.clientId)) return false;

    const params: Record<string, Ga4ParamValue> = { ...event.params, engagement_time_msec: 1 };
    if (identity.sessionId && SESSION_ID_PATTERN.test(identity.sessionId)) params.session_id = identity.sessionId;

    const url = `${MP_ENDPOINT}?measurement_id=${encodeURIComponent(ga4MeasurementId(options.config))}&api_secret=${encodeURIComponent(apiSecret)}`;
    const send = options.fetchImpl ?? fetch;
    const delivery = (async () => {
      try {
        const response = await send(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ client_id: identity.clientId, events: [{ name: event.name, params }] }),
          signal: AbortSignal.timeout(5_000),
          redirect: "error",
        });
        if (!response.ok) console.warn("GA4 Measurement Protocol rejected event", event.name, response.status);
        await response.body?.cancel();
      } catch {
        console.warn("GA4 Measurement Protocol delivery failed", event.name);
      }
    })();
    // Workers may cancel outbound work once the response is returned.
    if (options.context) options.context.waitUntil(delivery);
    else void delivery;
    return true;
  } catch {
    console.warn("GA4 Measurement Protocol scheduling failed");
    return false;
  }
}

/** Stripe metadata keys that carry consented GA identity from checkout to the verified webhook. */
export const GA4_STRIPE_METADATA = {
  clientId: "ga_client_id",
  sessionId: "ga_session_id",
} as const;

export function ga4IdentityFromStripeMetadata(metadata: Record<string, unknown> | null | undefined): Ga4Identity | null {
  const clientId = metadata?.[GA4_STRIPE_METADATA.clientId];
  if (typeof clientId !== "string" || !CLIENT_ID_PATTERN.test(clientId)) return null;
  const sessionId = metadata?.[GA4_STRIPE_METADATA.sessionId];
  return {
    clientId,
    sessionId: typeof sessionId === "string" && SESSION_ID_PATTERN.test(sessionId) ? sessionId : null,
  };
}
