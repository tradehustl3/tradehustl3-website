/** Stripe checkout/refund webhook handling and private eBook delivery. */
import { DIRECT_EBOOK_PRODUCT, SUPPORT_EMAIL } from "../shared/customer-config";
export interface EbookStripeEnv {
  DB: D1Database;
  BOOKS?: R2Bucket;
  BREVO_API_KEY?: string;
  BREVO_SAMPLE_SENDER_EMAIL?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_EBOOK_PAYMENT_LINK_ID?: string;
}

const SITE_URL = "https://tradehustl3.com";
const STRIPE_WEBHOOK_ROUTE = "/api/stripe/webhook";
const EBOOK_ORDER_STATUS_ROUTE = "/api/ebook-order-status";
const EBOOK_DOWNLOAD_ROUTE = "/api/ebook-download";
const EBOOK_OBJECT_KEY = "TRADE-HUSTL3-COMPLETE-EBOOK.pdf";
export const EBOOK_RELEASE_AT = Date.parse("2026-09-15T04:00:00Z");
const EBOOK_LAUNCH_BATCH_SIZE = 25;
const EBOOK_LAUNCH_LEASE_SECONDS = 10 * 60;
const encoder = new TextEncoder();

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function toBase64Url(value: ArrayBuffer): string {
  const bytes = new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
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

export async function verifyStripeSignature(payload: string, header: string, secret: string): Promise<boolean> {
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

async function sendEbookDeliveryEmail(env: EbookStripeEnv, email: string, downloadUrl: string): Promise<void> {
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
            <p style="font-size:13px;line-height:1.6;color:#9cabb5">Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color:#d6a52a">${SUPPORT_EMAIL}</a></p>
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

async function sendEbookPreorderConfirmationEmail(env: EbookStripeEnv, email: string): Promise<void> {
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
            <p style="font-size:13px;line-height:1.6;color:#9cabb5">Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color:#d6a52a">${SUPPORT_EMAIL}</a></p>
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

export async function runEbookLaunchDelivery(env: EbookStripeEnv): Promise<void> {
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

    const stillDeliverable = await env.DB.prepare(
      `SELECT stripe_session_id
       FROM ebook_orders
       WHERE stripe_session_id = ?
         AND status = 'paid'
         AND launch_emailed_at IS NULL
         AND launch_email_lease_until = ?`,
    ).bind(order.stripe_session_id, leaseUntil).first<{ stripe_session_id: string }>();
    if (!stillDeliverable) continue;

    const downloadUrl = `${SITE_URL}${EBOOK_DOWNLOAD_ROUTE}?token=${encodeURIComponent(order.download_token)}`;
    try {
      await sendEbookDeliveryEmail(env, order.email, downloadUrl);
      await env.DB.prepare(
        `UPDATE ebook_orders
         SET launch_emailed_at = CURRENT_TIMESTAMP, launch_email_lease_until = NULL, emailed_at = COALESCE(emailed_at, CURRENT_TIMESTAMP)
         WHERE stripe_session_id = ? AND status = 'paid'`,
      ).bind(order.stripe_session_id).run();
    } catch (error) {
      await env.DB.prepare(
        "UPDATE ebook_orders SET launch_email_lease_until = NULL WHERE stripe_session_id = ? AND launch_emailed_at IS NULL",
      ).bind(order.stripe_session_id).run();
      console.error("eBook launch delivery failed", order.stripe_session_id, error);
    }
  }
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

async function reconcileEbookRefund(
  env: EbookStripeEnv,
  stripeSessionId: string,
  paymentIntentId: string,
  amountTotal: number,
  currency: string,
): Promise<void> {
  const pending = await env.DB.prepare(
    `SELECT MAX(amount_refunded) AS amount_refunded
     FROM ebook_refund_events
     WHERE payment_intent_id = ? AND currency = ?`,
  ).bind(paymentIntentId, currency).first<{ amount_refunded: number | null }>();
  const amountRefunded = pending?.amount_refunded ?? 0;
  if (amountRefunded <= 0) return;

  await env.DB.prepare(
    `UPDATE ebook_orders
     SET amount_refunded = MAX(amount_refunded, ?),
         status = CASE WHEN MAX(amount_refunded, ?) >= amount_total THEN 'refunded' ELSE status END,
         refunded_at = CASE WHEN MAX(amount_refunded, ?) >= amount_total THEN COALESCE(refunded_at, CURRENT_TIMESTAMP) ELSE refunded_at END
     WHERE stripe_session_id = ?
       AND stripe_payment_intent_id = ?
       AND amount_total = ?
       AND currency = ?`,
  ).bind(
    amountRefunded,
    amountRefunded,
    amountRefunded,
    stripeSessionId,
    paymentIntentId,
    amountTotal,
    currency,
  ).run();
}

async function fulfillPaidEbookSession(session: Record<string, unknown>, env: EbookStripeEnv): Promise<Response> {
  const customerDetails = objectRecord(session.customer_details);
  const sessionId = typeof session.id === "string" ? session.id : "";
  const paymentLinkId = typeof session.payment_link === "string" ? session.payment_link : "";
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : "";
  const emailValue = customerDetails?.email ?? session.customer_email;
  const email = typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
  const amountTotal = session.amount_total;
  const currency = typeof session.currency === "string" ? session.currency.toLowerCase() : "";
  const expectedPaymentLink = env.STRIPE_EBOOK_PAYMENT_LINK_ID?.trim() || "";

  if (
    !sessionId || !paymentIntentId || paymentLinkId !== expectedPaymentLink || session.payment_status !== "paid" ||
    amountTotal !== DIRECT_EBOOK_PRODUCT.priceCents || currency !== DIRECT_EBOOK_PRODUCT.stripeCurrency || !isValidEmail(email)
  ) {
    console.error(JSON.stringify({ message: "Stripe eBook checkout did not match the configured product." }));
    return jsonResponse({ received: true });
  }

  try {
    const downloadToken = randomDownloadToken();
    await env.DB.prepare(
      `INSERT OR IGNORE INTO ebook_orders
       (stripe_session_id, email, payment_link_id, stripe_payment_intent_id, amount_total,
        amount_refunded, currency, status, download_token)
       VALUES (?, ?, ?, ?, ?, 0, ?, 'paid', ?)`,
    ).bind(sessionId, email, paymentLinkId, paymentIntentId, amountTotal, currency, downloadToken).run();

    await env.DB.prepare(
      `UPDATE ebook_orders
       SET stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, ?)
       WHERE stripe_session_id = ?
         AND (stripe_payment_intent_id IS NULL OR stripe_payment_intent_id = ?)`,
    ).bind(paymentIntentId, sessionId, paymentIntentId).run();

    await reconcileEbookRefund(env, sessionId, paymentIntentId, amountTotal, currency);

    const order = await env.DB.prepare(
      `SELECT email, download_token, emailed_at, launch_emailed_at, status, stripe_payment_intent_id
       FROM ebook_orders WHERE stripe_session_id = ?`,
    ).bind(sessionId).first<{
      email: string;
      download_token: string;
      emailed_at: string | null;
      launch_emailed_at: string | null;
      status: string;
      stripe_payment_intent_id: string | null;
    }>();

    if (!order?.download_token || order.stripe_payment_intent_id !== paymentIntentId) {
      throw new Error("The paid eBook order could not be stored safely.");
    }
    if (order.status !== "paid") return jsonResponse({ received: true });

    if (Date.now() < EBOOK_RELEASE_AT) {
      if (!order.emailed_at) {
        await sendEbookPreorderConfirmationEmail(env, order.email || email);
        await env.DB.prepare(
          "UPDATE ebook_orders SET emailed_at = CURRENT_TIMESTAMP WHERE stripe_session_id = ? AND status = 'paid'",
        ).bind(sessionId).run();
      }
    } else if (!order.launch_emailed_at) {
      const downloadUrl = `${SITE_URL}${EBOOK_DOWNLOAD_ROUTE}?token=${encodeURIComponent(order.download_token)}`;
      await sendEbookDeliveryEmail(env, order.email || email, downloadUrl);
      await env.DB.prepare(
        `UPDATE ebook_orders
         SET emailed_at = COALESCE(emailed_at, CURRENT_TIMESTAMP),
             launch_emailed_at = CURRENT_TIMESTAMP,
             launch_email_lease_until = NULL
         WHERE stripe_session_id = ? AND status = 'paid'`,
      ).bind(sessionId).run();
    }

    return jsonResponse({ received: true });
  } catch (error) {
    console.error(JSON.stringify({
      message: "Stripe eBook fulfillment failed",
      error: error instanceof Error ? error.message : "Unknown error",
    }));
    return jsonResponse({ received: false }, 500);
  }
}

async function recordEbookRefund(eventId: string, charge: Record<string, unknown>, env: EbookStripeEnv): Promise<Response> {
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : "";
  const amountTotal = charge.amount;
  const amountRefunded = charge.amount_refunded;
  const currency = typeof charge.currency === "string" ? charge.currency.toLowerCase() : "";

  if (
    !eventId || !paymentIntentId || amountTotal !== DIRECT_EBOOK_PRODUCT.priceCents ||
    typeof amountRefunded !== "number" || !Number.isSafeInteger(amountRefunded) ||
    amountRefunded <= 0 || amountRefunded > amountTotal || currency !== "usd"
  ) {
    console.error(JSON.stringify({ message: "Stripe eBook refund did not match the configured product." }));
    return jsonResponse({ received: true });
  }

  try {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO ebook_refund_events
       (event_id, payment_intent_id, amount_refunded, currency)
       VALUES (?, ?, ?, ?)`,
    ).bind(eventId, paymentIntentId, amountRefunded, currency).run();

    await env.DB.prepare(
      `UPDATE ebook_orders
       SET amount_refunded = MAX(amount_refunded, ?),
           status = CASE WHEN MAX(amount_refunded, ?) >= amount_total THEN 'refunded' ELSE status END,
           refunded_at = CASE WHEN MAX(amount_refunded, ?) >= amount_total THEN COALESCE(refunded_at, CURRENT_TIMESTAMP) ELSE refunded_at END,
           launch_email_lease_until = CASE WHEN MAX(amount_refunded, ?) >= amount_total THEN NULL ELSE launch_email_lease_until END
       WHERE stripe_payment_intent_id = ?
         AND amount_total = ?
         AND currency = ?`,
    ).bind(
      amountRefunded,
      amountRefunded,
      amountRefunded,
      amountRefunded,
      paymentIntentId,
      amountTotal,
      currency,
    ).run();

    return jsonResponse({ received: true });
  } catch (error) {
    console.error(JSON.stringify({
      message: "Stripe eBook refund processing failed",
      error: error instanceof Error ? error.message : "Unknown error",
    }));
    return jsonResponse({ received: false }, 500);
  }
}

function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function handleStripeWebhook(request: Request, env: EbookStripeEnv): Promise<Response> {
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

  let event: unknown;
  try {
    event = JSON.parse(payload);
  } catch {
    return jsonResponse({ received: false }, 400);
  }

  const eventRecord = objectRecord(event);
  const eventType = typeof eventRecord?.type === "string" ? eventRecord.type : "";
  const eventId = typeof eventRecord?.id === "string" ? eventRecord.id : "";
  const data = objectRecord(eventRecord?.data);
  const stripeObject = objectRecord(data?.object);
  if (!stripeObject) return jsonResponse({ received: true });

  if (eventType === "charge.refunded") return recordEbookRefund(eventId, stripeObject, env);
  if (eventType === "checkout.session.completed" || eventType === "checkout.session.async_payment_succeeded") {
    return fulfillPaidEbookSession(stripeObject, env);
  }
  return jsonResponse({ received: true });
}

async function servePurchasedEbook(request: Request, env: EbookStripeEnv): Promise<Response> {
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

async function getEbookOrderStatus(request: Request, env: EbookStripeEnv): Promise<Response> {
  if (request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET" } });
  }
  if (!env.DB) return jsonResponse({ ok: false, verified: false }, 503);
  const sessionId = new URL(request.url).searchParams.get("session_id")?.trim() ?? "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return jsonResponse({ ok: true, verified: false });

  const order = await env.DB.prepare(
    `SELECT stripe_session_id
     FROM ebook_orders
     WHERE stripe_session_id = ?
       AND status = 'paid'
       AND amount_total = ?
       AND currency = ?
       AND stripe_payment_intent_id IS NOT NULL
       AND download_token IS NOT NULL
     LIMIT 1`,
  ).bind(
    sessionId,
    DIRECT_EBOOK_PRODUCT.priceCents,
    DIRECT_EBOOK_PRODUCT.stripeCurrency,
  ).first<{ stripe_session_id: string }>();
  if (!order) return jsonResponse({ ok: true, verified: false });
  return jsonResponse({
    ok: true,
    verified: true,
    transactionId: order.stripe_session_id,
    contentName: DIRECT_EBOOK_PRODUCT.contentName,
    value: DIRECT_EBOOK_PRODUCT.value,
    currency: DIRECT_EBOOK_PRODUCT.currency,
  });
}

export async function handleEbookStripeRoute(request: Request, env: EbookStripeEnv): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  if (pathname === EBOOK_ORDER_STATUS_ROUTE) return getEbookOrderStatus(request, env);
  if (pathname === STRIPE_WEBHOOK_ROUTE) return handleStripeWebhook(request, env);
  if (pathname === EBOOK_DOWNLOAD_ROUTE) return servePurchasedEbook(request, env);
  return null;
}
