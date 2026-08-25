import { createResumeDocx, createResumePdf, GeneratedResume } from "./resume-documents";

export interface ResumeBuilderEnv {
  DB: D1Database;
  BOOKS?: R2Bucket;
  BREVO_API_KEY?: string;
  BREVO_SAMPLE_SENDER_EMAIL?: string;
  BREVO_AUTH_SENDER_EMAIL?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_RESUME_PRICE_ID?: string;
  STRIPE_RESUME_WEBHOOK_SECRET?: string;
  ANTHROPIC_API_KEY?: string;
  CLAUDE_MODEL?: string;
}

type AuthenticatedUser = {
  userId: string;
  email: string;
  fullName: string | null;
  sessionHash: string;
};

type D1MutationResult = {
  meta?: { changes?: number };
};

type ResumeRecord = {
  resume_id: string;
  user_id: string;
  trade: string;
  title: string;
  intake_json: string;
  generated_json: string | null;
  target_job_posting: string | null;
  status: string;
};

type EntitlementRecord = {
  entitlement_id: string;
  credits_total: number;
  credits_used: number;
  status: string;
};

const SITE_URL = "https://tradehustl3.com";
const SESSION_COOKIE_NAME = "tradehustl3_resume_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;
const MAGIC_LINK_TTL_SECONDS = 60 * 20;
const RESUME_PRICE_CENTS = 999;
const RESUME_PLAN = "resume_mvp_999";
const RESUME_TOTAL_AI_RUNS = 4;
const DEFAULT_CLAUDE_MODEL = "claude-sonnet-5";
const encoder = new TextEncoder();

const ALLOWED_TRADES = new Set([
  "HVAC & Refrigeration",
  "Electrical",
  "Plumbing",
  "Construction & Carpentry",
  "Facilities Maintenance",
  "Welding & Fabrication",
  "General Labor / Trade Helper",
]);

function json(body: Record<string, unknown>, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Cache-Control", "no-store");
  responseHeaders.set("Content-Type", "application/json; charset=utf-8");
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  responseHeaders.set("Referrer-Policy", "no-referrer");
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

function methodNotAllowed(allowed: string): Response {
  return json({ ok: false, message: "Method not allowed." }, 405, { Allow: allowed });
}

function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256Hex(value: string | Uint8Array): Promise<string> {
  const input = typeof value === "string" ? encoder.encode(value) : value;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", Uint8Array.from(input).buffer));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function requestIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP")?.trim() || "unknown";
}

function hasTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  try {
    const parsedOrigin = new URL(origin).origin;
    return parsedOrigin === SITE_URL || parsedOrigin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function parseJsonBody(request: Request, maxBytes = 50_000): Promise<Record<string, unknown> | null> {
  const declaredLength = Number(request.headers.get("Content-Length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) return null;
  try {
    const text = await request.text();
    if (!text || text.length > maxBytes) return null;
    const value = JSON.parse(text) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function cookieValue(request: Request, name: string): string {
  const cookies = request.headers.get("Cookie")?.split(";") ?? [];
  for (const cookie of cookies) {
    const [key, ...value] = cookie.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}

async function checkRateLimit(
  env: ResumeBuilderEnv,
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const windowStart = Math.floor(nowSeconds() / windowSeconds) * windowSeconds;
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

async function requireUser(request: Request, env: ResumeBuilderEnv): Promise<AuthenticatedUser | null> {
  const rawSession = cookieValue(request, SESSION_COOKIE_NAME);
  if (!/^[A-Za-z0-9_-]{43}$/.test(rawSession)) return null;
  const sessionHash = await sha256Hex(rawSession);
  const row = await env.DB.prepare(
    `SELECT s.user_id, u.email, u.full_name
     FROM sessions s
     JOIN users u ON u.user_id = s.user_id
     WHERE s.session_hash = ?
       AND s.revoked_at IS NULL
       AND s.expires_at > ?`,
  ).bind(sessionHash, nowSeconds()).first<{ user_id: string; email: string; full_name: string | null }>();
  if (!row) return null;
  return { userId: row.user_id, email: row.email, fullName: row.full_name, sessionHash };
}

async function sendMagicLinkEmail(env: ResumeBuilderEnv, email: string, confirmationUrl: string): Promise<void> {
  const apiKey = env.BREVO_API_KEY?.trim();
  if (!apiKey) throw new Error("Brevo authentication email is not configured.");
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
        email: env.BREVO_AUTH_SENDER_EMAIL?.trim()
          || env.BREVO_SAMPLE_SENDER_EMAIL?.trim()
          || "updates@tradehustl3.com",
      },
      to: [{ email }],
      subject: "Confirm your TRADE HUSTL3 Resume Builder sign-in",
      htmlContent: `
        <div style="background:#071a2b;padding:32px;font-family:Arial,sans-serif;color:#f4f0e7">
          <div style="max-width:620px;margin:auto">
            <p style="color:#d6a52a;font-weight:700;letter-spacing:2px">ENTER. EARN. ELEVATE.</p>
            <h1 style="margin:16px 0;color:#ffffff">Confirm your Resume Builder sign-in.</h1>
            <p style="font-size:16px;line-height:1.6;color:#c5ced5">Open the confirmation page below, then press the confirmation button. The extra confirmation step keeps automated email security scanners from signing in as you.</p>
            <p style="margin:28px 0"><a href="${confirmationUrl}" style="display:inline-block;background:#d71920;color:#ffffff;padding:16px 22px;text-decoration:none;font-weight:700">OPEN CONFIRMATION PAGE</a></p>
            <p style="font-size:13px;line-height:1.6;color:#9cabb5">This link expires in 20 minutes and can only be used once.</p>
          </div>
        </div>`,
    }),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    console.error("Resume Builder magic-link delivery failed", response.status, detail);
    throw new Error("Magic-link delivery failed.");
  }
}

async function requestMagicLink(request: Request, env: ResumeBuilderEnv): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed("POST");
  if (!hasTrustedOrigin(request)) return json({ ok: false, message: "Request origin rejected." }, 403);
  const body = await parseJsonBody(request, 5_000);
  const email = normalizeEmail(body?.email);
  const fullName = cleanText(body?.fullName, 120) || null;
  const generic = { ok: true, message: "If that email can be used, a confirmation link is on its way." };
  if (!isValidEmail(email)) return json(generic);

  const emailBucket = await sha256Hex(email);
  const ipBucket = await sha256Hex(requestIp(request));
  const [emailAllowed, ipAllowed] = await Promise.all([
    checkRateLimit(env, `auth-email:${emailBucket}`, 3, 15 * 60),
    checkRateLimit(env, `auth-ip:${ipBucket}`, 12, 15 * 60),
  ]);
  if (!emailAllowed || !ipAllowed) return json(generic);

  const proposedUserId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO users (user_id, email, full_name)
     VALUES (?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET
       full_name = COALESCE(excluded.full_name, users.full_name)`,
  ).bind(proposedUserId, email, fullName).run();
  const resolvedUser = await env.DB.prepare("SELECT user_id FROM users WHERE email = ?")
    .bind(email).first<{ user_id: string }>();
  if (!resolvedUser?.user_id) throw new Error("The Resume Builder account could not be stored.");
  const userId = resolvedUser.user_id;
  const rawToken = randomToken();
  const tokenHash = await sha256Hex(rawToken);

  await env.DB.batch([
    env.DB.prepare("DELETE FROM auth_tokens WHERE user_id = ? AND purpose = 'login'").bind(userId),
    env.DB.prepare(
      `INSERT INTO auth_tokens (token_hash, user_id, purpose, expires_at)
       VALUES (?, ?, 'login', ?)`,
    ).bind(tokenHash, userId, nowSeconds() + MAGIC_LINK_TTL_SECONDS),
  ]);

  const confirmationUrl = `${SITE_URL}/resume-builder/confirm?token=${encodeURIComponent(rawToken)}`;
  try {
    await sendMagicLinkEmail(env, email, confirmationUrl);
  } catch (error) {
    console.error("Resume Builder magic-link request failed", error);
  }
  return json(generic);
}

async function confirmMagicLink(request: Request, env: ResumeBuilderEnv): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed("POST");
  if (!hasTrustedOrigin(request)) return json({ ok: false, message: "Request origin rejected." }, 403);
  const body = await parseJsonBody(request, 3_000);
  const rawToken = cleanText(body?.token, 200);
  if (!/^[A-Za-z0-9_-]{43}$/.test(rawToken)) {
    return json({ ok: false, message: "This confirmation link is invalid or expired." }, 400);
  }
  const tokenHash = await sha256Hex(rawToken);
  const token = await env.DB.prepare(
    `SELECT user_id FROM auth_tokens
     WHERE token_hash = ? AND purpose = 'login' AND consumed_at IS NULL AND expires_at > ?`,
  ).bind(tokenHash, nowSeconds()).first<{ user_id: string }>();
  if (!token) return json({ ok: false, message: "This confirmation link is invalid or expired." }, 400);

  const consumed = await env.DB.prepare(
    "UPDATE auth_tokens SET consumed_at = CURRENT_TIMESTAMP WHERE token_hash = ? AND consumed_at IS NULL",
  ).bind(tokenHash).run() as D1MutationResult;
  if ((consumed.meta?.changes ?? 0) !== 1) {
    return json({ ok: false, message: "This confirmation link has already been used." }, 400);
  }

  const rawSession = randomToken();
  const sessionHash = await sha256Hex(rawSession);
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO sessions (session_hash, user_id, expires_at) VALUES (?, ?, ?)",
    ).bind(sessionHash, token.user_id, nowSeconds() + SESSION_TTL_SECONDS),
    env.DB.prepare("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE user_id = ?").bind(token.user_id),
  ]);
  const user = await env.DB.prepare("SELECT email, full_name FROM users WHERE user_id = ?")
    .bind(token.user_id).first<{ email: string; full_name: string | null }>();

  return json(
    { ok: true, user: { email: user?.email ?? "", fullName: user?.full_name ?? null } },
    200,
    {
      "Set-Cookie": `${SESSION_COOKIE_NAME}=${encodeURIComponent(rawSession)}; Max-Age=${SESSION_TTL_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`,
    },
  );
}

async function getCurrentUser(request: Request, env: ResumeBuilderEnv): Promise<Response> {
  if (request.method !== "GET") return methodNotAllowed("GET");
  const user = await requireUser(request, env);
  if (!user) return json({ ok: false, authenticated: false }, 401);
  return json({ ok: true, authenticated: true, user: { email: user.email, fullName: user.fullName } });
}

async function logout(request: Request, env: ResumeBuilderEnv): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed("POST");
  if (!hasTrustedOrigin(request)) return json({ ok: false, message: "Request origin rejected." }, 403);
  const user = await requireUser(request, env);
  if (user) {
    await env.DB.prepare("UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE session_hash = ?")
      .bind(user.sessionHash).run();
  }
  return json({ ok: true }, 200, {
    "Set-Cookie": `${SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`,
  });
}

async function createResume(request: Request, env: ResumeBuilderEnv): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed("POST");
  if (!hasTrustedOrigin(request)) return json({ ok: false, message: "Request origin rejected." }, 403);
  const user = await requireUser(request, env);
  if (!user) return json({ ok: false, message: "Sign in to continue." }, 401);
  const body = await parseJsonBody(request);
  const trade = cleanText(body?.trade, 80);
  const title = cleanText(body?.title, 120) || `${trade} Resume`;
  const targetJobPosting = cleanText(body?.targetJobPosting, 12_000) || null;
  const intake = body?.intake;
  if (!ALLOWED_TRADES.has(trade) || !intake || typeof intake !== "object" || Array.isArray(intake)) {
    return json({ ok: false, message: "Choose a supported trade and complete the intake." }, 400);
  }
  const intakeJson = JSON.stringify(intake);
  if (intakeJson.length > 40_000) return json({ ok: false, message: "The intake is too large." }, 413);
  const resumeId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO resumes (resume_id, user_id, trade, title, intake_json, target_job_posting, status)
     VALUES (?, ?, ?, ?, ?, ?, 'draft')`,
  ).bind(resumeId, user.userId, trade, title, intakeJson, targetJobPosting).run();
  return json({ ok: true, resumeId, status: "draft", price: { amount: RESUME_PRICE_CENTS, currency: "usd" } }, 201);
}

async function findOwnedResume(env: ResumeBuilderEnv, resumeId: string, userId: string): Promise<ResumeRecord | null> {
  return env.DB.prepare(
    `SELECT resume_id, user_id, trade, title, intake_json, generated_json, target_job_posting, status
     FROM resumes WHERE resume_id = ? AND user_id = ? AND deleted_at IS NULL`,
  ).bind(resumeId, userId).first<ResumeRecord>();
}

async function findEntitlement(env: ResumeBuilderEnv, resumeId: string, userId: string): Promise<EntitlementRecord | null> {
  return env.DB.prepare(
    `SELECT entitlement_id, credits_total, credits_used, status
     FROM entitlements
     WHERE resume_id = ? AND user_id = ? AND status = 'active'
       AND (access_expires_at IS NULL OR access_expires_at > ?)
     ORDER BY created_at DESC LIMIT 1`,
  ).bind(resumeId, userId, nowSeconds()).first<EntitlementRecord>();
}

async function getResumeStatus(request: Request, env: ResumeBuilderEnv, resumeId: string): Promise<Response> {
  if (request.method !== "GET") return methodNotAllowed("GET");
  const user = await requireUser(request, env);
  if (!user) return json({ ok: false, message: "Sign in to continue." }, 401);
  const resume = await findOwnedResume(env, resumeId, user.userId);
  if (!resume) return json({ ok: false, message: "Resume not found." }, 404);
  const entitlement = await findEntitlement(env, resumeId, user.userId);
  const generated = Boolean(resume.generated_json);
  return json({
    ok: true,
    resume: {
      resumeId,
      trade: resume.trade,
      title: resume.title,
      status: resume.status,
      paid: Boolean(entitlement),
      runsUsed: entitlement?.credits_used ?? 0,
      runsTotal: entitlement?.credits_total ?? RESUME_TOTAL_AI_RUNS,
      correctionsRemaining: generated && entitlement
        ? Math.max(0, entitlement.credits_total - entitlement.credits_used)
        : generated ? 0 : 3,
      previewUrl: generated ? `/api/resume-builder/resumes/${resumeId}/files/preview` : null,
      downloads: generated ? {
        pdf: `/api/resume-builder/resumes/${resumeId}/files/pdf`,
        docx: `/api/resume-builder/resumes/${resumeId}/files/docx`,
      } : null,
    },
  });
}

async function createCheckout(request: Request, env: ResumeBuilderEnv, resumeId: string): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed("POST");
  if (!hasTrustedOrigin(request)) return json({ ok: false, message: "Request origin rejected." }, 403);
  const user = await requireUser(request, env);
  if (!user) return json({ ok: false, message: "Sign in to continue." }, 401);
  const resume = await findOwnedResume(env, resumeId, user.userId);
  if (!resume) return json({ ok: false, message: "Resume not found." }, 404);
  if (await findEntitlement(env, resumeId, user.userId)) {
    return json({ ok: false, message: "This resume is already paid." }, 409);
  }

  const stripeKey = env.STRIPE_SECRET_KEY?.trim();
  const priceId = env.STRIPE_RESUME_PRICE_ID?.trim();
  if (!stripeKey || !priceId) return json({ ok: false, message: "Checkout is temporarily unavailable." }, 503);

  const ipBucket = await sha256Hex(requestIp(request));
  if (!await checkRateLimit(env, `checkout:${ipBucket}`, 10, 15 * 60)) {
    return json({ ok: false, message: "Too many checkout attempts. Try again shortly." }, 429);
  }

  const orderId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO resume_orders
     (order_id, user_id, resume_id, email, plan, amount_total, currency, status)
     VALUES (?, ?, ?, ?, ?, ?, 'usd', 'pending')`,
  ).bind(orderId, user.userId, resumeId, user.email, RESUME_PLAN, RESUME_PRICE_CENTS).run();

  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("line_items[0][price]", priceId);
  form.set("line_items[0][quantity]", "1");
  form.set("customer_email", user.email);
  form.set("client_reference_id", orderId);
  form.set("success_url", `${SITE_URL}/resume-builder/payment-confirmed?resume_id=${encodeURIComponent(resumeId)}&session_id={CHECKOUT_SESSION_ID}`);
  form.set("cancel_url", `${SITE_URL}/resume-builder/intake?resume_id=${encodeURIComponent(resumeId)}`);
  form.set("metadata[product]", "resume_builder_mvp");
  form.set("metadata[order_id]", orderId);
  form.set("metadata[resume_id]", resumeId);
  form.set("metadata[user_id]", user.userId);
  form.set("payment_intent_data[metadata][product]", "resume_builder_mvp");
  form.set("payment_intent_data[metadata][order_id]", orderId);

  let stripeResponse: Response;
  try {
    stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": `resume-order-${orderId}`,
      },
      body: form,
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    console.error("Resume Builder Stripe checkout request failed", error);
    await env.DB.prepare("UPDATE resume_orders SET status = 'failed' WHERE order_id = ?").bind(orderId).run();
    return json({ ok: false, message: "Checkout is temporarily unavailable." }, 503);
  }
  const stripe = await stripeResponse.json() as { id?: unknown; url?: unknown; error?: { message?: unknown } };
  if (!stripeResponse.ok || typeof stripe.id !== "string" || typeof stripe.url !== "string") {
    console.error("Resume Builder Stripe checkout failed", stripeResponse.status, cleanText(stripe.error?.message, 200));
    await env.DB.prepare("UPDATE resume_orders SET status = 'failed' WHERE order_id = ?").bind(orderId).run();
    return json({ ok: false, message: "Checkout is temporarily unavailable." }, 503);
  }
  await env.DB.prepare("UPDATE resume_orders SET stripe_session_id = ? WHERE order_id = ?")
    .bind(stripe.id, orderId).run();
  return json({ ok: true, checkoutUrl: stripe.url });
}

function hexToBytes(value: string): Uint8Array | null {
  if (!/^[a-f0-9]+$/i.test(value) || value.length % 2 !== 0) return null;
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (pair) => Number.parseInt(pair, 16));
}

async function verifyStripeSignature(payload: string, header: string, secret: string): Promise<boolean> {
  const fields = header.split(",").map((field) => field.trim().split("=", 2));
  const timestampValue = fields.find(([key]) => key === "t")?.[1] ?? "";
  const timestamp = Number.parseInt(timestampValue, 10);
  const signatures = fields.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!Number.isSafeInteger(timestamp) || Math.abs(nowSeconds() - timestamp) > 300 || !signatures.length) return false;
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
    if (bytes && await crypto.subtle.verify("HMAC", key, Uint8Array.from(bytes).buffer, signedPayload)) return true;
  }
  return false;
}

type ResumeCheckoutSession = {
  id?: unknown;
  client_reference_id?: unknown;
  payment_status?: unknown;
  amount_total?: unknown;
  currency?: unknown;
  payment_intent?: unknown;
  customer?: unknown;
  customer_email?: unknown;
  customer_details?: { email?: unknown } | null;
  metadata?: Record<string, unknown> | null;
};

async function handleResumeStripeWebhook(request: Request, env: ResumeBuilderEnv): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed("POST");
  const secret = env.STRIPE_RESUME_WEBHOOK_SECRET?.trim();
  if (!secret) return json({ received: false }, 503);
  const payload = await request.text();
  const signature = request.headers.get("Stripe-Signature") || "";
  if (!await verifyStripeSignature(payload, signature, secret)) return json({ received: false }, 400);

  let event: { id?: unknown; type?: unknown; data?: { object?: ResumeCheckoutSession } };
  try {
    event = JSON.parse(payload) as typeof event;
  } catch {
    return json({ received: false }, 400);
  }
  if (event.type !== "checkout.session.completed") return json({ received: true });
  const session = event.data?.object;
  const eventId = typeof event.id === "string" ? event.id : "";
  const sessionId = typeof session?.id === "string" ? session.id : "";
  const orderId = typeof session?.client_reference_id === "string" ? session.client_reference_id : "";
  const metadata = session?.metadata ?? {};
  const metadataOrderId = typeof metadata.order_id === "string" ? metadata.order_id : "";
  const resumeId = typeof metadata.resume_id === "string" ? metadata.resume_id : "";
  const userId = typeof metadata.user_id === "string" ? metadata.user_id : "";
  const paymentIntent = typeof session?.payment_intent === "string" ? session.payment_intent : null;
  const stripeCustomer = typeof session?.customer === "string" ? session.customer : null;
  const emailValue = session?.customer_details?.email ?? session?.customer_email;
  const email = normalizeEmail(emailValue);

  if (
    !eventId || !sessionId || !orderId || metadataOrderId !== orderId || !resumeId || !userId
    || metadata.product !== "resume_builder_mvp"
    || session?.payment_status !== "paid"
    || session.amount_total !== RESUME_PRICE_CENTS
    || session.currency !== "usd"
    || !isValidEmail(email)
  ) {
    console.error("Resume Builder Stripe event did not match the MVP product.");
    return json({ received: true });
  }

  const order = await env.DB.prepare(
    `SELECT order_id, user_id, resume_id, email, amount_total, currency, status
     FROM resume_orders WHERE order_id = ?`,
  ).bind(orderId).first<{
    order_id: string;
    user_id: string;
    resume_id: string;
    email: string;
    amount_total: number;
    currency: string;
    status: string;
  }>();
  if (
    !order || order.user_id !== userId || order.resume_id !== resumeId || order.email !== email
    || order.amount_total !== RESUME_PRICE_CENTS || order.currency !== "usd"
  ) {
    console.error("Resume Builder Stripe event did not match a server-created order.");
    return json({ received: true });
  }

  const entitlementId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO stripe_events (event_id, type) VALUES (?, ?)")
      .bind(eventId, String(event.type)),
    env.DB.prepare(
      `UPDATE resume_orders SET
         status = 'paid', stripe_session_id = ?, stripe_payment_intent_id = ?, paid_at = CURRENT_TIMESTAMP
       WHERE order_id = ?`,
    ).bind(sessionId, paymentIntent, orderId),
    env.DB.prepare(
      `INSERT INTO entitlements
       (entitlement_id, user_id, resume_id, kind, plan, status, credits_total, credits_used,
        source_order_id, stripe_customer_id)
       VALUES (?, ?, ?, 'one_time', ?, 'active', ?, 0, ?, ?)
       ON CONFLICT(source_order_id) DO NOTHING`,
    ).bind(entitlementId, userId, resumeId, RESUME_PLAN, RESUME_TOTAL_AI_RUNS, orderId, stripeCustomer),
  ]);
  return json({ received: true });
}

function stringArray(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map((item) => cleanText(item, maxLength)).filter(Boolean);
}

function validateGeneratedResume(value: unknown): GeneratedResume | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const root = value as Record<string, unknown>;
  const basicsValue = root.basics;
  if (!basicsValue || typeof basicsValue !== "object" || Array.isArray(basicsValue)) return null;
  const basics = basicsValue as Record<string, unknown>;
  const fullName = cleanText(basics.fullName, 120);
  const targetTitle = cleanText(basics.targetTitle, 120);
  const summary = cleanText(root.summary, 1_800);
  const skills = stringArray(root.skills, 24, 100);
  if (!fullName || !targetTitle || !summary || !skills.length) return null;

  const certifications = Array.isArray(root.certifications)
    ? root.certifications.slice(0, 16).flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const record = item as Record<string, unknown>;
      const name = cleanText(record.name, 160);
      return name ? [{
        name,
        issuer: cleanText(record.issuer, 160) || undefined,
        year: cleanText(record.year, 40) || undefined,
      }] : [];
    })
    : [];
  const experience = Array.isArray(root.experience)
    ? root.experience.slice(0, 12).flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const record = item as Record<string, unknown>;
      const jobTitle = cleanText(record.jobTitle, 160);
      const employer = cleanText(record.employer, 160);
      const bullets = stringArray(record.bullets, 10, 500);
      return jobTitle && employer && bullets.length ? [{
        jobTitle,
        employer,
        location: cleanText(record.location, 120) || undefined,
        startDate: cleanText(record.startDate, 50) || undefined,
        endDate: cleanText(record.endDate, 50) || undefined,
        bullets,
      }] : [];
    })
    : [];
  const education = Array.isArray(root.education)
    ? root.education.slice(0, 10).flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const record = item as Record<string, unknown>;
      const credential = cleanText(record.credential, 160);
      const institution = cleanText(record.institution, 160);
      return credential && institution ? [{
        credential,
        institution,
        location: cleanText(record.location, 120) || undefined,
        year: cleanText(record.year, 40) || undefined,
      }] : [];
    })
    : [];
  if (!experience.length) return null;
  return {
    basics: {
      fullName,
      targetTitle,
      location: cleanText(basics.location, 160) || undefined,
      phone: cleanText(basics.phone, 80) || undefined,
      email: normalizeEmail(basics.email) || undefined,
    },
    summary,
    skills,
    certifications,
    experience,
    education,
    additionalInformation: stringArray(root.additionalInformation, 12, 300),
  };
}

function unsupportedNumbers(generated: GeneratedResume, source: string): string[] {
  const sourceNumbers = new Set(source.match(/\d+(?:\.\d+)?/g) ?? []);
  return Array.from(new Set(JSON.stringify(generated).match(/\d+(?:\.\d+)?/g) ?? []))
    .filter((number) => !sourceNumbers.has(number));
}

function resumeSystemPrompt(): string {
  return `You are the TRADE HUSTL3 skilled-trades resume engine. Build an ATS-friendly resume for one of the seven supported trade tracks.

Truth and safety rules:
- Candidate facts may come only from the customer's intake.
- Use the target job posting only to prioritize relevant wording and keywords. Never treat its requirements as facts about the customer.
- Never invent employers, dates, certifications, licenses, tools, metrics, education, job duties, leadership, or years of experience.
- You may improve wording and organize facts, but you may not add factual claims.
- Do not use first-person pronouns.
- Use concise, natural trade language and strong action verbs.
- Return valid JSON only. No markdown and no commentary.

Required JSON shape:
{"basics":{"fullName":"","targetTitle":"","location":"","phone":"","email":""},"summary":"","skills":[""],"certifications":[{"name":"","issuer":"","year":""}],"experience":[{"jobTitle":"","employer":"","location":"","startDate":"","endDate":"","bullets":[""]}],"education":[{"credential":"","institution":"","location":"","year":""}],"additionalInformation":[""]}

Use empty arrays for unsupported optional sections. Every experience bullet must be supported by the intake.`;
}

async function callClaude(
  env: ResumeBuilderEnv,
  resume: ResumeRecord,
  correctionRequest: string | null,
): Promise<{ resume: GeneratedResume; inputTokens: number; outputTokens: number; guardFlags: string[] }> {
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("Claude is not configured.");
  const model = env.CLAUDE_MODEL?.trim() || DEFAULT_CLAUDE_MODEL;
  const intake = JSON.parse(resume.intake_json) as unknown;
  const prior = resume.generated_json ? JSON.parse(resume.generated_json) as unknown : null;
  const userPrompt = correctionRequest
    ? `Revise the current resume using only the requested correction and the original intake. Preserve all accurate content not affected by the correction.\n\nORIGINAL INTAKE:\n${JSON.stringify(intake)}\n\nTARGET JOB POSTING:\n${resume.target_job_posting ?? ""}\n\nCURRENT RESUME:\n${JSON.stringify(prior)}\n\nCUSTOMER CORRECTION:\n${correctionRequest}`
    : `Create the paid resume from this intake.\n\nTRADE TRACK:\n${resume.trade}\n\nORIGINAL INTAKE:\n${JSON.stringify(intake)}\n\nTARGET JOB POSTING:\n${resume.target_job_posting ?? ""}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 5_000,
      system: resumeSystemPrompt(),
      messages: [{ role: "user", content: userPrompt }],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const payload = await response.json() as {
    content?: Array<{ type?: unknown; text?: unknown }>;
    usage?: { input_tokens?: unknown; output_tokens?: unknown };
    error?: { message?: unknown };
  };
  if (!response.ok) {
    console.error("Claude resume generation failed", response.status, cleanText(payload.error?.message, 240));
    throw new Error("Claude resume generation failed.");
  }
  const raw = payload.content?.filter((item) => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text as string).join("\n") ?? "";
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Claude returned an invalid resume format.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    throw new Error("Claude returned invalid JSON.");
  }
  const generated = validateGeneratedResume(parsed);
  if (!generated) throw new Error("Claude returned an incomplete resume.");
  const source = resume.intake_json;
  const guardFlags = unsupportedNumbers(generated, source);
  if (guardFlags.length) throw new Error("Claude introduced unsupported numeric claims.");
  return {
    resume: generated,
    inputTokens: typeof payload.usage?.input_tokens === "number" ? payload.usage.input_tokens : 0,
    outputTokens: typeof payload.usage?.output_tokens === "number" ? payload.usage.output_tokens : 0,
    guardFlags,
  };
}

async function storeResumeFile(
  env: ResumeBuilderEnv,
  userId: string,
  resumeId: string,
  format: "pdf" | "docx" | "preview",
  bytes: Uint8Array,
): Promise<D1PreparedStatement> {
  if (!env.BOOKS) throw new Error("Resume file storage is unavailable.");
  const extension = format === "docx" ? "docx" : "pdf";
  const objectKey = `resume-builder/${userId}/${resumeId}/${format}.${extension}`;
  const contentType = format === "docx"
    ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    : "application/pdf";
  await env.BOOKS.put(objectKey, bytes, { httpMetadata: { contentType } });
  const digest = await sha256Hex(bytes);
  return env.DB.prepare(
    `INSERT INTO resume_files
     (file_id, resume_id, user_id, format, object_key, byte_size, sha256)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(file_id) DO UPDATE SET
       object_key = excluded.object_key,
       byte_size = excluded.byte_size,
       sha256 = excluded.sha256,
       created_at = CURRENT_TIMESTAMP`,
  ).bind(`${resumeId}:${format}`, resumeId, userId, format, objectKey, bytes.byteLength, digest);
}

async function generateResume(request: Request, env: ResumeBuilderEnv, resumeId: string): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed("POST");
  if (!hasTrustedOrigin(request)) return json({ ok: false, message: "Request origin rejected." }, 403);
  const user = await requireUser(request, env);
  if (!user) return json({ ok: false, message: "Sign in to continue." }, 401);
  const resume = await findOwnedResume(env, resumeId, user.userId);
  if (!resume) return json({ ok: false, message: "Resume not found." }, 404);
  const entitlement = await findEntitlement(env, resumeId, user.userId);
  if (!entitlement) return json({ ok: false, message: "Complete the $9.99 payment before generating." }, 402);

  const body = await parseJsonBody(request, 8_000);
  const correctionRequest = cleanText(body?.correctionRequest, 2_000) || null;
  const isCorrection = Boolean(resume.generated_json);
  if (isCorrection && !correctionRequest) {
    return json({ ok: false, message: "Describe the correction you want made." }, 400);
  }
  if (!isCorrection && correctionRequest) {
    return json({ ok: false, message: "Create the initial resume before requesting corrections." }, 400);
  }

  const reserved = await env.DB.prepare(
    `UPDATE entitlements SET credits_used = credits_used + 1, updated_at = CURRENT_TIMESTAMP
     WHERE entitlement_id = ? AND status = 'active' AND credits_used < credits_total`,
  ).bind(entitlement.entitlement_id).run() as D1MutationResult;
  if ((reserved.meta?.changes ?? 0) !== 1) {
    return json({ ok: false, message: "All permitted AI runs have been used." }, 409);
  }

  const generationId = crypto.randomUUID();
  const model = env.CLAUDE_MODEL?.trim() || DEFAULT_CLAUDE_MODEL;
  try {
    const generated = await callClaude(env, resume, correctionRequest);
    const [docx, pdf, preview] = await Promise.all([
      createResumeDocx(generated.resume),
      createResumePdf(generated.resume, false),
      createResumePdf(generated.resume, true),
    ]);
    const fileStatements = await Promise.all([
      storeResumeFile(env, user.userId, resumeId, "docx", docx),
      storeResumeFile(env, user.userId, resumeId, "pdf", pdf),
      storeResumeFile(env, user.userId, resumeId, "preview", preview),
    ]);
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE resumes SET generated_json = ?, status = 'ready', generated_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP WHERE resume_id = ? AND user_id = ?`,
      ).bind(JSON.stringify(generated.resume), resumeId, user.userId),
      env.DB.prepare(
        `INSERT INTO resume_generations
         (generation_id, resume_id, user_id, mode, model, input_tokens, output_tokens, guard_flags, outcome)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ok')`,
      ).bind(
        generationId,
        resumeId,
        user.userId,
        isCorrection ? "correction" : "generate",
        model,
        generated.inputTokens,
        generated.outputTokens,
        JSON.stringify(generated.guardFlags),
      ),
      ...fileStatements,
    ]);
    const runsUsed = entitlement.credits_used + 1;
    return json({
      ok: true,
      resumeId,
      status: "ready",
      runNumber: runsUsed,
      runsTotal: RESUME_TOTAL_AI_RUNS,
      correctionsRemaining: Math.max(0, RESUME_TOTAL_AI_RUNS - runsUsed),
      previewUrl: `/api/resume-builder/resumes/${resumeId}/files/preview`,
      downloads: {
        pdf: `/api/resume-builder/resumes/${resumeId}/files/pdf`,
        docx: `/api/resume-builder/resumes/${resumeId}/files/docx`,
      },
    });
  } catch (error) {
    console.error("Resume generation pipeline failed", error);
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE entitlements SET credits_used = CASE WHEN credits_used > 0 THEN credits_used - 1 ELSE 0 END,
         updated_at = CURRENT_TIMESTAMP WHERE entitlement_id = ?`,
      ).bind(entitlement.entitlement_id),
      env.DB.prepare(
        `INSERT INTO resume_generations
         (generation_id, resume_id, user_id, mode, model, guard_flags, outcome)
         VALUES (?, ?, ?, ?, ?, ?, 'error')`,
      ).bind(
        generationId,
        resumeId,
        user.userId,
        isCorrection ? "correction" : "generate",
        model,
        JSON.stringify([error instanceof Error ? error.message : "unknown_error"]),
      ),
    ]);
    return json({ ok: false, message: "We could not generate the resume. Your AI run was restored." }, 502);
  }
}

async function serveResumeFile(
  request: Request,
  env: ResumeBuilderEnv,
  resumeId: string,
  format: string,
): Promise<Response> {
  if (request.method !== "GET") return methodNotAllowed("GET");
  if (!new Set(["pdf", "docx", "preview"]).has(format)) return json({ ok: false, message: "File not found." }, 404);
  const user = await requireUser(request, env);
  if (!user) return json({ ok: false, message: "Sign in to continue." }, 401);
  const resume = await findOwnedResume(env, resumeId, user.userId);
  if (!resume || !await findEntitlement(env, resumeId, user.userId)) {
    return json({ ok: false, message: "File not found." }, 404);
  }
  const file = await env.DB.prepare(
    `SELECT object_key FROM resume_files WHERE resume_id = ? AND user_id = ? AND format = ?
     ORDER BY created_at DESC LIMIT 1`,
  ).bind(resumeId, user.userId, format).first<{ object_key: string }>();
  if (!file || !env.BOOKS) return json({ ok: false, message: "File not found." }, 404);
  const object = await env.BOOKS.get(file.object_key);
  if (!object) return json({ ok: false, message: "File not found." }, 404);

  const isDocx = format === "docx";
  const isPreview = format === "preview";
  const filename = isDocx ? "TRADE-HUSTL3-Resume.docx" : "TRADE-HUSTL3-Resume.pdf";
  const headers = new Headers();
  headers.set("Content-Type", isDocx
    ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    : "application/pdf");
  headers.set("Content-Disposition", `${isPreview ? "inline" : "attachment"}; filename="${filename}"`);
  headers.set("Cache-Control", "private, no-store");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return new Response(object.body, { status: 200, headers });
}

export async function handleResumeBuilderRoute(
  request: Request,
  env: ResumeBuilderEnv,
): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  if (!pathname.startsWith("/api/resume-builder/")) return null;
  if (!env.DB) return json({ ok: false, message: "Resume Builder is temporarily unavailable." }, 503);

  try {
    if (pathname === "/api/resume-builder/auth/request") return requestMagicLink(request, env);
    if (pathname === "/api/resume-builder/auth/confirm") return confirmMagicLink(request, env);
    if (pathname === "/api/resume-builder/auth/logout") return logout(request, env);
    if (pathname === "/api/resume-builder/me") return getCurrentUser(request, env);
    if (pathname === "/api/resume-builder/resumes") return createResume(request, env);
    if (pathname === "/api/resume-builder/stripe/webhook") return handleResumeStripeWebhook(request, env);

    const checkoutMatch = pathname.match(/^\/api\/resume-builder\/resumes\/([^/]+)\/checkout$/);
    if (checkoutMatch) return createCheckout(request, env, checkoutMatch[1]);
    const generationMatch = pathname.match(/^\/api\/resume-builder\/resumes\/([^/]+)\/generate$/);
    if (generationMatch) return generateResume(request, env, generationMatch[1]);
    const fileMatch = pathname.match(/^\/api\/resume-builder\/resumes\/([^/]+)\/files\/(pdf|docx|preview)$/);
    if (fileMatch) return serveResumeFile(request, env, fileMatch[1], fileMatch[2]);
    const resumeMatch = pathname.match(/^\/api\/resume-builder\/resumes\/([^/]+)$/);
    if (resumeMatch) return getResumeStatus(request, env, resumeMatch[1]);
    return json({ ok: false, message: "Route not found." }, 404);
  } catch (error) {
    console.error("Resume Builder request failed", error);
    return json({ ok: false, message: "Resume Builder is temporarily unavailable." }, 500);
  }
}
