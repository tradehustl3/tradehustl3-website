/** Cloudflare Worker entry point for the TRADE HUSTL3 website. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import freeSampleDataUrl from "./assets/trade-hustl3-free-sample.pdf?inline";
import { handleResumeBuilderRoute, ResumeBuilderEnv } from "./resume-builder";

interface Env extends ResumeBuilderEnv {
  ASSETS: Fetcher;
  DB: D1Database;
  BOOKS?: R2Bucket;
  BREVO_API_KEY?: string;
  BREVO_LIST_ID?: string;
  BREVO_SAMPLE_SENDER_EMAIL?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_EBOOK_PAYMENT_LINK_ID?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const allowedInterests = new Set([
  "The TRADE HUSTL3 Book",
  "Resume Builder",
  "HUSTL3 PRO",
  "Jobsite Gear",
  "School / Workforce Partnership",
  "General TRADE HUSTL3 Updates",
]);

const FREE_SAMPLE_PUBLIC_PATH = "/trade-hustl3-free-sample.pdf";
const FREE_SAMPLE_ROUTE = "/api/free-sample";
const SAMPLE_COOKIE = "tradehustl3_sample_access=granted";
const STRIPE_WEBHOOK_ROUTE = "/api/stripe/webhook";
const EBOOK_DOWNLOAD_ROUTE = "/api/ebook-download";
const EBOOK_OBJECT_KEY = "TRADE-HUSTL3-COMPLETE-EBOOK.pdf";
const SITE_URL = "https://tradehustl3.com";
const EBOOK_RELEASE_AT = Date.parse("2026-09-15T04:00:00Z");
const EBOOK_LAUNCH_BATCH_SIZE = 25;
const EBOOK_LAUNCH_LEASE_SECONDS = 10 * 60;
const encoder = new TextEncoder();

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function trackingValue(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 160) : "";
}

function toBase64Url(value: ArrayBuffer): string {
  const bytes = new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function hexToBytes(value: string): Uint8Array | null {
  if (!/^[a-f0-9]+$/i.test(value) || value.length % 2 !== 0) return null;
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (pair) => Number.parseInt(pair, 16));
}

function randomDownloadToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes.buffer);
}

async function verifyStripeSignature(payload: string, header: string, secret: string): Promise<boolean> {
  const fields = header.split(",").map((field) => field.trim().split("=", 2));
  const timestampValue = fields.find(([key]) => key === "t")?.[1] ?? "";
  const timestamp = Number.parseInt(timestampValue, 10);
  const signatures = fields.filter(([key]) => key === "v1").map(([, value]) => value);

  if (!Number.isSafeInteger(timestamp) || Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300 || !signatures.length) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signedPayload = encoder.encode(`${timestampValue}.${payload}`);

  for (const signature of signatures) {
    const signatureBytes = hexToBytes(signature);
    if (signatureBytes && await crypto.subtle.verify("HMAC", key, new Uint8Array(signatureBytes).buffer, signedPayload)) return true;
  }
  return false;
}

async function sampleSigningKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function createSampleToken(email: string, secret: string): Promise<string> {
  const emailDigest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(email)));
  const fingerprint = Array.from(emailDigest.slice(0, 12), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  const payload = `${expires}.${fingerprint}`;
  const signature = await crypto.subtle.sign("HMAC", await sampleSigningKey(secret), encoder.encode(payload));
  return `${payload}.${toBase64Url(signature)}`;
}

async function isValidSampleToken(token: string, secret: string): Promise<boolean> {
  const [expiresValue, fingerprint, signatureValue, ...rest] = token.split(".");
  const expires = Number(expiresValue);
  if (rest.length || !Number.isSafeInteger(expires) || expires < Math.floor(Date.now() / 1000) || !/^[a-f0-9]{24}$/.test(fingerprint) || !signatureValue) return false;

  try {
    return crypto.subtle.verify(
      "HMAC",
      await sampleSigningKey(secret),
      new Uint8Array(fromBase64Url(signatureValue)).buffer,
      encoder.encode(`${expiresValue}.${fingerprint}`),
    );
  } catch {
    return false;
  }
}

async function syncBrevoContact(
  env: Env,
  contact: {
    email: string;
    interest: string;
    utmSource: string;
    utmMedium: string;
    utmCampaign: string;
  },
): Promise<void> {
  const apiKey = env.BREVO_API_KEY?.trim();
  const listId = Number.parseInt(env.BREVO_LIST_ID ?? "", 10);

  if (!apiKey || !Number.isSafeInteger(listId) || listId <= 0) {
    throw new Error("Brevo signup integration is not configured.");
  }

  const attributes: Record<string, string> = {
    INTEREST: contact.interest,
    SIGNUP_SOURCE: "website",
  };
  if (contact.utmSource) attributes.UTM_SOURCE = contact.utmSource;
  if (contact.utmMedium) attributes.UTM_MEDIUM = contact.utmMedium;
  if (contact.utmCampaign) attributes.UTM_CAMPAIGN = contact.utmCampaign;

  const response = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      email: contact.email,
      attributes,
      listIds: [listId],
      updateEnabled: true,
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    console.error("Brevo contact sync failed", response.status, detail);
    throw new Error("Brevo contact sync failed.");
  }
}

async function sendSampleDeliveryEmail(env: Env, email: string, sampleUrl: string): Promise<void> {
  const apiKey = env.BREVO_API_KEY?.trim();
  if (!apiKey) throw new Error("Brevo sample delivery is not configured.");

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: "TRADE HUSTL3",
        email: env.BREVO_SAMPLE_SENDER_EMAIL?.trim() || "updates@tradehustl3.com",
      },
      to: [{ email }],
      subject: "Your TRADE HUSTL3 2026-2027 guide preview is ready",
      htmlContent: `
        <div style="background:#071a2b;padding:32px;font-family:Arial,sans-serif;color:#f4f0e7">
          <div style="max-width:620px;margin:auto">
            <p style="color:#d6a52a;font-weight:700;letter-spacing:2px">ENTER. EARN. ELEVATE.</p>
            <h1 style="margin:16px 0;color:#ffffff">Your free trade guide preview is ready.</h1>
            <p style="font-size:16px;line-height:1.6;color:#c5ced5">Open the six-page 2026-2027 preview for verified trade profiles, national pay context, the guide's source standard, and practical next steps.</p>
            <p style="margin:28px 0"><a href="${sampleUrl}" style="display:inline-block;background:#d9361e;color:#ffffff;padding:16px 22px;text-decoration:none;font-weight:700">OPEN THE FREE GUIDE</a></p>
            <p style="color:#d6a52a;font-weight:700">BUILT BY HUSTL3. BACKED BY TRADES.</p>
          </div>
        </div>`,
    }),
  });

  if (!response.ok) throw new Error(`Brevo sample delivery failed with status ${response.status}.`);
}

async function sendEbookDeliveryEmail(env: Env, email: string, downloadUrl: string): Promise<void> {
  const apiKey = env.BREVO_API_KEY?.trim();
  if (!apiKey) throw new Error("Brevo eBook delivery is not configured.");

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: "TRADE HUSTL3",
        email: env.BREVO_SAMPLE_SENDER_EMAIL?.trim() || "updates@tradehustl3.com",
      },
      to: [{ email }],
      subject: "Your TRADE HUSTL3 eBook is ready",
      htmlContent: `
        <div style="background:#071a2b;padding:32px;font-family:Arial,sans-serif;color:#f4f0e7">
          <div style="max-width:620px;margin:auto">
            <p style="color:#d6a52a;font-weight:700;letter-spacing:2px">ENTER. EARN. ELEVATE.</p>
            <h1 style="margin:16px 0;color:#ffffff">Your TRADE HUSTL3 eBook is ready.</h1>
            <p style="font-size:16px;line-height:1.6;color:#c5ced5">Thank you for investing in your skilled-trades future. Use the private link below to download the complete eBook.</p>
            <p style="margin:28px 0"><a href="${downloadUrl}" style="display:inline-block;background:#d9361e;color:#ffffff;padding:16px 22px;text-decoration:none;font-weight:700">DOWNLOAD YOUR EBOOK</a></p>
            <p style="font-size:13px;line-height:1.6;color:#9cabb5">Keep this email for future downloads. This private link is tied to your purchase and should not be shared.</p>
            <p style="color:#d6a52a;font-weight:700">BUILT BY HUSTL3. BACKED BY TRADES.</p>
          </div>
        </div>`,
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    console.error("Brevo eBook delivery failed", response.status, detail);
    throw new Error("Brevo eBook delivery failed.");
  }
}


async function sendEbookPreorderConfirmationEmail(env: Env, email: string): Promise<void> {
  const apiKey = env.BREVO_API_KEY?.trim();
  if (!apiKey) throw new Error("Brevo eBook preorder delivery is not configured.");

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: "TRADE HUSTL3",
        email: env.BREVO_SAMPLE_SENDER_EMAIL?.trim() || "updates@tradehustl3.com",
      },
      to: [{ email }],
      subject: "Your TRADE HUSTL3 eBook preorder is confirmed",
      htmlContent: `
        <div style="background:#071a2b;padding:32px;font-family:Arial,sans-serif;color:#f4f0e7">
          <div style="max-width:620px;margin:auto">
            <p style="color:#d6a52a;font-weight:700;letter-spacing:2px">ENTER. EARN. ELEVATE.</p>
            <h1 style="margin:16px 0;color:#ffffff">Your eBook preorder is confirmed.</h1>
            <p style="font-size:16px;line-height:1.6;color:#c5ced5">Thank you for investing in your skilled-trades future. Your complete TRADE HUSTL3 eBook will be delivered to this email address on September 15, 2026.</p>
            <p style="font-size:16px;line-height:1.6;color:#c5ced5">No download is available before launch. You will receive a second email with your private download link when the book is released.</p>
            <p style="color:#d6a52a;font-weight:700">BUILT BY HUSTL3. BACKED BY TRADES.</p>
          </div>
        </div>`,
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    console.error("Brevo eBook preorder confirmation failed", response.status, detail);
    throw new Error("Brevo eBook preorder confirmation failed.");
  }
}

async function runEbookLaunchDelivery(env: Env): Promise<void> {
  if (!env.DB || !env.BOOKS || Date.now() < EBOOK_RELEASE_AT) return;

  const now = Math.floor(Date.now() / 1000);
  const leaseUntil = now + EBOOK_LAUNCH_LEASE_SECONDS;
  const pending = await env.DB.prepare(
    `SELECT stripe_session_id, email, download_token
     FROM ebook_orders
     WHERE status = 'paid'
       AND launch_emailed_at IS NULL
       AND (launch_email_lease_until IS NULL OR launch_email_lease_until < ?)
     ORDER BY created_at
     LIMIT ?`,
  ).bind(now, EBOOK_LAUNCH_BATCH_SIZE).all<{
    stripe_session_id: string;
    email: string;
    download_token: string;
  }>();

  for (const order of pending.results ?? []) {
    const claim = await env.DB.prepare(
      `UPDATE ebook_orders
       SET launch_email_lease_until = ?
       WHERE stripe_session_id = ?
         AND status = 'paid'
         AND launch_emailed_at IS NULL
         AND (launch_email_lease_until IS NULL OR launch_email_lease_until < ?)`,
    ).bind(leaseUntil, order.stripe_session_id, now).run();

    if (claim.meta?.changes !== 1) continue;

    const downloadUrl = `${SITE_URL}${EBOOK_DOWNLOAD_ROUTE}?token=${encodeURIComponent(order.download_token)}`;
    try {
      await sendEbookDeliveryEmail(env, order.email, downloadUrl);
      await env.DB.prepare(
        `UPDATE ebook_orders
         SET launch_emailed_at = CURRENT_TIMESTAMP, launch_email_lease_until = NULL, emailed_at = COALESCE(emailed_at, CURRENT_TIMESTAMP)
         WHERE stripe_session_id = ?`,
      ).bind(order.stripe_session_id).run();
    } catch (error) {
      await env.DB.prepare(
        "UPDATE ebook_orders SET launch_email_lease_until = NULL WHERE stripe_session_id = ? AND launch_emailed_at IS NULL",
      ).bind(order.stripe_session_id).run();
      console.error("eBook launch delivery failed", order.stripe_session_id, error);
    }
  }
}

type StripeCheckoutSession = {
  id?: unknown;
  payment_link?: unknown;
  payment_status?: unknown;
  amount_total?: unknown;
  currency?: unknown;
  customer_email?: unknown;
  customer_details?: { email?: unknown } | null;
};

async function handleStripeWebhook(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
  }

  const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim() || "";
  const expectedPaymentLink = env.STRIPE_EBOOK_PAYMENT_LINK_ID?.trim() || "";
  const signatureHeader = request.headers.get("Stripe-Signature") || "";
  const payload = await request.text();

  if (!webhookSecret || !expectedPaymentLink || !env.DB || !env.BOOKS) {
    console.error("Stripe eBook fulfillment is not configured.");
    return jsonResponse({ received: false }, 503);
  }

  if (!await verifyStripeSignature(payload, signatureHeader, webhookSecret)) {
    return jsonResponse({ received: false }, 400);
  }

  let event: { type?: unknown; data?: { object?: StripeCheckoutSession } };
  try {
    event = JSON.parse(payload) as typeof event;
  } catch {
    return jsonResponse({ received: false }, 400);
  }

  if (event.type !== "checkout.session.completed") return jsonResponse({ received: true });

  const session = event.data?.object;
  const sessionId = typeof session?.id === "string" ? session.id : "";
  const paymentLinkId = typeof session?.payment_link === "string" ? session.payment_link : "";
  const emailValue = session?.customer_details?.email ?? session?.customer_email;
  const email = typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
  const amountTotal = session?.amount_total;
  const currency = typeof session?.currency === "string" ? session.currency.toLowerCase() : "";

  if (
    !sessionId || paymentLinkId !== expectedPaymentLink || session?.payment_status !== "paid" ||
    (amountTotal !== 900 && amountTotal !== 999) || currency !== "usd" || !isValidEmail(email)
  ) {
    console.error("Stripe eBook checkout did not match the configured product.");
    return jsonResponse({ received: true });
  }

  try {
    const downloadToken = randomDownloadToken();
    await env.DB.prepare(
      `INSERT OR IGNORE INTO ebook_orders
       (stripe_session_id, email, payment_link_id, amount_total, currency, status, download_token)
       VALUES (?, ?, ?, ?, ?, 'paid', ?)`,
    ).bind(sessionId, email, paymentLinkId, amountTotal, currency, downloadToken).run();

    const order = await env.DB.prepare(
      "SELECT email, download_token, emailed_at, launch_emailed_at FROM ebook_orders WHERE stripe_session_id = ? AND status = 'paid'",
    ).bind(sessionId).first<{
      email: string;
      download_token: string;
      emailed_at: string | null;
      launch_emailed_at: string | null;
    }>();

    if (!order?.download_token) throw new Error("The paid eBook order could not be stored.");

    if (Date.now() < EBOOK_RELEASE_AT) {
      if (!order.emailed_at) {
        await sendEbookPreorderConfirmationEmail(env, order.email || email);
        await env.DB.prepare(
          "UPDATE ebook_orders SET emailed_at = CURRENT_TIMESTAMP WHERE stripe_session_id = ?",
        ).bind(sessionId).run();
      }
    } else if (!order.launch_emailed_at) {
      const downloadUrl = `${SITE_URL}${EBOOK_DOWNLOAD_ROUTE}?token=${encodeURIComponent(order.download_token)}`;
      await sendEbookDeliveryEmail(env, order.email || email, downloadUrl);
      await env.DB.prepare(
        "UPDATE ebook_orders SET emailed_at = COALESCE(emailed_at, CURRENT_TIMESTAMP), launch_emailed_at = CURRENT_TIMESTAMP, launch_email_lease_until = NULL WHERE stripe_session_id = ?",
      ).bind(sessionId).run();
    }

    return jsonResponse({ received: true });
  } catch (error) {
    console.error("Stripe eBook fulfillment failed", error);
    return jsonResponse({ received: false }, 500);
  }
}

async function servePurchasedEbook(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET" } });
  }
  if (!env.DB || !env.BOOKS) return new Response("eBook delivery is temporarily unavailable.", { status: 503 });
  if (Date.now() < EBOOK_RELEASE_AT) {
    return new Response("Your eBook download unlocks on September 15, 2026.", {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const token = new URL(request.url).searchParams.get("token") || "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return Response.redirect(`${SITE_URL}/book`, 302);

  const order = await env.DB.prepare(
    "SELECT stripe_session_id FROM ebook_orders WHERE download_token = ? AND status = 'paid'",
  ).bind(token).first<{ stripe_session_id: string }>();
  if (!order) return Response.redirect(`${SITE_URL}/book`, 302);

  const ebook = await env.BOOKS.get(EBOOK_OBJECT_KEY);
  if (!ebook) {
    console.error("The purchased eBook file is missing from private storage.");
    return new Response("eBook delivery is temporarily unavailable.", { status: 503 });
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/pdf");
  headers.set("Content-Disposition", 'attachment; filename="TRADE-HUSTL3-Complete-eBook.pdf"');
  headers.set("Cache-Control", "private, no-store");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  if (ebook.httpEtag) headers.set("ETag", ebook.httpEtag);
  return new Response(ebook.body, { status: 200, headers });
}

async function subscribe(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  if (!env.DB) {
    return jsonResponse({ ok: false, message: "Signup is temporarily unavailable. Please try again soon." }, 503);
  }

  try {
    const body = await request.json() as {
      email?: unknown;
      interest?: unknown;
      utm_source?: unknown;
      utm_medium?: unknown;
      utm_campaign?: unknown;
    };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const interest = typeof body.interest === "string" ? body.interest.trim() : "";

    if (!isValidEmail(email) || !allowedInterests.has(interest)) {
      return jsonResponse({ ok: false, message: "Enter a valid email and select an interest." }, 400);
    }

    await env.DB.prepare(
      `INSERT INTO subscribers (email, interest, source, status)
       VALUES (?, ?, 'website', 'active')
       ON CONFLICT(email) DO UPDATE SET
         interest = excluded.interest,
         source = excluded.source,
         status = 'active'`,
    ).bind(email, interest).run();

    await syncBrevoContact(env, {
      email,
      interest,
      utmSource: trackingValue(body.utm_source),
      utmMedium: trackingValue(body.utm_medium),
      utmCampaign: trackingValue(body.utm_campaign),
    });

    if (interest === "The TRADE HUSTL3 Book") {
      const apiKey = env.BREVO_API_KEY?.trim();
      if (!apiKey) throw new Error("Sample delivery is not configured.");
      const token = await createSampleToken(email, apiKey);
      const emailedSampleUrl = `${SITE_URL}${FREE_SAMPLE_ROUTE}?token=${encodeURIComponent(token)}`;
      try {
        await sendSampleDeliveryEmail(env, email, emailedSampleUrl);
      } catch (error) {
        console.error("Free guide delivery email failed", error);
      }

      return Response.json(
        { ok: true, message: "You're in. Your free 2026-2027 trade guide preview is ready, and a copy is on its way to your inbox.", sampleUrl: FREE_SAMPLE_ROUTE },
        {
          headers: {
            "Cache-Control": "no-store",
            "Set-Cookie": `${SAMPLE_COOKIE}; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Lax`,
          },
        },
      );
    }

    return jsonResponse({ ok: true, message: "You're on the TRADE HUSTL3 list." });
  } catch (error) {
    console.error("Subscriber signup failed", error);
    return jsonResponse({ ok: false, message: "We couldn't save your signup. Please try again." }, 500);
  }
}

async function serveFreeSample(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const cookieGranted = request.headers.get("Cookie")?.split(";").some((cookie) => cookie.trim() === SAMPLE_COOKIE) ?? false;
  const token = url.searchParams.get("token") || "";
  const secret = env.BREVO_API_KEY?.trim() || "";
  const tokenGranted = Boolean(token && secret && await isValidSampleToken(token, secret));

  if (!cookieGranted && !tokenGranted) {
    return Response.redirect(`${SITE_URL}/book#sample`, 302);
  }

  const encoded = freeSampleDataUrl.slice(freeSampleDataUrl.indexOf(",") + 1);
  const sample = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  const headers = new Headers();
  headers.set("Content-Type", "application/pdf");
  headers.set("Content-Disposition", 'inline; filename="TRADE-HUSTL3-2026-2027-Guide-Preview.pdf"');
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  if (tokenGranted) headers.set("Set-Cookie", `${SAMPLE_COOKIE}; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Lax`);
  return new Response(sample, { status: 200, headers });
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log("eBook launch sweep invoked", new Date().toISOString());
    if (Date.now() >= EBOOK_RELEASE_AT) ctx.waitUntil(runEbookLaunchDelivery(env));
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.hostname === "www.tradehustl3.com") {
      url.hostname = "tradehustl3.com";
      return Response.redirect(url.toString(), 308);
    }

    if (url.pathname === "/resume") {
      return Response.redirect(new URL("/resume-builder", request.url).toString(), 308);
    }

    const resumeBuilderResponse = await handleResumeBuilderRoute(request, env);
    if (resumeBuilderResponse) return resumeBuilderResponse;

    if (url.pathname === "/api/subscribe") {
      return subscribe(request, env);
    }

    if (url.pathname === STRIPE_WEBHOOK_ROUTE) {
      return handleStripeWebhook(request, env);
    }

    if (url.pathname === EBOOK_DOWNLOAD_ROUTE) {
      return servePurchasedEbook(request, env);
    }

    if (url.pathname === FREE_SAMPLE_ROUTE) {
      return serveFreeSample(request, env);
    }

    if (url.pathname === FREE_SAMPLE_PUBLIC_PATH) {
      return Response.redirect(`${SITE_URL}/book#sample`, 302);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
