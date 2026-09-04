import { createResumeDocx, createResumePdf, GeneratedResume, ResumeTheme } from "./resume-documents";

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
  RESUME_AI_BRIDGE_URL?: string;
  RESUME_AI_BRIDGE_SECRET?: string;
  GEMINI_MODEL?: string;
  RESUME_AI_PROVIDER?: string;
}

export interface ResumeBuilderDependencies {
  anthropicFetch?: typeof fetch;
  geminiFetch?: typeof fetch;
  createDocx?: typeof createResumeDocx;
  createPdf?: typeof createResumePdf;
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
  theme: string;
};

const RESUME_THEMES: ReadonlySet<string> = new Set(["plain", "navy"]);

function normalizeTheme(value: unknown): ResumeTheme {
  return typeof value === "string" && RESUME_THEMES.has(value) ? value as ResumeTheme : "plain";
}

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
const INITIAL_PREVIEW_RUNS = 1;
const DEFAULT_CLAUDE_MODEL = "claude-sonnet-5";
const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
const GEMINI_MAX_OUTPUT_TOKENS = 2_200;
const INTAKE_PATH = "/resume-builder/intake";
// The guided intake collects an unbounded number of work-history roles plus
// structured field-value groups. These bounds stay well within Worker limits
// while allowing a realistic multi-role trades resume.
const MAX_INTAKE_JSON_CHARS = 120_000;
const MAX_RESUME_BODY_BYTES = 160_000;
const encoder = new TextEncoder();

export type ResumeFailureCode =
  | "INTAKE_INFORMATION_REQUIRED"
  | "UNSUPPORTED_NUMERIC_CLAIM"
  | "MODEL_OUTPUT_ERROR"
  | "DOCUMENT_RENDER_ERROR"
  | "FILE_STORAGE_ERROR"
  | "GENERATION_ERROR";

export type ResumeFailureAction = "return_to_intake" | "retry_generation";

type NumericGuardSection =
  | "contact information"
  | "career summary"
  | "skills and tools"
  | "certifications and training"
  | "work history"
  | "work dates"
  | "education"
  | "additional information";

export type UnsupportedNumericClaim = {
  section: NumericGuardSection;
  token: string;
};

const NON_RETRYABLE_FAILURES: ReadonlySet<ResumeFailureCode> = new Set([
  "INTAKE_INFORMATION_REQUIRED",
  "UNSUPPORTED_NUMERIC_CLAIM",
]);

const INTAKE_CORRECTION_MESSAGE =
  "We need a little more information to build your resume safely. Return to your intake "
  + "and add or correct the highlighted details. No AI run was used.";

const RETRY_MESSAGE =
  "No AI run was used. Please try generating the resume again.";

export const INTAKE_SECTION = {
  contact: "contact information",
  targetTitle: "target job title",
  summary: "career summary",
  substance: "work history, training, certifications, or skills",
  numbers: "measurable results, dates, and quantities",
} as const;

export class ResumeGenerationError extends Error {
  readonly code: ResumeFailureCode;
  readonly missing: string[];
  readonly guardTelemetry: Record<string, unknown> | null;

  constructor(
    code: ResumeFailureCode,
    message: string,
    missing: string[] = [],
    guardTelemetry: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = "ResumeGenerationError";
    this.code = code;
    this.missing = missing;
    this.guardTelemetry = guardTelemetry;
  }
}

function isRetryableFailure(code: ResumeFailureCode): boolean {
  return !NON_RETRYABLE_FAILURES.has(code);
}

function failureAction(code: ResumeFailureCode): ResumeFailureAction {
  return NON_RETRYABLE_FAILURES.has(code) ? "return_to_intake" : "retry_generation";
}

function failureMessage(code: ResumeFailureCode): string {
  return NON_RETRYABLE_FAILURES.has(code) ? INTAKE_CORRECTION_MESSAGE : RETRY_MESSAGE;
}

function failureStatus(code: ResumeFailureCode): number {
  return NON_RETRYABLE_FAILURES.has(code) ? 422 : 502;
}

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
     ON CONFLICT(email) DO NOTHING`,
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

type ValidatedResumeInput = {
  trade: string;
  title: string;
  targetJobPosting: string | null;
  intakeJson: string;
  theme: ResumeTheme;
};

function validateResumeInput(body: Record<string, unknown> | null):
  | { ok: true; value: ValidatedResumeInput }
  | { ok: false; response: Response } {
  const trade = cleanText(body?.trade, 80);
  const title = cleanText(body?.title, 120) || `${trade} Resume`;
  const targetJobPosting = cleanText(body?.targetJobPosting, 12_000) || null;
  const intake = body?.intake;
  if (!ALLOWED_TRADES.has(trade) || !intake || typeof intake !== "object" || Array.isArray(intake)) {
    return {
      ok: false,
      response: json({ ok: false, message: "Choose a supported trade and complete the intake." }, 400),
    };
  }
  const intakeJson = JSON.stringify(intake);
  if (intakeJson.length > MAX_INTAKE_JSON_CHARS) {
    return { ok: false, response: json({ ok: false, message: "The intake is too large." }, 413) };
  }
  const theme = normalizeTheme(body?.theme);
  return { ok: true, value: { trade, title, targetJobPosting, intakeJson, theme } };
}

async function createResume(request: Request, env: ResumeBuilderEnv): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed("POST");
  if (!hasTrustedOrigin(request)) return json({ ok: false, message: "Request origin rejected." }, 403);
  const user = await requireUser(request, env);
  if (!user) return json({ ok: false, message: "Sign in to continue." }, 401);
  const parsed = validateResumeInput(await parseJsonBody(request, MAX_RESUME_BODY_BYTES));
  if (!parsed.ok) return parsed.response;
  const { trade, title, targetJobPosting, intakeJson, theme } = parsed.value;
  const resumeId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO resumes (resume_id, user_id, trade, title, intake_json, target_job_posting, theme, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')`,
  ).bind(resumeId, user.userId, trade, title, intakeJson, targetJobPosting, theme).run();
  return json({ ok: true, resumeId, status: "draft", price: { amount: RESUME_PRICE_CENTS, currency: "usd" } }, 201);
}

async function findOwnedResume(env: ResumeBuilderEnv, resumeId: string, userId: string): Promise<ResumeRecord | null> {
  return env.DB.prepare(
    `SELECT resume_id, user_id, trade, title, intake_json, generated_json, target_job_posting, status, theme
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
  let intake: unknown = {};
  try {
    intake = JSON.parse(resume.intake_json) as unknown;
  } catch {
    return json({ ok: false, message: "The saved intake could not be loaded." }, 500);
  }
  return json({
    ok: true,
    resume: {
      resumeId,
      trade: resume.trade,
      title: resume.title,
      intake,
      targetJobPosting: resume.target_job_posting,
      status: resume.status,
      theme: normalizeTheme(resume.theme),
      paid: Boolean(entitlement),
      runsUsed: entitlement?.credits_used ?? (generated ? INITIAL_PREVIEW_RUNS : 0),
      runsTotal: entitlement?.credits_total ?? RESUME_TOTAL_AI_RUNS,
      correctionsRemaining: generated && entitlement
        ? Math.max(0, entitlement.credits_total - entitlement.credits_used)
        : 0,
      previewUrl: generated ? `/api/resume-builder/resumes/${resumeId}/files/preview` : null,
      downloads: generated && entitlement ? {
        pdf: `/api/resume-builder/resumes/${resumeId}/files/pdf`,
        docx: `/api/resume-builder/resumes/${resumeId}/files/docx`,
      } : null,
    },
  });
}

async function updateResume(request: Request, env: ResumeBuilderEnv, resumeId: string): Promise<Response> {
  if (request.method !== "PUT" && request.method !== "PATCH") return methodNotAllowed("GET, PUT, PATCH");
  if (!hasTrustedOrigin(request)) return json({ ok: false, message: "Request origin rejected." }, 403);
  const user = await requireUser(request, env);
  if (!user) return json({ ok: false, message: "Sign in to continue." }, 401);
  const resume = await findOwnedResume(env, resumeId, user.userId);
  if (!resume) return json({ ok: false, message: "Resume not found." }, 404);
  const entitlement = await findEntitlement(env, resumeId, user.userId);

  const body = await parseJsonBody(request, MAX_RESUME_BODY_BYTES);
  // A style-only change (from the review page's template picker) skips the
  // full trade/intake validation — it is not a content edit.
  const themeOnly = body !== null && !("trade" in body) && !("intake" in body) && "theme" in body;
  if (themeOnly) {
    if (!RESUME_THEMES.has(String(body.theme))) {
      return json({ ok: false, message: "Choose a supported resume style." }, 400);
    }
    const theme = normalizeTheme(body.theme);
    await env.DB.prepare(
      `UPDATE resumes SET theme = ?, updated_at = CURRENT_TIMESTAMP
       WHERE resume_id = ? AND user_id = ? AND deleted_at IS NULL`,
    ).bind(theme, resumeId, user.userId).run();
    return json({ ok: true, resumeId, status: resume.status, paid: Boolean(entitlement), theme });
  }

  const parsed = validateResumeInput(body);
  if (!parsed.ok) return parsed.response;
  const { trade, title, targetJobPosting, intakeJson } = parsed.value;
  const theme = body !== null && "theme" in body ? parsed.value.theme : normalizeTheme(resume.theme);
  await env.DB.prepare(
    `UPDATE resumes SET trade = ?, title = ?, intake_json = ?, target_job_posting = ?, theme = ?,
       updated_at = CURRENT_TIMESTAMP
     WHERE resume_id = ? AND user_id = ? AND deleted_at IS NULL`,
  ).bind(trade, title, intakeJson, targetJobPosting, theme, resumeId, user.userId).run();
  return json({ ok: true, resumeId, status: resume.status, paid: Boolean(entitlement), theme });
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
  if (!resume.generated_json) {
    return json({ ok: false, message: "Generate and review the watermarked preview before checkout." }, 409);
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
  form.set("cancel_url", `${SITE_URL}/resume-builder/review?resume_id=${encodeURIComponent(resumeId)}`);
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

type ResumeRefundedCharge = {
  id?: unknown;
  amount?: unknown;
  amount_refunded?: unknown;
  currency?: unknown;
  payment_intent?: unknown;
  metadata?: Record<string, unknown> | null;
};

type ResumeStripeEvent = {
  id?: unknown;
  type?: unknown;
  data?: { object?: unknown };
};

function stripeEventStatement(env: ResumeBuilderEnv, eventId: string, eventType: string) {
  return env.DB.prepare("INSERT OR IGNORE INTO stripe_events (event_id, type) VALUES (?, ?)")
    .bind(eventId, eventType);
}

async function handleResumeRefund(
  env: ResumeBuilderEnv,
  eventId: string,
  eventType: string,
  object: unknown,
): Promise<Response> {
  const charge = (object && typeof object === "object" && !Array.isArray(object)
    ? object
    : {}) as ResumeRefundedCharge;
  const amount = typeof charge.amount === "number" ? charge.amount : -1;
  const amountRefunded = typeof charge.amount_refunded === "number" ? charge.amount_refunded : -1;
  const currency = typeof charge.currency === "string" ? charge.currency.toLowerCase() : "";
  const paymentIntent = typeof charge.payment_intent === "string" ? charge.payment_intent : "";
  const metadata = charge.metadata ?? {};
  const metadataOrderId = typeof metadata.order_id === "string" ? metadata.order_id : "";
  const metadataProduct = typeof metadata.product === "string" ? metadata.product : "";

  if (
    !paymentIntent || amount !== RESUME_PRICE_CENTS || amountRefunded < 0 || currency !== "usd"
    || (metadataProduct && metadataProduct !== "resume_builder_mvp")
  ) {
    await stripeEventStatement(env, eventId, eventType).run();
    console.error("Resume Builder refund event did not match the MVP product.");
    return json({ received: true });
  }

  const order = await env.DB.prepare(
    `SELECT order_id, amount_total, currency, status, stripe_payment_intent_id
     FROM resume_orders
     WHERE stripe_payment_intent_id = ?
        OR (order_id = ? AND stripe_payment_intent_id IS NULL)
     LIMIT 1`,
  ).bind(paymentIntent, metadataOrderId).first<{
    order_id: string;
    amount_total: number;
    currency: string;
    status: string;
    stripe_payment_intent_id: string | null;
  }>();
  if (
    !order || order.amount_total !== RESUME_PRICE_CENTS || order.currency !== "usd"
    || (order.stripe_payment_intent_id && order.stripe_payment_intent_id !== paymentIntent)
    || (metadataOrderId && metadataOrderId !== order.order_id)
  ) {
    await stripeEventStatement(env, eventId, eventType).run();
    console.error("Resume Builder refund event did not match a server-created order.");
    return json({ received: true });
  }

  // charge.amount_refunded is cumulative across sequential partial refunds.
  // Keep access active until the entire original charge has been refunded.
  if (amountRefunded < amount) {
    await stripeEventStatement(env, eventId, eventType).run();
    return json({ received: true });
  }

  await env.DB.batch([
    stripeEventStatement(env, eventId, eventType),
    env.DB.prepare(
      `UPDATE resume_orders SET status = 'refunded', stripe_payment_intent_id = ?
       WHERE order_id = ?`,
    ).bind(paymentIntent, order.order_id),
    env.DB.prepare(
      `UPDATE entitlements SET status = 'revoked', updated_at = CURRENT_TIMESTAMP
       WHERE source_order_id = ? AND status = 'active'`,
    ).bind(order.order_id),
  ]);
  return json({ received: true });
}

async function handleResumeStripeWebhook(request: Request, env: ResumeBuilderEnv): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed("POST");
  const secret = env.STRIPE_RESUME_WEBHOOK_SECRET?.trim();
  if (!secret) return json({ received: false }, 503);
  const payload = await request.text();
  const signature = request.headers.get("Stripe-Signature") || "";
  if (!await verifyStripeSignature(payload, signature, secret)) return json({ received: false }, 400);

  let event: ResumeStripeEvent;
  try {
    event = JSON.parse(payload) as ResumeStripeEvent;
  } catch {
    return json({ received: false }, 400);
  }
  const eventId = typeof event.id === "string" ? event.id : "";
  const eventType = typeof event.type === "string" ? event.type : "";
  if (!eventId || !eventType) return json({ received: false }, 400);
  if (eventType === "charge.refunded") {
    return handleResumeRefund(env, eventId, eventType, event.data?.object);
  }
  if (eventType !== "checkout.session.completed") {
    await stripeEventStatement(env, eventId, eventType).run();
    return json({ received: true });
  }

  const session = (event.data?.object && typeof event.data.object === "object" && !Array.isArray(event.data.object)
    ? event.data.object
    : {}) as ResumeCheckoutSession;
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
    stripeEventStatement(env, eventId, eventType),
    env.DB.prepare(
      `UPDATE resume_orders SET
         status = CASE WHEN status = 'refunded' THEN 'refunded' ELSE 'paid' END,
         stripe_session_id = ?, stripe_payment_intent_id = ?, paid_at = CURRENT_TIMESTAMP
       WHERE order_id = ?`,
    ).bind(sessionId, paymentIntent, orderId),
    env.DB.prepare(
      `INSERT INTO entitlements
       (entitlement_id, user_id, resume_id, kind, plan, status, credits_total, credits_used,
        source_order_id, stripe_customer_id)
       SELECT ?, ?, ?, 'one_time', ?, 'active', ?, ?, ?, ?
       WHERE EXISTS (
         SELECT 1 FROM resume_orders WHERE order_id = ? AND status = 'paid'
       )
       ON CONFLICT(source_order_id) DO NOTHING`,
    ).bind(
      entitlementId,
      userId,
      resumeId,
      RESUME_PLAN,
      RESUME_TOTAL_AI_RUNS,
      INITIAL_PREVIEW_RUNS,
      orderId,
      stripeCustomer,
      orderId,
    ),
  ]);
  return json({ received: true });
}

function stringArray(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map((item) => cleanText(item, maxLength)).filter(Boolean);
}

export type ResumeValidation =
  | { ok: true; resume: GeneratedResume }
  | { ok: false; missing: string[] };

function substantiveSectionCount(sections: {
  skills: unknown[];
  certifications: unknown[];
  experience: unknown[];
  education: unknown[];
  additionalInformation: unknown[];
}): number {
  return [
    sections.experience.length,
    sections.education.length,
    sections.certifications.length,
    sections.skills.length,
    sections.additionalInformation.length,
  ].filter((count) => count > 0).length;
}

export function validateGeneratedResume(value: unknown): ResumeValidation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, missing: [INTAKE_SECTION.substance] };
  }
  const root = value as Record<string, unknown>;
  const basicsValue = root.basics;
  const basics = (basicsValue && typeof basicsValue === "object" && !Array.isArray(basicsValue)
    ? basicsValue
    : {}) as Record<string, unknown>;
  const fullName = cleanText(basics.fullName, 120);
  const targetTitle = cleanText(basics.targetTitle, 120);
  const summary = cleanText(root.summary, 1_800);
  const skills = stringArray(root.skills, 24, 100);

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
      return jobTitle && bullets.length ? [{
        jobTitle,
        employer: employer || undefined,
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
  const additionalInformation = stringArray(root.additionalInformation, 12, 300);
  const missing: string[] = [];
  if (!fullName) missing.push(INTAKE_SECTION.contact);
  if (!targetTitle) missing.push(INTAKE_SECTION.targetTitle);
  if (!summary) missing.push(INTAKE_SECTION.summary);
  if (substantiveSectionCount({ skills, certifications, experience, education, additionalInformation }) < 2) {
    missing.push(INTAKE_SECTION.substance);
  }
  if (missing.length) return { ok: false, missing };

  return {
    ok: true,
    resume: {
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
      additionalInformation,
    },
  };
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function sourceText(...values: unknown[]): string {
  return values.map((value) => {
    if (typeof value === "string") return value;
    if (value === null || value === undefined) return "";
    return JSON.stringify(value);
  }).join(" ");
}

const MONTH_NUMBERS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
  may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8,
  september: 9, sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11,
  december: 12, dec: 12,
};

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

function addNumericToken(tokens: Set<string>, value: string | number): void {
  const normalized = String(value).replace(/,/g, "").replace(/^0+(?=\d)/, "");
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return;
  tokens.add(normalized);
  const integer = Number(normalized);
  if (Number.isInteger(integer) && integer >= 1900 && integer <= 2099) {
    tokens.add(String(integer).slice(-2).replace(/^0/, ""));
  }
}

function parseNumberWords(words: string[]): number | null {
  if (!words.length) return null;
  if (words.length > 1 && words.every((word) => NUMBER_WORDS[word] >= 0 && NUMBER_WORDS[word] <= 9)) {
    return Number(words.map((word) => NUMBER_WORDS[word]).join(""));
  }
  let total = 0;
  let current = 0;
  for (const word of words) {
    if (word === "hundred") current = Math.max(1, current) * 100;
    else if (word === "thousand") {
      total += Math.max(1, current) * 1_000;
      current = 0;
    } else if (NUMBER_WORDS[word] !== undefined) current += NUMBER_WORDS[word];
    else return null;
  }
  return total + current;
}

function numericTokens(text: string): Set<string> {
  const tokens = new Set<string>();
  for (const match of text.matchAll(/\b\d[\d,]*(?:\.\d+)?\b/g)) addNumericToken(tokens, match[0]);
  for (const match of text.matchAll(/'(\d{2})\b/g)) {
    addNumericToken(tokens, match[1]);
    addNumericToken(tokens, `20${match[1]}`);
  }
  for (const match of text.matchAll(/\b(\d{1,2})[/-](\d{2}|\d{4})\b/g)) {
    addNumericToken(tokens, match[1]);
    addNumericToken(tokens, match[2]);
    if (match[2].length === 2) addNumericToken(tokens, `20${match[2]}`);
  }
  const lower = text.toLowerCase();
  for (const [month, number] of Object.entries(MONTH_NUMBERS)) {
    if (new RegExp(`\\b${month}\\b`).test(lower)) addNumericToken(tokens, number);
  }
  const words = lower.match(/[a-z]+/g) ?? [];
  for (let index = 0; index < words.length;) {
    if (NUMBER_WORDS[words[index]] === undefined && words[index] !== "hundred" && words[index] !== "thousand") {
      index += 1;
      continue;
    }
    const sequence: string[] = [];
    while (
      index < words.length
      && (NUMBER_WORDS[words[index]] !== undefined || words[index] === "hundred" || words[index] === "thousand")
    ) {
      sequence.push(words[index]);
      index += 1;
    }
    const parsed = parseNumberWords(sequence);
    if (parsed !== null) addNumericToken(tokens, parsed);
  }
  return tokens;
}

function generatedNumericSections(generated: GeneratedResume): Record<NumericGuardSection, string> {
  return {
    "contact information": sourceText(generated.basics),
    "career summary": generated.summary,
    "skills and tools": sourceText(generated.skills),
    "certifications and training": sourceText(generated.certifications),
    "work history": sourceText(generated.experience.map((entry) => ({
      jobTitle: entry.jobTitle,
      employer: entry.employer,
      location: entry.location,
      bullets: entry.bullets,
    }))),
    "work dates": sourceText(generated.experience.map(({ startDate, endDate }) => ({ startDate, endDate }))),
    education: sourceText(generated.education),
    "additional information": sourceText(generated.additionalInformation),
  };
}

function intakeNumericSections(
  intake: unknown,
  title: string,
  correctionRequest: string | null,
): Record<NumericGuardSection, string> {
  const root = recordValue(intake);
  const contact = recordValue(root.contact);
  const career = recordValue(root.career);
  // Structured field-value groups from the guided intake. Numbers a customer
  // enters here (license years, cert counts, tool sizes) are their own facts and
  // must not be flagged as invented. Never include the target job posting.
  const fieldValue = recordValue(root.fieldValue);
  const targetJob = recordValue(root.targetJob);
  const experience = Array.isArray(root.experience) ? root.experience : [];
  const workClaims = experience.map((item) => {
    const record = recordValue(item);
    return {
      employer: record.employer,
      jobTitle: record.jobTitle,
      location: record.location,
      employmentType: record.employmentType,
      responsibilitiesAndWins: record.responsibilitiesAndWins,
    };
  });
  // Every free-text detail field a role can carry in the guided intake.
  const workDetails = experience.map((item) => {
    const record = recordValue(item);
    return [
      record.responsibilitiesAndWins,
      record.responsibilities,
      record.equipment,
      record.systems,
      record.workPerformed,
      record.leadership,
      record.workOrders,
      record.measurable,
    ];
  });
  const workDateParts = experience.map((item) => {
    const record = recordValue(item);
    return [record.dates, record.startDate, record.endDate];
  });
  const correction = correctionRequest ?? "";
  return {
    "contact information": sourceText(contact, targetJob, title, correction),
    "career summary": sourceText(career.yearsExperience, career.summaryNotes, workDetails, fieldValue, correction),
    "skills and tools": sourceText(
      career.skillsAndTools,
      career.licensesAndCertifications,
      career.safetyTraining,
      fieldValue,
      correction,
    ),
    "certifications and training": sourceText(
      career.licensesAndCertifications,
      career.safetyTraining,
      fieldValue.certifications,
      fieldValue.licenses,
      fieldValue.safety,
      correction,
    ),
    "work history": sourceText(workClaims, workDetails, career.skillsAndTools, fieldValue, correction),
    "work dates": sourceText(workDateParts, correction),
    education: sourceText(root.education, correction),
    "additional information": sourceText(root.additionalDetails, career.safetyTraining, fieldValue, targetJob, correction),
  };
}

export function unsupportedNumbers(
  generated: GeneratedResume,
  intake: unknown,
  title = "",
  correctionRequest: string | null = null,
): UnsupportedNumericClaim[] {
  const output = generatedNumericSections(generated);
  const sources = intakeNumericSections(intake, title, correctionRequest);
  const unsupported: UnsupportedNumericClaim[] = [];
  for (const section of Object.keys(output) as NumericGuardSection[]) {
    const allowed = numericTokens(sources[section]);
    for (const token of numericTokens(output[section])) {
      if (!allowed.has(token)) unsupported.push({ section, token });
    }
  }
  return unsupported;
}

function resumeSystemPrompt(): string {
  return `You are the TRADE HUSTL3 skilled-trades resume engine. Build a competitive, ATS-friendly resume for one of seven supported trade tracks.

Evidence rules:
- Candidate facts may come only from the customer's intake.
- Use the target job posting only to prioritize relevant wording and keywords. Never treat its requirements as facts about the customer.
- Never invent or infer employers, dates, historical titles, certifications, licenses, tools, metrics, education, duties, leadership, results, scope, or years of experience.
- A desired target title does not prove the candidate previously held that title.
- Do not attach overall years of experience to a specific employer, role, or duty unless the intake dates prove it.
- Preserve official credential names. Put verified certifications and licenses in certifications. Put safety training such as OSHA 10 in additionalInformation unless the intake explicitly identifies it as a certification.
- Do not add classifications to named software or equipment. For example, write "managed work orders in Salesforce" unless the intake explicitly calls it a CMMS.
- Every number in the resume must appear in the intake or customer correction.

Writing rules:
- Improve organization and wording without adding facts.
- Do not use first-person pronouns.
- Use concise, specific trade language and strong action verbs. Avoid "offers," "background includes," "responsible for," filler, and keyword stuffing.
- Avoid repeating the same wording in the summary and experience bullets.
- Build the strongest truthful version possible; never manufacture impact to make sparse intake sound stronger.
- Keep the finished content suitable for a one-to-two-page resume.
- Return valid JSON only. No markdown and no commentary.

Required JSON shape:
{"basics":{"fullName":"","targetTitle":"","location":"","phone":"","email":""},"summary":"","skills":[""],"certifications":[{"name":"","issuer":"","year":""}],"experience":[{"jobTitle":"","employer":"","location":"","startDate":"","endDate":"","bullets":[""]}],"education":[{"credential":"","institution":"","location":"","year":""}],"additionalInformation":[""]}

Use empty arrays for unsupported optional sections. Every experience bullet must be supported by the intake.`;
}

type ResumeAiProvider = "gemini" | "anthropic";

type ResumeModelResult = {
  resume: GeneratedResume;
  inputTokens: number;
  outputTokens: number;
  guardFlags: UnsupportedNumericClaim[];
};

const GEMINI_RESUME_RESPONSE_SCHEMA = {
  type: "OBJECT",
  required: ["basics", "summary", "skills", "certifications", "experience", "education", "additionalInformation"],
  properties: {
    basics: {
      type: "OBJECT",
      required: ["fullName", "targetTitle"],
      properties: {
        fullName: { type: "STRING" },
        targetTitle: { type: "STRING" },
        location: { type: "STRING" },
        phone: { type: "STRING" },
        email: { type: "STRING" },
      },
    },
    summary: { type: "STRING" },
    skills: { type: "ARRAY", items: { type: "STRING" } },
    certifications: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        required: ["name"],
        properties: {
          name: { type: "STRING" },
          issuer: { type: "STRING" },
          year: { type: "STRING" },
        },
      },
    },
    experience: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        required: ["jobTitle", "bullets"],
        properties: {
          jobTitle: { type: "STRING" },
          employer: { type: "STRING" },
          location: { type: "STRING" },
          startDate: { type: "STRING" },
          endDate: { type: "STRING" },
          bullets: { type: "ARRAY", items: { type: "STRING" } },
        },
      },
    },
    education: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        required: ["credential", "institution"],
        properties: {
          credential: { type: "STRING" },
          institution: { type: "STRING" },
          location: { type: "STRING" },
          year: { type: "STRING" },
        },
      },
    },
    additionalInformation: { type: "ARRAY", items: { type: "STRING" } },
  },
} as const;

function resumeAiProvider(env: ResumeBuilderEnv): ResumeAiProvider {
  const configured = env.RESUME_AI_PROVIDER?.trim().toLowerCase();
  if (configured === "gemini") return "gemini";
  if (configured === "anthropic" || configured === "claude") return "anthropic";
  return env.RESUME_AI_BRIDGE_URL?.trim() && env.RESUME_AI_BRIDGE_SECRET?.trim() ? "gemini" : "anthropic";
}

function resumeAiModel(env: ResumeBuilderEnv): string {
  return resumeAiProvider(env) === "gemini"
    ? env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL
    : env.CLAUDE_MODEL?.trim() || DEFAULT_CLAUDE_MODEL;
}

function compactModelValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(compactModelValue).filter((item) => item !== undefined);
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => {
      const compacted = compactModelValue(item);
      if (compacted === undefined) return [];
      if (Array.isArray(compacted) && compacted.length === 0) return [];
      if (compacted && typeof compacted === "object" && Object.keys(compacted).length === 0) return [];
      return [[key, compacted] as const];
    });
    return Object.fromEntries(entries);
  }
  if (typeof value === "string") return value.trim() || undefined;
  return value ?? undefined;
}

function resumeUserPrompt(
  resume: ResumeRecord,
  intake: unknown,
  prior: unknown,
  correctionRequest: string | null,
): string {
  const compactIntake = JSON.stringify(compactModelValue(intake));
  if (correctionRequest) {
    return `Revise the current resume using only the requested correction and original intake. Preserve accurate content not affected by the correction.\n\nORIGINAL INTAKE:\n${compactIntake}\n\nTARGET JOB POSTING:\n${resume.target_job_posting ?? ""}\n\nCURRENT RESUME:\n${JSON.stringify(compactModelValue(prior))}\n\nCUSTOMER CORRECTION:\n${correctionRequest}`;
  }
  return `Create the resume from this verified intake.\n\nTRADE TRACK:\n${resume.trade}\n\nORIGINAL INTAKE:\n${compactIntake}\n\nTARGET JOB POSTING:\n${resume.target_job_posting ?? ""}`;
}

function parseModelResume(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("Model returned an invalid resume format.");
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      throw new Error("Model returned invalid JSON.");
    }
  }
}

function validateModelResume(
  parsed: unknown,
  intake: unknown,
  resume: ResumeRecord,
  correctionRequest: string | null,
): { resume: GeneratedResume; guardFlags: UnsupportedNumericClaim[] } {
  const validation = validateGeneratedResume(parsed);
  if (!validation.ok) {
    throw new ResumeGenerationError(
      "INTAKE_INFORMATION_REQUIRED",
      "The generated resume did not contain enough supported information.",
      validation.missing,
    );
  }
  const generated = validation.resume;
  const guardFlags = unsupportedNumbers(generated, intake, resume.title, correctionRequest);
  if (guardFlags.length) {
    const sections = Array.from(new Set(guardFlags.map((flag) => flag.section)));
    throw new ResumeGenerationError(
      "UNSUPPORTED_NUMERIC_CLAIM",
      "The generated resume contained numeric claims the intake does not support.",
      [INTAKE_SECTION.numbers],
      { code: "unsupported_numeric_claim", count: guardFlags.length, sections },
    );
  }
  return { resume: generated, guardFlags };
}

async function callGemini(
  env: ResumeBuilderEnv,
  resume: ResumeRecord,
  correctionRequest: string | null,
  dependencies: ResumeBuilderDependencies,
): Promise<ResumeModelResult> {
  const bridgeUrl = env.RESUME_AI_BRIDGE_URL?.trim().replace(/\/$/, "");
  const bridgeSecret = env.RESUME_AI_BRIDGE_SECRET?.trim();
  if (!bridgeUrl || !bridgeSecret) throw new Error("Gemini is not configured.");
  const model = env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const intake = JSON.parse(resume.intake_json) as unknown;
  const prior = resume.generated_json ? JSON.parse(resume.generated_json) as unknown : null;
  const userPrompt = resumeUserPrompt(resume, intake, prior, correctionRequest);
  const geminiFetch = dependencies.geminiFetch ?? fetch;
  const endpoint = `${bridgeUrl}/generate`;
  const response = await geminiFetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bridgeSecret}`,
    },
    body: JSON.stringify({
      model,
      systemInstruction: { parts: [{ text: resumeSystemPrompt() }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        candidateCount: 1,
        maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
        temperature: 0.2,
        seed: 17,
        responseMimeType: "application/json",
        responseSchema: GEMINI_RESUME_RESPONSE_SCHEMA,
        thinkingConfig: { thinkingLevel: "LOW", includeThoughts: false },
      },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const payload = await response.json() as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: unknown; thought?: unknown }> };
      finishReason?: unknown;
    }>;
    usageMetadata?: {
      promptTokenCount?: unknown;
      candidatesTokenCount?: unknown;
      thoughtsTokenCount?: unknown;
    };
    error?: { message?: unknown };
  };
  if (!response.ok) {
    console.error("Gemini resume generation failed", response.status, cleanText(payload.error?.message, 240));
    throw new Error("Gemini resume generation failed.");
  }
  const candidate = payload.candidates?.[0];
  if (candidate?.finishReason === "MAX_TOKENS") throw new Error("Gemini resume output exceeded the token limit.");
  const raw = candidate?.content?.parts
    ?.filter((part) => part.thought !== true && typeof part.text === "string")
    .map((part) => part.text as string).join("\n") ?? "";
  const validated = validateModelResume(parseModelResume(raw), intake, resume, correctionRequest);
  const visibleOutputTokens = typeof payload.usageMetadata?.candidatesTokenCount === "number"
    ? payload.usageMetadata.candidatesTokenCount
    : 0;
  const thoughtTokens = typeof payload.usageMetadata?.thoughtsTokenCount === "number"
    ? payload.usageMetadata.thoughtsTokenCount
    : 0;
  return {
    ...validated,
    inputTokens: typeof payload.usageMetadata?.promptTokenCount === "number"
      ? payload.usageMetadata.promptTokenCount
      : 0,
    outputTokens: visibleOutputTokens + thoughtTokens,
  };
}

async function callAnthropic(
  env: ResumeBuilderEnv,
  resume: ResumeRecord,
  correctionRequest: string | null,
  dependencies: ResumeBuilderDependencies,
): Promise<ResumeModelResult> {
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("Claude is not configured.");
  const model = env.CLAUDE_MODEL?.trim() || DEFAULT_CLAUDE_MODEL;
  const intake = JSON.parse(resume.intake_json) as unknown;
  const prior = resume.generated_json ? JSON.parse(resume.generated_json) as unknown : null;
  const userPrompt = resumeUserPrompt(resume, intake, prior, correctionRequest);

  const anthropicFetch = dependencies.anthropicFetch ?? fetch;
  const response = await anthropicFetch("https://api.anthropic.com/v1/messages", {
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
  const validated = validateModelResume(parseModelResume(raw), intake, resume, correctionRequest);
  return {
    ...validated,
    inputTokens: typeof payload.usage?.input_tokens === "number" ? payload.usage.input_tokens : 0,
    outputTokens: typeof payload.usage?.output_tokens === "number" ? payload.usage.output_tokens : 0,
  };
}

async function callResumeModel(
  env: ResumeBuilderEnv,
  resume: ResumeRecord,
  correctionRequest: string | null,
  dependencies: ResumeBuilderDependencies,
): Promise<ResumeModelResult> {
  return resumeAiProvider(env) === "gemini"
    ? callGemini(env, resume, correctionRequest, dependencies)
    : callAnthropic(env, resume, correctionRequest, dependencies);
}

async function storeResumeFile(
  env: ResumeBuilderEnv,
  userId: string,
  resumeId: string,
  generationId: string,
  format: "pdf" | "docx" | "preview",
  bytes: Uint8Array,
): Promise<D1PreparedStatement> {
  if (!env.BOOKS) throw new Error("Resume file storage is unavailable.");
  const extension = format === "docx" ? "docx" : "pdf";
  const objectKey = `resume-builder/${userId}/${resumeId}/generations/${generationId}/${format}.${extension}`;
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

function generationObjectKeys(userId: string, resumeId: string, generationId: string): string[] {
  return ["docx.docx", "pdf.pdf", "preview.pdf"].map(
    (file) => `resume-builder/${userId}/${resumeId}/generations/${generationId}/${file}`,
  );
}

async function cleanupGenerationFiles(env: ResumeBuilderEnv, objectKeys: string[]): Promise<void> {
  if (!env.BOOKS) return;
  await Promise.allSettled(objectKeys.map((objectKey) => env.BOOKS!.delete(objectKey)));
}

function classifyGenerationError(error: unknown): ResumeGenerationError {
  if (error instanceof ResumeGenerationError) return error;
  return new ResumeGenerationError("GENERATION_ERROR", "Generation error.");
}

async function generateResume(
  request: Request,
  env: ResumeBuilderEnv,
  resumeId: string,
  dependencies: ResumeBuilderDependencies,
): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed("POST");
  if (!hasTrustedOrigin(request)) return json({ ok: false, message: "Request origin rejected." }, 403);
  const user = await requireUser(request, env);
  if (!user) return json({ ok: false, message: "Sign in to continue." }, 401);
  const resume = await findOwnedResume(env, resumeId, user.userId);
  if (!resume) return json({ ok: false, message: "Resume not found." }, 404);
  const entitlement = await findEntitlement(env, resumeId, user.userId);

  const body = await parseJsonBody(request, 8_000);
  const correctionRequest = cleanText(body?.correctionRequest, 2_000) || null;
  const isCorrection = Boolean(resume.generated_json);
  if (isCorrection && !entitlement) {
    return json({
      ok: false,
      code: "PAYMENT_REQUIRED",
      action: "complete_payment",
      paymentSafe: false,
      runConsumed: false,
      message: "Complete the $9.99 payment to unlock clean files and corrections.",
    }, 402);
  }
  if (isCorrection && !correctionRequest) {
    return json({ ok: false, message: "Describe the correction you want made." }, 400);
  }
  if (!isCorrection && correctionRequest) {
    return json({ ok: false, message: "Create the initial resume before requesting corrections." }, 400);
  }

  const locked = await env.DB.prepare(
    `UPDATE resumes SET status = 'generating', updated_at = CURRENT_TIMESTAMP
     WHERE resume_id = ? AND user_id = ? AND deleted_at IS NULL
       AND (status <> 'generating' OR updated_at < datetime('now', '-15 minutes'))`,
  ).bind(resumeId, user.userId).run() as D1MutationResult;
  if ((locked.meta?.changes ?? 0) !== 1) {
    return json({ ok: false, message: "A resume generation is already in progress." }, 409);
  }

  if (entitlement) {
    const reserved = await env.DB.prepare(
      `UPDATE entitlements SET credits_used = credits_used + 1, updated_at = CURRENT_TIMESTAMP
       WHERE entitlement_id = ? AND status = 'active' AND credits_used < credits_total`,
    ).bind(entitlement.entitlement_id).run() as D1MutationResult;
    if ((reserved.meta?.changes ?? 0) !== 1) {
      await env.DB.prepare(
        "UPDATE resumes SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE resume_id = ? AND user_id = ? AND status = 'generating'",
      ).bind(resume.status, resumeId, user.userId).run();
      return json({ ok: false, message: "All permitted AI runs have been used." }, 409);
    }
  }

  const generationId = crypto.randomUUID();
  const newObjectKeys = generationObjectKeys(user.userId, resumeId, generationId);
  const model = resumeAiModel(env);
  try {
    let generated: ResumeModelResult;
    try {
      generated = await callResumeModel(env, resume, correctionRequest, dependencies);
    } catch (error) {
      if (error instanceof ResumeGenerationError) throw error;
      throw new ResumeGenerationError("MODEL_OUTPUT_ERROR", "Model output error.");
    }

    let docx: Uint8Array;
    let pdf: Uint8Array;
    let preview: Uint8Array;
    const theme = normalizeTheme(resume.theme);
    try {
      [docx, pdf, preview] = await Promise.all([
        (dependencies.createDocx ?? createResumeDocx)(generated.resume, theme),
        (dependencies.createPdf ?? createResumePdf)(generated.resume, false, theme),
        (dependencies.createPdf ?? createResumePdf)(generated.resume, true, theme),
      ]);
    } catch {
      throw new ResumeGenerationError("DOCUMENT_RENDER_ERROR", "Document render error.");
    }

    const previousObjectKeys = (await Promise.all(
      (["docx", "pdf", "preview"] as const).map((format) => env.DB.prepare(
        "SELECT object_key FROM resume_files WHERE resume_id = ? AND user_id = ? AND format = ? LIMIT 1",
      ).bind(resumeId, user.userId, format).first<{ object_key: string }>()),
    )).flatMap((row) => row?.object_key ? [row.object_key] : []);

    const uploadResults = await Promise.allSettled([
      storeResumeFile(env, user.userId, resumeId, generationId, "docx", docx),
      storeResumeFile(env, user.userId, resumeId, generationId, "pdf", pdf),
      storeResumeFile(env, user.userId, resumeId, generationId, "preview", preview),
    ]);
    if (uploadResults.some((result) => result.status === "rejected")) {
      throw new ResumeGenerationError("FILE_STORAGE_ERROR", "File storage error.");
    }
    const fileStatements = uploadResults.map(
      (result) => (result as PromiseFulfilledResult<D1PreparedStatement>).value,
    );
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
    await cleanupGenerationFiles(
      env,
      previousObjectKeys.filter((objectKey) => !newObjectKeys.includes(objectKey)),
    );
    const runsUsed = entitlement ? entitlement.credits_used + 1 : INITIAL_PREVIEW_RUNS;
    return json({
      ok: true,
      resumeId,
      status: "ready",
      runNumber: runsUsed,
      runsTotal: RESUME_TOTAL_AI_RUNS,
      correctionsRemaining: entitlement ? Math.max(0, RESUME_TOTAL_AI_RUNS - runsUsed) : 0,
      previewUrl: `/api/resume-builder/resumes/${resumeId}/files/preview`,
      downloads: entitlement ? {
        pdf: `/api/resume-builder/resumes/${resumeId}/files/pdf`,
        docx: `/api/resume-builder/resumes/${resumeId}/files/docx`,
      } : null,
    });
  } catch (error) {
    await cleanupGenerationFiles(env, newObjectKeys);
    const failure = classifyGenerationError(error);
    const retryable = isRetryableFailure(failure.code);
    console.error("Resume generation pipeline failed", failure.code, failure.guardTelemetry ?? undefined);
    const failureStatements = [
      env.DB.prepare(
        `UPDATE resumes SET status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE resume_id = ? AND user_id = ? AND status = 'generating'`,
      ).bind(resume.status, resumeId, user.userId),
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
        JSON.stringify(failure.guardTelemetry ?? { code: failure.code.toLowerCase() }),
      ),
    ];
    if (entitlement) {
      failureStatements.unshift(env.DB.prepare(
        `UPDATE entitlements SET credits_used = CASE WHEN credits_used > 0 THEN credits_used - 1 ELSE 0 END,
         updated_at = CURRENT_TIMESTAMP WHERE entitlement_id = ?`,
      ).bind(entitlement.entitlement_id));
    }
    await env.DB.batch(failureStatements);
    return json({
      ok: false,
      code: failure.code,
      retryable,
      action: failureAction(failure.code),
      paymentSafe: Boolean(entitlement),
      runConsumed: false,
      missing: failure.missing,
      intakeUrl: retryable ? null : `${INTAKE_PATH}?resume_id=${encodeURIComponent(resumeId)}`,
      message: failureMessage(failure.code),
    }, failureStatus(failure.code));
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
  if (!resume) {
    return json({ ok: false, message: "File not found." }, 404);
  }
  const entitlement = await findEntitlement(env, resumeId, user.userId);
  if (format !== "preview" && !entitlement) return json({ ok: false, message: "File not found." }, 404);
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
  const showInline = isPreview || (format === "pdf" && new URL(request.url).searchParams.get("view") === "1");
  headers.set("Content-Disposition", `${showInline ? "inline" : "attachment"}; filename="${filename}"`);
  headers.set("Cache-Control", "private, no-store");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return new Response(object.body, { status: 200, headers });
}

export async function handleResumeBuilderRoute(
  request: Request,
  env: ResumeBuilderEnv,
  dependencies: ResumeBuilderDependencies = {},
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
    if (generationMatch) return generateResume(request, env, generationMatch[1], dependencies);
    const fileMatch = pathname.match(/^\/api\/resume-builder\/resumes\/([^/]+)\/files\/(pdf|docx|preview)$/);
    if (fileMatch) return serveResumeFile(request, env, fileMatch[1], fileMatch[2]);
    const resumeMatch = pathname.match(/^\/api\/resume-builder\/resumes\/([^/]+)$/);
    if (resumeMatch) {
      return request.method === "GET"
        ? getResumeStatus(request, env, resumeMatch[1])
        : updateResume(request, env, resumeMatch[1]);
    }
    return json({ ok: false, message: "Route not found." }, 404);
  } catch (error) {
    console.error("Resume Builder request failed", error);
    return json({ ok: false, message: "Resume Builder is temporarily unavailable." }, 500);
  }
}
