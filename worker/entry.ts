import baseWorker from "./index";
import {
  fulfillResumeStripeSession,
  handleResumeAccess,
  handleResumeCheckout,
  handleResumeOrderStatus,
  type ResumePaymentsEnv,
} from "./resume-payments";

const RESUME_LEGACY_ROUTE = "/resume";
const RESUME_CHECKOUT_ROUTE = "/api/resume/checkout";
const RESUME_ORDER_STATUS_ROUTE = "/api/resume/order-status";
const RESUME_ACCESS_ROUTE = "/api/resume/access";
const STRIPE_WEBHOOK_ROUTE = "/api/stripe/webhook";
const encoder = new TextEncoder();

type BaseEnv = Parameters<typeof baseWorker.fetch>[1];
type BaseCtx = Parameters<typeof baseWorker.fetch>[2];
type Env = BaseEnv & ResumePaymentsEnv & { STRIPE_WEBHOOK_SECRET?: string };

type StripeEvent = {
  type?: unknown;
  data?: {
    object?: {
      id?: unknown;
      payment_status?: unknown;
      amount_total?: unknown;
      currency?: unknown;
      customer_email?: unknown;
      customer_details?: { email?: unknown } | null;
      metadata?: Record<string, unknown> | null;
    };
  };
};

function hexToBytes(value: string): Uint8Array | null {
  if (!/^[a-f0-9]+$/i.test(value) || value.length % 2 !== 0) return null;
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (pair) => Number.parseInt(pair, 16));
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
    const bytes = hexToBytes(signature);
    if (bytes && await crypto.subtle.verify("HMAC", key, new Uint8Array(bytes).buffer, signedPayload)) return true;
  }
  return false;
}

const worker = {
  async fetch(request: Request, env: Env, ctx: BaseCtx): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === RESUME_LEGACY_ROUTE) {
      url.pathname = "/resume-builder";
      return Response.redirect(url.toString(), 302);
    }

    if (url.pathname === RESUME_CHECKOUT_ROUTE) {
      return handleResumeCheckout(request, env);
    }

    if (url.pathname === RESUME_ORDER_STATUS_ROUTE) {
      return handleResumeOrderStatus(request, env);
    }

    if (url.pathname === RESUME_ACCESS_ROUTE) {
      return handleResumeAccess(request, env);
    }

    if (url.pathname === STRIPE_WEBHOOK_ROUTE && request.method === "POST") {
      const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim() || "";
      if (!webhookSecret) {
        return Response.json({ received: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
      }

      const baseRequest = request.clone();
      const signature = request.headers.get("Stripe-Signature") || "";
      const payload = await request.text();
      if (!await verifyStripeSignature(payload, signature, webhookSecret)) {
        return Response.json({ received: false }, { status: 400, headers: { "Cache-Control": "no-store" } });
      }

      let event: StripeEvent;
      try {
        event = JSON.parse(payload) as StripeEvent;
      } catch {
        return Response.json({ received: false }, { status: 400, headers: { "Cache-Control": "no-store" } });
      }

      const metadata = event.data?.object?.metadata;
      if (event.type === "checkout.session.completed" && metadata?.product === "resume_builder") {
        try {
          await fulfillResumeStripeSession(event.data?.object, env);
          return Response.json({ received: true }, { headers: { "Cache-Control": "no-store" } });
        } catch (error) {
          console.error("Resume Builder Stripe fulfillment failed", error);
          return Response.json({ received: false }, { status: 500, headers: { "Cache-Control": "no-store" } });
        }
      }

      return baseWorker.fetch(baseRequest, env, ctx);
    }

    return baseWorker.fetch(request, env, ctx);
  },
};

export default worker;
