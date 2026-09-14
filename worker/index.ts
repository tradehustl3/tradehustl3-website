/** Cloudflare Worker entry point for the TRADE HUSTL3 website. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import freeSampleDataUrl from "./assets/trade-hustl3-free-sample.pdf?inline";
import bookSampleDataUrl from "./assets/trade-hustl3-seven-page-book-sample.pdf?inline";
import { handleResumeBuilderRoute, ResumeBuilderEnv, runResumeBuilderRetention } from "./resume-builder";
import { handleEbookStripeRoute, runEbookLaunchDelivery, EbookStripeEnv, EBOOK_RELEASE_AT } from "./ebook-stripe";

interface Env extends ResumeBuilderEnv, EbookStripeEnv {
  ASSETS: Fetcher;
  DB: D1Database;
  BOOKS?: R2Bucket;
  BREVO_API_KEY?: string;
  BREVO_LIST_ID?: string;
  BREVO_SAMPLE_SENDER_EMAIL?: string;
  /** Dedicated HMAC secret for guide sample links. */
  SAMPLE_TOKEN_SECRET?: string;
  /** Dedicated HMAC secret for the gated 7-page book-sample link. */
  BOOK_SAMPLE_TOKEN_SECRET?: string;
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
  "Top 10 Trades",
  "Book 7-Page Sample",
  "The TRADE HUSTL3 Book",
  "Resume Builder",
  "HUSTL3 PRO",
  "Jobsite Gear",
  "School / Workforce Partnership",
  "General TRADE HUSTL3 Updates",
]);

/** Per-funnel value persisted to D1 `subscribers.source` and sent to Brevo as
 * SIGNUP_SOURCE. Only the two dedicated free-resource funnels get a specific
 * source; everything else keeps the historical "website". */
function signupSourceForInterest(interest: string): string {
  if (interest === "Book 7-Page Sample") return "book_sample";
  if (interest === "Top 10 Trades" || interest === "The TRADE HUSTL3 Book") return "top_10_trades";
  return "website";
}

const FREE_SAMPLE_PUBLIC_PATH = "/trade-hustl3-free-sample.pdf";
const FREE_SAMPLE_ROUTE = "/api/free-sample";
const SAMPLE_COOKIE_NAME = "tradehustl3_sample_access";
// The 7-page book sample is a separate lead magnet from the Top 10 Trades guide:
// its own page, its own gated PDF, its own route, and — critically — its own
// cookie and token namespace so neither credential can unlock the other.
const BOOK_SAMPLE_ROUTE = "/api/book-sample";
const BOOK_SAMPLE_COOKIE_NAME = "tradehustl3_book_sample_access";
const BOOK_SAMPLE_PAGE = "/book/sample";
const SITE_URL = "https://tradehustl3.com";
const encoder = new TextEncoder();

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://checkout.stripe.com",
  "script-src 'self' 'unsafe-inline' https://connect.facebook.net https://s.pinimg.com https://www.googletagmanager.com https://www.google-analytics.com",
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: https://www.facebook.com https://connect.facebook.net https://ct.pinterest.com https://*.google-analytics.com",
  "connect-src 'self' https://api.brevo.com https://www.google-analytics.com https://region1.google-analytics.com https://www.facebook.com https://ct.pinterest.com",
  "frame-src 'self' https://checkout.stripe.com https://js.stripe.com",
  "upgrade-insecure-requests",
].join("; ");

function withSecurityHeaders(response: Response, pathname = ""): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(self)");
  headers.set("Strict-Transport-Security", "max-age=31536000");
  headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  if (pathname === "/resume-builder/confirm") {
    headers.set("Cache-Control", "no-store");
    headers.set("Referrer-Policy", "no-referrer");
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function trackingValue(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 160) : "";
}

function requestIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP")?.trim() || "unknown";
}

async function sha256Hex(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function checkRateLimit(env: Env, bucket: string, limit: number, windowSeconds: number): Promise<boolean> {
  const windowStart = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
  const row = await env.DB.prepare(
    `INSERT INTO rate_limits (bucket, window_start, count)
     VALUES (?, ?, 1)
     ON CONFLICT(bucket) DO UPDATE SET
       count = CASE
         WHEN rate_limits.window_start = excluded.window_start THEN rate_limits.count + 1
         ELSE 1
       END,
       window_start = excluded.window_start
     RETURNING count`,
  ).bind(bucket, windowStart).first<{ count: number }>();
  return Boolean(row && row.count <= limit);
}

async function readJsonBody(request: Request, maxBytes: number): Promise<Record<string, unknown> | null> {
  const declaredLength = Number(request.headers.get("Content-Length") || "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) return null;
  if (!request.body) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    if (!text) return null;
    const value = JSON.parse(text) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function cookieValue(request: Request, name: string): string {
  const cookies = request.headers.get("Cookie")?.split(";") ?? [];
  for (const cookie of cookies) {
    const [key, ...parts] = cookie.trim().split("=");
    if (key === name) return decodeURIComponent(parts.join("="));
  }
  return "";
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

/**
 * Book-sample link signing — deliberately separate from the guide token
 * functions above. The guide's tokens are 3-part (`expires.fingerprint.sig`)
 * and are already sitting in customers' inboxes, so that format is frozen.
 * A book-sample token is 4-part with the literal "book_sample" folded into the
 * signed payload: the guide verifier rejects it (extra segment, non-hex
 * fingerprint slot) and this verifier rejects a guide token (missing the
 * "book_sample" segment). Distinct cookie names complete the isolation.
 */
function bookSampleTokenSecret(env: Env): string {
  return env.BOOK_SAMPLE_TOKEN_SECRET?.trim() || "";
}

function sampleTokenSecrets(env: Env): string[] {
  // BREVO_API_KEY remains verification-only for the seven-day lifetime of
  // legacy links. Newly minted credentials always use the dedicated secret.
  return [env.SAMPLE_TOKEN_SECRET?.trim(), env.BREVO_API_KEY?.trim()].filter((secret): secret is string => Boolean(secret));
}

async function createBookSampleToken(email: string, secret: string): Promise<string> {
  const emailDigest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(email)));
  const fingerprint = Array.from(emailDigest.slice(0, 12), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  const payload = `${expires}.book_sample.${fingerprint}`;
  const signature = await crypto.subtle.sign("HMAC", await sampleSigningKey(secret), encoder.encode(payload));
  return `${payload}.${toBase64Url(signature)}`;
}

async function isValidBookSampleToken(token: string, secret: string): Promise<boolean> {
  const [expiresValue, resource, fingerprint, signatureValue, ...rest] = token.split(".");
  const expires = Number(expiresValue);
  if (
    rest.length || resource !== "book_sample" || !Number.isSafeInteger(expires) ||
    expires < Math.floor(Date.now() / 1000) || !/^[a-f0-9]{24}$/.test(fingerprint) || !signatureValue
  ) {
    return false;
  }

  try {
    return crypto.subtle.verify(
      "HMAC",
      await sampleSigningKey(secret),
      new Uint8Array(fromBase64Url(signatureValue)).buffer,
      encoder.encode(`${expiresValue}.book_sample.${fingerprint}`),
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
    source: string;
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
    SIGNUP_SOURCE: contact.source,
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

async function sendTopTradesDeliveryEmail(env: Env, email: string, sampleUrl: string): Promise<void> {
  const apiKey = env.BREVO_API_KEY?.trim();
  if (!apiKey) throw new Error("Brevo guide delivery is not configured.");

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
      subject: "Your TRADE HUSTL3 Top 10 Trades guide is ready",
      htmlContent: `
        <div style="background:#071a2b;padding:32px;font-family:Arial,sans-serif;color:#f4f0e7">
          <div style="max-width:620px;margin:auto">
            <p style="color:#d6a52a;font-weight:700;letter-spacing:2px">ENTER. EARN. ELEVATE.</p>
            <h1 style="margin:16px 0;color:#ffffff">Your free Top 10 Trades guide is ready.</h1>
            <p style="font-size:16px;line-height:1.6;color:#c5ced5">Open the seven-page 2026-2027 preview (cover included) for trade profiles, national pay context, the guide's source standard, and practical next steps.</p>
            <p style="margin:28px 0"><a href="${sampleUrl}" style="display:inline-block;background:#d71920;color:#ffffff;padding:16px 22px;text-decoration:none;font-weight:700">OPEN THE FREE GUIDE</a></p>
            <p style="color:#d6a52a;font-weight:700">BUILT BY HUSTLE. BACKED BY TRADES.</p>
          </div>
        </div>`,
    }),
  });

  if (!response.ok) throw new Error(`Brevo guide delivery failed with status ${response.status}.`);
}

async function sendBookSampleDeliveryEmail(env: Env, email: string, downloadUrl: string): Promise<void> {
  const apiKey = env.BREVO_API_KEY?.trim();
  if (!apiKey) throw new Error("Brevo book-sample delivery is not configured.");

  const readerUrl = `${SITE_URL}/book/sample/read`;
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
      subject: "Your free 7-page TRADE HUSTL3 book sample is ready",
      htmlContent: `
        <div style="background:#071a2b;padding:32px;font-family:Arial,sans-serif;color:#f4f0e7">
          <div style="max-width:620px;margin:auto">
            <p style="color:#d6a52a;font-weight:700;letter-spacing:2px">BUILT BY HUSTLE. BACKED BY TRADES.</p>
            <h1 style="margin:16px 0;color:#ffffff">Your 7-page book sample is ready.</h1>
            <p style="font-size:16px;line-height:1.6;color:#c5ced5">This is the free seven-page sample of TRADE HUSTL3 &mdash; the cover, opening pages, table of contents, and the beginning of Chapter 1.</p>
            <p style="margin:28px 0"><a href="${downloadUrl}" style="display:inline-block;background:#d71920;color:#ffffff;padding:16px 22px;text-decoration:none;font-weight:700">DOWNLOAD THE 7-PAGE SAMPLE (PDF)</a></p>
            <p style="font-size:14px;line-height:1.6;color:#9fb0bd">Prefer to read in your browser? <a href="${readerUrl}" style="color:#d6a52a;font-weight:700">Open the online reader</a>.</p>
            <p style="color:#d6a52a;font-weight:700">ENTER. EARN. ELEVATE.</p>
          </div>
        </div>`,
    }),
  });

  if (!response.ok) throw new Error(`Brevo book-sample delivery failed with status ${response.status}.`);
}

type LeadDeliveryKind = "brevo_contact" | "top_trades_email" | "book_sample_email";

type LeadDeliveryJob = {
  job_id: string;
  email: string;
  kind: LeadDeliveryKind;
  payload_json: string;
  attempts: number;
};

function deliveryError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 500);
}

async function queueLeadDelivery(
  env: Env,
  email: string,
  kind: LeadDeliveryKind,
  payload: Record<string, unknown>,
  error: unknown,
): Promise<boolean> {
  try {
    const jobId = `${kind}:${await sha256Hex(email)}`;
    await env.DB.prepare(
      `INSERT INTO lead_delivery_jobs
       (job_id, email, kind, payload_json, status, attempts, next_attempt_at, last_error, updated_at)
       VALUES (?, ?, ?, ?, 'pending', 0, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(job_id) DO UPDATE SET
         payload_json = excluded.payload_json,
         status = 'pending',
         next_attempt_at = excluded.next_attempt_at,
         last_error = excluded.last_error,
         updated_at = CURRENT_TIMESTAMP`,
    ).bind(jobId, email, kind, JSON.stringify(payload), Math.floor(Date.now() / 1000) + 300, deliveryError(error)).run();
    return true;
  } catch (queueError) {
    console.error("Lead delivery could not be queued", { kind, error: deliveryError(queueError) });
    return false;
  }
}

async function performLeadDelivery(env: Env, job: LeadDeliveryJob): Promise<void> {
  const payload = JSON.parse(job.payload_json || "{}") as Record<string, unknown>;
  if (job.kind === "brevo_contact") {
    await syncBrevoContact(env, {
      email: job.email,
      interest: trackingValue(payload.interest),
      source: trackingValue(payload.source) || "website",
      utmSource: trackingValue(payload.utmSource),
      utmMedium: trackingValue(payload.utmMedium),
      utmCampaign: trackingValue(payload.utmCampaign),
    });
    return;
  }
  if (job.kind === "top_trades_email") {
    const secret = env.SAMPLE_TOKEN_SECRET?.trim() || "";
    if (!secret) throw new Error("Guide delivery is not configured.");
    const token = await createSampleToken(job.email, secret);
    await sendTopTradesDeliveryEmail(env, job.email, `${SITE_URL}${FREE_SAMPLE_ROUTE}?token=${encodeURIComponent(token)}`);
    return;
  }
  const secret = bookSampleTokenSecret(env);
  if (!secret) throw new Error("Book sample delivery is not configured.");
  const token = await createBookSampleToken(job.email, secret);
  await sendBookSampleDeliveryEmail(env, job.email, `${SITE_URL}${BOOK_SAMPLE_ROUTE}?token=${encodeURIComponent(token)}`);
}

export async function runLeadDeliveryRetries(env: Env): Promise<void> {
  if (!env.DB) return;
  const now = Math.floor(Date.now() / 1000);
  let jobs: LeadDeliveryJob[] = [];
  try {
    const result = await env.DB.prepare(
      `SELECT job_id, email, kind, payload_json, attempts
       FROM lead_delivery_jobs
       WHERE status = 'pending' AND next_attempt_at <= ?
       ORDER BY next_attempt_at ASC
       LIMIT 25`,
    ).bind(now).all<LeadDeliveryJob>();
    jobs = result.results ?? [];
  } catch (error) {
    console.error("Lead delivery queue unavailable", deliveryError(error));
    return;
  }

  let delivered = 0;
  let failed = 0;
  for (const job of jobs) {
    try {
      await performLeadDelivery(env, job);
      await env.DB.prepare("DELETE FROM lead_delivery_jobs WHERE job_id = ?").bind(job.job_id).run();
      delivered += 1;
    } catch (error) {
      const attempts = job.attempts + 1;
      const deadLetter = attempts >= 6;
      const retryDelay = Math.min(21_600, 300 * (2 ** Math.min(attempts, 6)));
      await env.DB.prepare(
        `UPDATE lead_delivery_jobs
         SET attempts = ?, status = ?, next_attempt_at = ?, last_error = ?, updated_at = CURRENT_TIMESTAMP
         WHERE job_id = ?`,
      ).bind(attempts, deadLetter ? "dead_letter" : "pending", now + retryDelay, deliveryError(error), job.job_id).run();
      console.error(deadLetter ? "Lead delivery moved to dead letter" : "Lead delivery retry failed", {
        jobId: job.job_id,
        kind: job.kind,
        attempts,
        error: deliveryError(error),
      });
      failed += 1;
    }
  }
  if (jobs.length) console.log("Lead delivery sweep complete", { attempted: jobs.length, delivered, failed });
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

  const origin = request.headers.get("Origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== SITE_URL) return jsonResponse({ ok: false, message: "Invalid signup origin." }, 403);
    } catch {
      return jsonResponse({ ok: false, message: "Invalid signup origin." }, 403);
    }
  }
  try {
    const body = await readJsonBody(request, 32_000);
    if (!body) return jsonResponse({ ok: false, message: "Signup request is invalid or too large." }, 413);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const interest = typeof body.interest === "string" ? body.interest.trim() : "";

    if (!isValidEmail(email) || !allowedInterests.has(interest)) {
      return jsonResponse({ ok: false, message: "Enter a valid email and select an interest." }, 400);
    }

    const [emailAllowed, ipAllowed] = await Promise.all([
      checkRateLimit(env, `subscribe-email:${await sha256Hex(email)}`, 3, 60 * 60),
      checkRateLimit(env, `subscribe-ip:${await sha256Hex(requestIp(request))}`, 8, 15 * 60),
    ]);
    if (!emailAllowed || !ipAllowed) {
      return jsonResponse({ ok: false, message: "Too many signup attempts. Try again later." }, 429);
    }

    const source = signupSourceForInterest(interest);

    await env.DB.prepare(
      `INSERT INTO subscribers (email, interest, source, status)
       VALUES (?, ?, ?, 'active')
       ON CONFLICT(email) DO UPDATE SET
         interest = excluded.interest,
         source = excluded.source,
         status = 'active'`,
    ).bind(email, interest, source).run();

    try {
      await syncBrevoContact(env, {
        email,
        interest,
        source,
        utmSource: trackingValue(body.utm_source),
        utmMedium: trackingValue(body.utm_medium),
        utmCampaign: trackingValue(body.utm_campaign),
      });
    } catch (error) {
      // D1 remains the source of truth; a durable job retries the Brevo sync.
      console.error("Brevo contact sync unavailable; signup retained in D1", error);
      await queueLeadDelivery(env, email, "brevo_contact", {
        interest,
        source,
        utmSource: trackingValue(body.utm_source),
        utmMedium: trackingValue(body.utm_medium),
        utmCampaign: trackingValue(body.utm_campaign),
      }, error);
    }

    if (interest === "Top 10 Trades" || interest === "The TRADE HUSTL3 Book") {
      const secret = env.SAMPLE_TOKEN_SECRET?.trim() || "";
      if (!secret) throw new Error("Guide delivery is not configured.");
      const token = await createSampleToken(email, secret);
      const emailedSampleUrl = `${SITE_URL}${FREE_SAMPLE_ROUTE}?token=${encodeURIComponent(token)}`;
      let emailDelivered = true;
      let emailQueued = false;
      try {
        await sendTopTradesDeliveryEmail(env, email, emailedSampleUrl);
      } catch (error) {
        emailDelivered = false;
        console.error("Top 10 Trades delivery email failed", error);
        emailQueued = await queueLeadDelivery(env, email, "top_trades_email", { interest }, error);
      }

      const guideName = interest === "The TRADE HUSTL3 Book"
        ? "free 2026-2027 trade guide preview"
        : "free 2026-2027 Top 10 Trades guide";
      const message = emailDelivered
        ? `You're in. Your ${guideName} is ready, and a copy is on its way to your inbox.`
        : emailQueued
          ? `You're in. Your ${guideName} is ready below. Email delivery is delayed, so we queued it for another attempt.`
          : `You're in. Your ${guideName} is ready below, but we could not email the copy. Please use the download link.`;

      return Response.json(
        { ok: true, message, sampleUrl: FREE_SAMPLE_ROUTE, emailDelivered, emailQueued },
        {
          headers: {
            "Cache-Control": "no-store",
            "Set-Cookie": `${SAMPLE_COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Lax`,
          },
        },
      );
    }

    if (interest === "Book 7-Page Sample") {
      const secret = bookSampleTokenSecret(env);
      if (!secret) throw new Error("Book sample delivery is not configured.");
      const token = await createBookSampleToken(email, secret);
      const downloadUrl = `${SITE_URL}${BOOK_SAMPLE_ROUTE}?token=${encodeURIComponent(token)}`;
      let emailDelivered = true;
      let emailQueued = false;
      try {
        await sendBookSampleDeliveryEmail(env, email, downloadUrl);
      } catch (error) {
        emailDelivered = false;
        console.error("Book sample delivery email failed", error);
        emailQueued = await queueLeadDelivery(env, email, "book_sample_email", {}, error);
      }
      return Response.json(
        {
          ok: true,
          message: emailDelivered
            ? "You're in. Your free 7-page TRADE HUSTL3 book sample is ready to download, and a copy is on its way to your inbox."
            : emailQueued
              ? "Your free 7-page book sample is ready below. Email delivery is delayed, so we queued it for another attempt."
              : "Your free 7-page book sample is ready below, but we could not email the copy. Please use the download link.",
          sampleUrl: BOOK_SAMPLE_ROUTE,
          emailDelivered,
          emailQueued,
        },
        {
          headers: {
            "Cache-Control": "no-store",
            "Set-Cookie": `${BOOK_SAMPLE_COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Lax`,
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
  const cookieToken = cookieValue(request, SAMPLE_COOKIE_NAME);
  const cookieGranted = Boolean(cookieToken && (await Promise.any(sampleTokenSecrets(env).map((secret) => isValidSampleToken(cookieToken, secret))).catch(() => false)));
  const token = url.searchParams.get("token") || "";
  const tokenGranted = Boolean(token && (await Promise.any(sampleTokenSecrets(env).map((secret) => isValidSampleToken(token, secret))).catch(() => false)));

  if (!cookieGranted && !tokenGranted) {
    return Response.redirect(`${SITE_URL}/top-10-trades#get-guide`, 302);
  }

  const encoded = freeSampleDataUrl.slice(freeSampleDataUrl.indexOf(",") + 1);
  const sample = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  const headers = new Headers();
  headers.set("Content-Type", "application/pdf");
  headers.set("Content-Disposition", 'inline; filename="TRADE-HUSTL3-2026-2027-Guide-Preview.pdf"');
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  if (tokenGranted) headers.set("Set-Cookie", `${SAMPLE_COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Lax`);
  return new Response(sample, { status: 200, headers });
}

async function serveBookSample(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const cookieToken = cookieValue(request, BOOK_SAMPLE_COOKIE_NAME);
  const token = url.searchParams.get("token") || "";
  const secrets = [env.BOOK_SAMPLE_TOKEN_SECRET?.trim(), env.BREVO_API_KEY?.trim()].filter((secret): secret is string => Boolean(secret));
  const cookieGranted = Boolean(cookieToken && (await Promise.any(secrets.map((secret) => isValidBookSampleToken(cookieToken, secret))).catch(() => false)));
  const tokenGranted = Boolean(token && (await Promise.any(secrets.map((secret) => isValidBookSampleToken(token, secret))).catch(() => false)));

  if (!cookieGranted && !tokenGranted) {
    return Response.redirect(`${SITE_URL}${BOOK_SAMPLE_PAGE}`, 302);
  }

  const encoded = bookSampleDataUrl.slice(bookSampleDataUrl.indexOf(",") + 1);
  const sample = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  const headers = new Headers();
  headers.set("Content-Type", "application/pdf");
  headers.set("Content-Disposition", 'inline; filename="TRADE-HUSTL3-7-Page-Book-Sample.pdf"');
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  if (tokenGranted) headers.set("Set-Cookie", `${BOOK_SAMPLE_COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Lax`);
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
    const jobs = [runResumeBuilderRetention(env), runLeadDeliveryRetries(env)];
    if (Date.now() >= EBOOK_RELEASE_AT) jobs.push(runEbookLaunchDelivery(env));
    ctx.waitUntil(Promise.all(jobs).then(() => undefined));
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.protocol === "http:" && (url.hostname === "tradehustl3.com" || url.hostname === "www.tradehustl3.com")) {
      url.protocol = "https:";
      url.hostname = "tradehustl3.com";
      return withSecurityHeaders(Response.redirect(url.toString(), 308), url.pathname);
    }

    if (url.hostname === "www.tradehustl3.com") {
      url.hostname = "tradehustl3.com";
      return withSecurityHeaders(Response.redirect(url.toString(), 308), url.pathname);
    }

    if (url.pathname === "/resume") {
      return withSecurityHeaders(Response.redirect(new URL("/resume-builder", request.url).toString(), 308), url.pathname);
    }

    const resumeBuilderResponse = await handleResumeBuilderRoute(request, env);
    if (resumeBuilderResponse) return withSecurityHeaders(resumeBuilderResponse, url.pathname);

    const ebookStripeResponse = await handleEbookStripeRoute(request, env);
    if (ebookStripeResponse) return withSecurityHeaders(ebookStripeResponse, url.pathname);

    if (url.pathname === "/api/health" && request.method === "GET") {
      try {
        await env.DB.prepare("SELECT 1 AS healthy").first();
        return withSecurityHeaders(jsonResponse({ ok: true, database: "available", timestamp: new Date().toISOString() }), url.pathname);
      } catch (error) {
        console.error("Health check failed", deliveryError(error));
        return withSecurityHeaders(jsonResponse({ ok: false, database: "unavailable", timestamp: new Date().toISOString() }, 503), url.pathname);
      }
    }

    if (url.pathname === "/api/subscribe") {
      return withSecurityHeaders(await subscribe(request, env), url.pathname);
    }

    if (url.pathname === FREE_SAMPLE_ROUTE) {
      return withSecurityHeaders(await serveFreeSample(request, env), url.pathname);
    }

    if (url.pathname === BOOK_SAMPLE_ROUTE) {
      return withSecurityHeaders(await serveBookSample(request, env), url.pathname);
    }

    if (url.pathname === FREE_SAMPLE_PUBLIC_PATH) {
      return withSecurityHeaders(Response.redirect(`${SITE_URL}/book#sample`, 302), url.pathname);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return withSecurityHeaders(await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths), url.pathname);
    }

    const response = withSecurityHeaders(await handler.fetch(request, env, ctx), url.pathname);
    if (request.method === "GET" && (url.pathname.startsWith("/optimized/") || url.pathname === "/favicon.svg")) {
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }
    return response;
  },
};

export default worker;
