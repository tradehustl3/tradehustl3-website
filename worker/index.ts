/** Cloudflare Worker entry point for the TRADE HUSTL3 website. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import freeSampleDataUrl from "./assets/trade-hustl3-free-sample.pdf?inline";
import bookSampleDataUrl from "./assets/trade-hustl3-seven-page-book-sample.pdf?inline";
import { SUPPORT_EMAIL } from "../shared/customer-config";
import { handleResumeBuilderRoute, ResumeBuilderEnv } from "./resume-builder";
import { handleEbookStripeRoute, runEbookLaunchDelivery, EbookStripeEnv, EBOOK_RELEASE_AT } from "./ebook-stripe";

interface Env extends ResumeBuilderEnv, EbookStripeEnv {
  ASSETS: Fetcher;
  DB: D1Database;
  BOOKS?: R2Bucket;
  BREVO_API_KEY?: string;
  BREVO_LIST_ID?: string;
  BREVO_SAMPLE_SENDER_EMAIL?: string;
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

const allowedSignupSources = new Set([
  "book_sample",
  "top_10_trades",
  "general_interest",
  "website",
]);

const FREE_SAMPLE_PUBLIC_PATH = "/trade-hustl3-free-sample.pdf";
const FREE_SAMPLE_ROUTE = "/api/free-sample";
const SAMPLE_COOKIE = "tradehustl3_sample_access=granted";
const SITE_URL = "https://tradehustl3.com";
// Two distinct free lead magnets, each with its own dedicated landing page and
// its own gated PDF. They deliver DIFFERENT files and are told apart by
// `signup_source`; per-resource signed tokens + cookies stop one link from
// unlocking the other.
//   top_10_trades → /top-10-trades → trade-hustl3-free-sample.pdf              (/api/free-sample)
//   book_sample   → /book/sample   → trade-hustl3-seven-page-book-sample.pdf   (/api/book-sample)
const GUIDE_PAGE_PATH = "/top-10-trades";
const BOOK_SAMPLE_PAGE_PATH = "/book/sample";
const BOOK_SAMPLE_ROUTE = "/api/book-sample";
const BOOK_SAMPLE_COOKIE = "tradehustl3_book_sample_access=granted";
type ResourceKey = "guide" | "book_sample";
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

async function sampleSigningKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function createSampleToken(email: string, secret: string, resource: ResourceKey = "guide"): Promise<string> {
  const emailDigest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(email)));
  const fingerprint = Array.from(emailDigest.slice(0, 12), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  // The resource is inside the signed payload, so a guide link can never unlock
  // the book sample (or vice versa).
  const payload = `${expires}.${resource}.${fingerprint}`;
  const signature = await crypto.subtle.sign("HMAC", await sampleSigningKey(secret), encoder.encode(payload));
  return `${payload}.${toBase64Url(signature)}`;
}

async function isValidSampleToken(token: string, secret: string, resource: ResourceKey = "guide"): Promise<boolean> {
  const [expiresValue, tokenResource, fingerprint, signatureValue, ...rest] = token.split(".");
  const expires = Number(expiresValue);
  if (
    rest.length
    || tokenResource !== resource
    || !Number.isSafeInteger(expires)
    || expires < Math.floor(Date.now() / 1000)
    || !/^[a-f0-9]{24}$/.test(fingerprint)
    || !signatureValue
  ) return false;

  try {
    return crypto.subtle.verify(
      "HMAC",
      await sampleSigningKey(secret),
      new Uint8Array(fromBase64Url(signatureValue)).buffer,
      encoder.encode(`${expiresValue}.${tokenResource}.${fingerprint}`),
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

async function sendSampleDeliveryEmail(env: Env, email: string, sampleUrl: string, source: string): Promise<void> {
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
      subject: source === "top_10_trades"
        ? "Your TRADE HUSTL3 Top 10 Trades preview is ready"
        : "Your TRADE HUSTL3 trade guide preview is ready",
      htmlContent: `
        <div style="background:#071a2b;padding:32px;font-family:Arial,sans-serif;color:#f4f0e7">
          <div style="max-width:620px;margin:auto">
            <p style="color:#d6a52a;font-weight:700;letter-spacing:2px">ENTER. EARN. ELEVATE.</p>
            <h1 style="margin:16px 0;color:#ffffff">Your free Top 10 Trades guide is ready.</h1>
            <p style="font-size:16px;line-height:1.6;color:#c5ced5">Open the seven-page 2026-2027 guide (cover included) for verified trade profiles, national pay context, the guide's source standard, and practical next steps.</p>
            <p style="margin:28px 0"><a href="${sampleUrl}" style="display:inline-block;background:#d71920;color:#ffffff;padding:16px 22px;text-decoration:none;font-weight:700">OPEN THE FREE GUIDE</a></p>
            <p style="font-size:14px;line-height:1.6;color:#c5ced5">Found your direction? <a href="${SITE_URL}/resume-builder" style="color:#d6a52a">Build a trade-focused resume with TRADE HUSTL3 Resume Builder</a>.</p>
            <p style="font-size:13px;line-height:1.6;color:#9cabb5">Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color:#d6a52a">${SUPPORT_EMAIL}</a></p>
            <p style="color:#d6a52a;font-weight:700">BUILT BY HUSTL3. BACKED BY TRADES.</p>
          </div>
        </div>`,
    }),
  });

  if (!response.ok) throw new Error(`Brevo sample delivery failed with status ${response.status}.`);
}

async function sendBookSampleDeliveryEmail(env: Env, email: string, downloadUrl: string): Promise<void> {
  const apiKey = env.BREVO_API_KEY?.trim();
  if (!apiKey) throw new Error("Brevo book-sample delivery is not configured.");
  const readerUrl = `${SITE_URL}${BOOK_SAMPLE_PAGE_PATH}#read`;

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
            <p style="color:#d6a52a;font-weight:700;letter-spacing:2px">ENTER. EARN. ELEVATE.</p>
            <h1 style="margin:16px 0;color:#ffffff">Your 7-page book sample is ready.</h1>
            <p style="font-size:16px;line-height:1.6;color:#c5ced5">It's the cover, opening pages, the full table of contents, and the beginning of Chapter 1 of <em>TRADE HUSTL3: Built by Hustle, Backed by Trades</em>.</p>
            <p style="margin:28px 0"><a href="${downloadUrl}" style="display:inline-block;background:#d71920;color:#ffffff;padding:16px 22px;text-decoration:none;font-weight:700">DOWNLOAD THE 7-PAGE SAMPLE (PDF)</a></p>
            <p style="font-size:14px;line-height:1.6;color:#c5ced5">Prefer to read in your browser? <a href="${readerUrl}" style="color:#d6a52a">Open the web reader</a>.</p>
            <p style="font-size:14px;line-height:1.6;color:#c5ced5">Ready for the whole thing? <a href="${SITE_URL}/book" style="color:#d6a52a">Continue with the full TRADE HUSTL3 book</a>.</p>
            <p style="font-size:13px;line-height:1.6;color:#9cabb5">Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color:#d6a52a">${SUPPORT_EMAIL}</a></p>
            <p style="color:#d6a52a;font-weight:700">BUILT BY HUSTLE. BACKED BY TRADES.</p>
          </div>
        </div>`,
    }),
  });

  if (!response.ok) throw new Error(`Brevo book-sample delivery failed with status ${response.status}.`);
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
      signup_source?: unknown;
      utm_source?: unknown;
      utm_medium?: unknown;
      utm_campaign?: unknown;
    };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const interest = typeof body.interest === "string" ? body.interest.trim() : "";
    const requestedSource = typeof body.signup_source === "string" ? body.signup_source.trim() : "";
    const source = allowedSignupSources.has(requestedSource) ? requestedSource : "website";

    if (!isValidEmail(email) || !allowedInterests.has(interest)) {
      return jsonResponse({ ok: false, message: "Enter a valid email and select an interest." }, 400);
    }

    await env.DB.prepare(
      `INSERT INTO subscribers (email, interest, source, status)
       VALUES (?, ?, ?, 'active')
       ON CONFLICT(email) DO UPDATE SET
         interest = excluded.interest,
         source = excluded.source,
         status = 'active'`,
    ).bind(email, interest, source).run();

    await syncBrevoContact(env, {
      email,
      interest,
      source,
      utmSource: trackingValue(body.utm_source),
      utmMedium: trackingValue(body.utm_medium),
      utmCampaign: trackingValue(body.utm_campaign),
    });

    if (interest === "The TRADE HUSTL3 Book") {
      const apiKey = env.BREVO_API_KEY?.trim();
      if (!apiKey) throw new Error("Free resource delivery is not configured.");

      // book_sample funnel: gated 7-page book excerpt PDF (/api/book-sample),
      // same signed-token + cookie architecture as the guide, different file.
      if (source === "book_sample") {
        const token = await createSampleToken(email, apiKey, "book_sample");
        const emailedDownloadUrl = `${SITE_URL}${BOOK_SAMPLE_ROUTE}?token=${encodeURIComponent(token)}`;
        try {
          await sendBookSampleDeliveryEmail(env, email, emailedDownloadUrl);
        } catch (error) {
          console.error("Book sample delivery email failed", error);
        }
        return Response.json(
          {
            ok: true,
            message: "You're in. Your free 7-page TRADE HUSTL3 book sample is ready, and a copy is on its way to your inbox.",
            sampleUrl: BOOK_SAMPLE_ROUTE,
            funnel: source,
          },
          {
            headers: {
              "Cache-Control": "no-store",
              "Set-Cookie": `${BOOK_SAMPLE_COOKIE}; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Lax`,
            },
          },
        );
      }

      // Every other book-interest signup is the Top 10 Trades guide funnel.
      const token = await createSampleToken(email, apiKey, "guide");
      const emailedSampleUrl = `${SITE_URL}${FREE_SAMPLE_ROUTE}?token=${encodeURIComponent(token)}`;
      try {
        await sendSampleDeliveryEmail(env, email, emailedSampleUrl, source);
      } catch (error) {
        console.error("Top 10 Trades guide delivery email failed", error);
      }

      return Response.json(
        { ok: true, message: "You're in. Your free 2026-2027 Top 10 Trades guide is ready, and a copy is on its way to your inbox.", sampleUrl: FREE_SAMPLE_ROUTE, funnel: source },
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

/**
 * One gated free-resource server for both lead magnets. Cookie- or signed-token-
 * gated; the token is bound to `resource`, so a guide link cannot serve the book
 * sample and vice versa. Unauthenticated requests are sent to the funnel's own
 * landing page.
 */
async function serveGatedResource(
  request: Request,
  env: Env,
  resource: ResourceKey,
): Promise<Response> {
  const config = resource === "book_sample"
    ? {
        dataUrl: bookSampleDataUrl,
        cookie: BOOK_SAMPLE_COOKIE,
        filename: "TRADE-HUSTL3-7-Page-Book-Sample.pdf",
        landing: `${SITE_URL}${BOOK_SAMPLE_PAGE_PATH}`,
      }
    : {
        dataUrl: freeSampleDataUrl,
        cookie: SAMPLE_COOKIE,
        filename: "TRADE-HUSTL3-2026-2027-Guide-Preview.pdf",
        landing: `${SITE_URL}${GUIDE_PAGE_PATH}#get-guide`,
      };

  const url = new URL(request.url);
  const cookieGranted = request.headers.get("Cookie")?.split(";").some((cookie) => cookie.trim() === config.cookie) ?? false;
  const token = url.searchParams.get("token") || "";
  const secret = env.BREVO_API_KEY?.trim() || "";
  const tokenGranted = Boolean(token && secret && await isValidSampleToken(token, secret, resource));

  if (!cookieGranted && !tokenGranted) {
    return Response.redirect(config.landing, 302);
  }

  const encoded = config.dataUrl.slice(config.dataUrl.indexOf(",") + 1);
  const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  const headers = new Headers();
  headers.set("Content-Type", "application/pdf");
  headers.set("Content-Disposition", `inline; filename="${config.filename}"`);
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  if (tokenGranted) headers.set("Set-Cookie", `${config.cookie}; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Lax`);
  return new Response(bytes, { status: 200, headers });
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

    const ebookStripeResponse = await handleEbookStripeRoute(request, env);
    if (ebookStripeResponse) return ebookStripeResponse;

    if (url.pathname === "/api/subscribe") {
      return subscribe(request, env);
    }

    if (url.pathname === FREE_SAMPLE_ROUTE) {
      return serveGatedResource(request, env, "guide");
    }

    if (url.pathname === BOOK_SAMPLE_ROUTE) {
      return serveGatedResource(request, env, "book_sample");
    }

    if (url.pathname === FREE_SAMPLE_PUBLIC_PATH) {
      return Response.redirect(`${SITE_URL}${GUIDE_PAGE_PATH}#get-guide`, 302);
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
