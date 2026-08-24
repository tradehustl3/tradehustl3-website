export interface ResumePaymentsEnv {
  DB: D1Database;
  STRIPE_SECRET_KEY?: string;
}

const SITE_URL = "https://tradehustl3.com";
const RESUME_PRODUCT = "resume_builder";
const RESUME_ACCESS_COOKIE = "tradehustl3_resume_access";
const SINGLE_PRICE = 900;
const BUNDLE_PRICE = 1500;

export type ResumePlan = "single" | "bundle";

type StripeCheckoutSession = {
  id?: unknown;
  payment_status?: unknown;
  amount_total?: unknown;
  currency?: unknown;
  customer_email?: unknown;
  customer_details?: { email?: unknown } | null;
  metadata?: Record<string, unknown> | null;
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePlan(value: unknown): ResumePlan | null {
  return value === "single" || value === "bundle" ? value : null;
}

function priceForPlan(plan: ResumePlan): number {
  return plan === "bundle" ? BUNDLE_PRICE : SINGLE_PRICE;
}

function nameForPlan(plan: ResumePlan): string {
  return plan === "bundle"
    ? "TRADE HUSTL3 Resume Builder Bundle"
    : "TRADE HUSTL3 Resume Builder — Single Resume";
}

function randomAccessToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function cookieValue(request: Request, name: string): string {
  const cookies = request.headers.get("Cookie")?.split(";") ?? [];
  for (const cookie of cookies) {
    const [key, ...value] = cookie.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}

async function createStripeCheckoutSession(
  secretKey: string,
  order: { orderId: string; email: string; plan: ResumePlan; amount: number },
): Promise<{ id: string; url: string }> {
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("customer_email", order.email);
  body.set("client_reference_id", order.orderId);
  body.set("success_url", `${SITE_URL}/resume/order-confirmed?session_id={CHECKOUT_SESSION_ID}`);
  body.set("cancel_url", `${SITE_URL}/resume-builder?checkout=cancelled`);
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", "usd");
  body.set("line_items[0][price_data][unit_amount]", String(order.amount));
  body.set("line_items[0][price_data][product_data][name]", nameForPlan(order.plan));
  body.set("metadata[product]", RESUME_PRODUCT);
  body.set("metadata[order_id]", order.orderId);
  body.set("metadata[plan]", order.plan);
  body.set("payment_intent_data[metadata][product]", RESUME_PRODUCT);
  body.set("payment_intent_data[metadata][order_id]", order.orderId);
  body.set("payment_intent_data[metadata][plan]", order.plan);

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = await response.json() as { id?: unknown; url?: unknown; error?: { message?: unknown } };
  if (!response.ok || typeof payload.id !== "string" || typeof payload.url !== "string") {
    const message = typeof payload.error?.message === "string" ? payload.error.message : `Stripe returned ${response.status}.`;
    throw new Error(message);
  }

  return { id: payload.id, url: payload.url };
}

export async function handleResumeCheckout(request: Request, env: ResumePaymentsEnv): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
  }

  const secretKey = env.STRIPE_SECRET_KEY?.trim() || "";
  if (!secretKey || !env.DB) {
    return jsonResponse({ ok: false, message: "Resume checkout is temporarily unavailable." }, 503);
  }

  let body: { email?: unknown; plan?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return jsonResponse({ ok: false, message: "Invalid checkout request." }, 400);
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const plan = normalizePlan(body.plan);
  if (!isValidEmail(email) || !plan) {
    return jsonResponse({ ok: false, message: "Enter a valid email and choose a Resume Builder option." }, 400);
  }

  const orderId = crypto.randomUUID();
  const amount = priceForPlan(plan);

  try {
    await env.DB.prepare(
      `INSERT INTO resume_orders
       (order_id, email, plan, amount_total, currency, status)
       VALUES (?, ?, ?, ?, 'usd', 'pending')`,
    ).bind(orderId, email, plan, amount).run();

    const session = await createStripeCheckoutSession(secretKey, { orderId, email, plan, amount });

    await env.DB.prepare(
      "UPDATE resume_orders SET stripe_session_id = ? WHERE order_id = ? AND status = 'pending'",
    ).bind(session.id, orderId).run();

    return jsonResponse({ ok: true, checkoutUrl: session.url });
  } catch (error) {
    console.error("Resume checkout creation failed", error);
    await env.DB.prepare(
      "UPDATE resume_orders SET status = 'checkout_error' WHERE order_id = ? AND status = 'pending'",
    ).bind(orderId).run().catch(() => undefined);
    return jsonResponse({ ok: false, message: "We couldn't start checkout. Please try again." }, 502);
  }
}

export async function handleResumeOrderStatus(request: Request, env: ResumePaymentsEnv): Promise<Response> {
  if (request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET" } });
  }
  if (!env.DB) return jsonResponse({ ok: false }, 503);

  const sessionId = new URL(request.url).searchParams.get("session_id")?.trim() || "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return jsonResponse({ ok: false, paid: false }, 400);
  }

  const order = await env.DB.prepare(
    `SELECT plan, status, access_token
     FROM resume_orders
     WHERE stripe_session_id = ?`,
  ).bind(sessionId).first<{ plan: ResumePlan; status: string; access_token: string | null }>();

  if (!order) return jsonResponse({ ok: true, paid: false, status: "pending" });
  if (order.status !== "paid" || !order.access_token) {
    return jsonResponse({ ok: true, paid: false, status: order.status });
  }

  return Response.json(
    { ok: true, paid: true, status: "paid", plan: order.plan },
    {
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": `${RESUME_ACCESS_COOKIE}=${encodeURIComponent(order.access_token)}; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Lax`,
      },
    },
  );
}

export async function handleResumeAccess(request: Request, env: ResumePaymentsEnv): Promise<Response> {
  if (request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET" } });
  }
  if (!env.DB) return jsonResponse({ ok: false, paid: false }, 503);

  const token = cookieValue(request, RESUME_ACCESS_COOKIE);
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return jsonResponse({ ok: true, paid: false }, 200);
  }

  const order = await env.DB.prepare(
    `SELECT plan, status FROM resume_orders
     WHERE access_token = ? AND status = 'paid'`,
  ).bind(token).first<{ plan: ResumePlan; status: string }>();

  if (!order) return jsonResponse({ ok: true, paid: false }, 200);
  return jsonResponse({ ok: true, paid: true, plan: order.plan });
}

export async function fulfillResumeStripeSession(
  session: StripeCheckoutSession | undefined,
  env: ResumePaymentsEnv,
): Promise<boolean> {
  const metadata = session?.metadata ?? null;
  if (metadata?.product !== RESUME_PRODUCT) return false;

  const sessionId = typeof session?.id === "string" ? session.id : "";
  const orderId = typeof metadata?.order_id === "string" ? metadata.order_id : "";
  const plan = normalizePlan(metadata?.plan);
  const emailValue = session?.customer_details?.email ?? session?.customer_email;
  const email = typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
  const amount = plan ? priceForPlan(plan) : -1;
  const currency = typeof session?.currency === "string" ? session.currency.toLowerCase() : "";

  if (
    !sessionId || !orderId || !plan || session?.payment_status !== "paid" ||
    session?.amount_total !== amount || currency !== "usd" || !isValidEmail(email)
  ) {
    console.error("Resume Stripe session failed validation.");
    return true;
  }

  const existing = await env.DB.prepare(
    `SELECT email, plan, amount_total, currency, status, access_token
     FROM resume_orders WHERE order_id = ? AND stripe_session_id = ?`,
  ).bind(orderId, sessionId).first<{
    email: string;
    plan: ResumePlan;
    amount_total: number;
    currency: string;
    status: string;
    access_token: string | null;
  }>();

  if (
    !existing || existing.email !== email || existing.plan !== plan ||
    existing.amount_total !== amount || existing.currency !== "usd"
  ) {
    console.error("Resume Stripe session did not match its D1 order.");
    return true;
  }

  if (existing.status === "paid" && existing.access_token) return true;

  const accessToken = existing.access_token || randomAccessToken();
  await env.DB.prepare(
    `UPDATE resume_orders
     SET status = 'paid', access_token = ?, paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP)
     WHERE order_id = ? AND stripe_session_id = ?`,
  ).bind(accessToken, orderId, sessionId).run();

  return true;
}
