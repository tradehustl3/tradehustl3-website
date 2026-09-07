import {
  handleResumeBuilderRoute as handleBaseResumeBuilderRoute,
  type ResumeBuilderDependencies,
  type ResumeBuilderEnv,
} from "./resume-builder-base";
import {
  createCoverLetterDocx,
  createCoverLetterPdf,
  type GeneratedCoverLetter,
} from "./cover-letter-documents";
import type { GeneratedResume, ResumeTheme } from "./resume-documents";

const SITE_URL = "https://tradehustl3.com";
const DEFAULT_CLAUDE_MODEL = "claude-sonnet-5";
const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
const DEFAULT_GLOBAL_AI_DAILY_ATTEMPT_LIMIT = 250;
const COVER_BODY_MAX_BYTES = 24_000;
const COVER_CORRECTION_MAX_CHARS = 2_000;
const COVER_JOB_POSTING_MAX_CHARS = 12_000;
const encoder = new TextEncoder();

type D1MutationResult = { meta?: { changes?: number } };
type CoverFormat = "cover_json" | "cover_pdf" | "cover_docx";

type StoredCoverLetter = GeneratedCoverLetter & {
  context: {
    companyName: string;
    hiringManager: string;
    targetJobTitle: string;
    jobPosting: string;
  };
};

type ResumeProbe = {
  response: Response;
  payload: Record<string, unknown>;
  resume: Record<string, unknown>;
  record: {
    user_id: string;
    generated_json: string | null;
    target_job_posting: string | null;
    theme: string;
  };
};

type CoverModelResult = {
  paragraphs: string[];
  model: string;
  inputTokens: number;
  outputTokens: number;
};

function json(body: Record<string, unknown>, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Cache-Control", "no-store");
  responseHeaders.set("Content-Type", "application/json; charset=utf-8");
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  responseHeaders.set("Referrer-Policy", "no-referrer");
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function requestIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP")?.trim() || "unknown";
}

function hasTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  try {
    const parsed = new URL(origin).origin;
    return parsed === SITE_URL || parsed === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function sha256Hex(value: string | Uint8Array): Promise<string> {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readJsonBody(request: Request, maxBytes: number): Promise<Record<string, unknown> | null> {
  const declared = Number(request.headers.get("Content-Length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!request.body) return {};
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    if (!text) return {};
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

async function responseJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const parsed = await response.clone().json() as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

async function checkRateLimit(
  env: ResumeBuilderEnv,
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
  const row = await env.DB.prepare(
    `INSERT INTO rate_limits (bucket, window_start, count)
     VALUES (?, ?, 1)
     ON CONFLICT(bucket) DO UPDATE SET
       count = CASE WHEN rate_limits.window_start = excluded.window_start THEN rate_limits.count + 1 ELSE 1 END,
       window_start = excluded.window_start
     RETURNING count`,
  ).bind(bucket, windowStart).first<{ count: number }>();
  return Boolean(row && row.count <= limit);
}

function normalizeTheme(value: unknown): ResumeTheme {
  return value === "navy" ? "navy" : "plain";
}

function generatedResume(value: string | null): GeneratedResume | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as GeneratedResume;
    if (!parsed?.basics?.fullName || !parsed?.basics?.targetTitle || !Array.isArray(parsed.experience)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function probeResume(
  request: Request,
  env: ResumeBuilderEnv,
  resumeId: string,
  dependencies: ResumeBuilderDependencies,
): Promise<ResumeProbe | Response> {
  const probeUrl = new URL(request.url);
  probeUrl.pathname = `/api/resume-builder/resumes/${encodeURIComponent(resumeId)}`;
  probeUrl.search = "";
  const response = await handleBaseResumeBuilderRoute(
    new Request(probeUrl.toString(), {
      method: "GET",
      headers: request.headers,
    }),
    env,
    dependencies,
  );
  if (!response) return json({ ok: false, message: "Resume Builder is temporarily unavailable." }, 503);
  if (!response.ok) return response;
  const payload = await responseJson(response);
  const resumeValue = payload?.resume;
  if (!payload || !resumeValue || typeof resumeValue !== "object" || Array.isArray(resumeValue)) {
    return json({ ok: false, message: "Resume not found." }, 404);
  }
  const record = await env.DB.prepare(
    `SELECT user_id, generated_json, target_job_posting, theme
     FROM resumes WHERE resume_id = ? AND deleted_at IS NULL LIMIT 1`,
  ).bind(resumeId).first<ResumeProbe["record"]>();
  if (!record) return json({ ok: false, message: "Resume not found." }, 404);
  return { response, payload, resume: resumeValue as Record<string, unknown>, record };
}

async function findCoverFile(
  env: ResumeBuilderEnv,
  userId: string,
  resumeId: string,
  format: CoverFormat,
): Promise<{ object_key: string } | null> {
  return env.DB.prepare(
    `SELECT object_key FROM resume_files
     WHERE resume_id = ? AND user_id = ? AND format = ?
     ORDER BY created_at DESC LIMIT 1`,
  ).bind(resumeId, userId, format).first<{ object_key: string }>();
}

async function loadStoredCoverLetter(
  env: ResumeBuilderEnv,
  userId: string,
  resumeId: string,
): Promise<StoredCoverLetter | null> {
  const row = await findCoverFile(env, userId, resumeId, "cover_json");
  if (!row || !env.BOOKS) return null;
  const object = await env.BOOKS.get(row.object_key);
  if (!object) return null;
  try {
    const value = JSON.parse(await object.text()) as StoredCoverLetter;
    return value?.basics?.fullName && Array.isArray(value.paragraphs) ? value : null;
  } catch {
    return null;
  }
}

async function storeCoverFile(
  env: ResumeBuilderEnv,
  userId: string,
  resumeId: string,
  generationId: string,
  format: CoverFormat,
  bytes: Uint8Array,
): Promise<D1PreparedStatement> {
  if (!env.BOOKS) throw new Error("Cover letter storage is unavailable.");
  const extension = format === "cover_docx" ? "docx" : format === "cover_pdf" ? "pdf" : "json";
  const objectKey = `resume-builder/${userId}/${resumeId}/cover-letter/${generationId}/${format}.${extension}`;
  const contentType = format === "cover_docx"
    ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    : format === "cover_pdf"
      ? "application/pdf"
      : "application/json; charset=utf-8";
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

function numericTokens(text: string): Set<string> {
  const tokens = new Set<string>();
  for (const match of text.replace(/,/g, "").matchAll(/\d+(?:\.\d+)?/g)) {
    tokens.add(match[0].replace(/^0+(?=\d)/, ""));
  }
  return tokens;
}

function validateParagraphs(value: unknown, supportedSource: string): string[] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const root = value as Record<string, unknown>;
  if (!Array.isArray(root.paragraphs)) return null;
  const paragraphs = root.paragraphs
    .slice(0, 4)
    .map((item) => cleanText(item, 1_600))
    .filter(Boolean);
  if (paragraphs.length < 2 || paragraphs.length > 4) return null;
  const sourceNumbers = numericTokens(supportedSource);
  const outputNumbers = numericTokens(paragraphs.join(" "));
  for (const token of outputNumbers) {
    if (!sourceNumbers.has(token)) return null;
  }
  return paragraphs;
}

function coverLetterSystemPrompt(): string {
  return `You are HUSTL3 BOT writing a concise, professional skilled-trades cover letter.
Use only facts explicitly present in VERIFIED_RESUME and TARGET_JOB_CONTEXT. Never invent employers, certifications, licenses, dates, quantities, metrics, equipment experience, accomplishments, addresses, hiring-manager names, or facts about the target company. If the job posting does not establish a company fact, do not claim it. Do not add years of experience unless the exact number is supported. Keep the language direct and practical, not flowery. Write 3 short body paragraphs suitable for a one-page cover letter. Return JSON only with this exact shape: {"paragraphs":["...","...","..."]}.`;
}

async function callGeminiCoverLetter(
  env: ResumeBuilderEnv,
  prompt: string,
  supportedSource: string,
  dependencies: ResumeBuilderDependencies,
): Promise<CoverModelResult> {
  const bridgeUrl = env.RESUME_AI_BRIDGE_URL?.trim().replace(/\/$/, "");
  const bridgeSecret = env.RESUME_AI_BRIDGE_SECRET?.trim();
  if (!bridgeUrl || !bridgeSecret) throw new Error("Gemini is not configured.");
  const model = env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const response = await (dependencies.geminiFetch ?? fetch)(`${bridgeUrl}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${bridgeSecret}` },
    body: JSON.stringify({
      model,
      systemInstruction: { parts: [{ text: coverLetterSystemPrompt() }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        candidateCount: 1,
        maxOutputTokens: 1_800,
        temperature: 0.2,
        seed: 17,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          required: ["paragraphs"],
          properties: {
            paragraphs: { type: "ARRAY", items: { type: "STRING" }, minItems: 2, maxItems: 4 },
          },
        },
        thinkingConfig: { thinkingLevel: "LOW", includeThoughts: false },
      },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const payload = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: unknown; thought?: unknown }> } }>;
    usageMetadata?: { promptTokenCount?: unknown; candidatesTokenCount?: unknown };
    error?: { message?: unknown };
  };
  if (!response.ok) throw new Error(cleanText(payload.error?.message, 300) || "Gemini cover-letter generation failed.");
  const raw = payload.candidates?.[0]?.content?.parts?.find((part) => !part.thought && typeof part.text === "string")?.text;
  if (typeof raw !== "string") throw new Error("Gemini returned no cover letter.");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Gemini returned invalid cover-letter JSON."); }
  const paragraphs = validateParagraphs(parsed, supportedSource);
  if (!paragraphs) throw new Error("Cover letter failed the verified-facts quality gate.");
  return {
    paragraphs,
    model,
    inputTokens: Number(payload.usageMetadata?.promptTokenCount) || 0,
    outputTokens: Number(payload.usageMetadata?.candidatesTokenCount) || 0,
  };
}

async function callAnthropicCoverLetter(
  env: ResumeBuilderEnv,
  prompt: string,
  supportedSource: string,
  dependencies: ResumeBuilderDependencies,
): Promise<CoverModelResult> {
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("Claude is not configured.");
  const model = env.CLAUDE_MODEL?.trim() || DEFAULT_CLAUDE_MODEL;
  const response = await (dependencies.anthropicFetch ?? fetch)("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1_800,
      temperature: 0.2,
      system: coverLetterSystemPrompt(),
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const payload = await response.json() as {
    content?: Array<{ type?: unknown; text?: unknown }>;
    usage?: { input_tokens?: unknown; output_tokens?: unknown };
    error?: { message?: unknown };
  };
  if (!response.ok) throw new Error(cleanText(payload.error?.message, 300) || "Claude cover-letter generation failed.");
  const raw = payload.content?.find((item) => item.type === "text" && typeof item.text === "string")?.text;
  if (typeof raw !== "string") throw new Error("Claude returned no cover letter.");
  const normalized = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  let parsed: unknown;
  try { parsed = JSON.parse(normalized); } catch { throw new Error("Claude returned invalid cover-letter JSON."); }
  const paragraphs = validateParagraphs(parsed, supportedSource);
  if (!paragraphs) throw new Error("Cover letter failed the verified-facts quality gate.");
  return {
    paragraphs,
    model,
    inputTokens: Number(payload.usage?.input_tokens) || 0,
    outputTokens: Number(payload.usage?.output_tokens) || 0,
  };
}

async function callCoverLetterModel(
  env: ResumeBuilderEnv,
  prompt: string,
  supportedSource: string,
  dependencies: ResumeBuilderDependencies,
): Promise<CoverModelResult> {
  const provider = env.RESUME_AI_PROVIDER?.trim().toLowerCase();
  const useGemini = provider === "gemini" || (!provider && Boolean(env.RESUME_AI_BRIDGE_URL?.trim() && env.RESUME_AI_BRIDGE_SECRET?.trim()));
  if (!useGemini && (provider === "anthropic" || provider === "claude")) {
    return callAnthropicCoverLetter(env, prompt, supportedSource, dependencies);
  }
  try {
    return await callGeminiCoverLetter(env, prompt, supportedSource, dependencies);
  } catch (primaryError) {
    if (!env.ANTHROPIC_API_KEY?.trim()) throw primaryError;
    console.warn("Gemini cover-letter generation unavailable; using configured Anthropic fallback.");
    return callAnthropicCoverLetter(env, prompt, supportedSource, dependencies);
  }
}

async function acquireCoverLock(env: ResumeBuilderEnv, userId: string, resumeId: string): Promise<boolean> {
  const row = await env.DB.prepare(
    `INSERT INTO resume_generations
       (generation_id, resume_id, user_id, mode, model, outcome)
     VALUES (?, ?, ?, 'cover_letter_lock', 'lock', 'running')
     ON CONFLICT(generation_id) DO UPDATE SET
       created_at = CURRENT_TIMESTAMP, outcome = 'running'
     WHERE resume_generations.created_at < datetime('now', '-15 minutes')
     RETURNING generation_id`,
  ).bind(`cover-letter-lock:${resumeId}`, resumeId, userId).first<{ generation_id: string }>();
  return Boolean(row);
}

async function releaseCoverLock(env: ResumeBuilderEnv, resumeId: string): Promise<void> {
  await env.DB.prepare("DELETE FROM resume_generations WHERE generation_id = ?")
    .bind(`cover-letter-lock:${resumeId}`).run();
}

async function reserveCorrectionCredit(env: ResumeBuilderEnv, userId: string, resumeId: string): Promise<string | null> {
  const entitlement = await env.DB.prepare(
    `SELECT entitlement_id FROM entitlements
     WHERE resume_id = ? AND user_id = ? AND status = 'active'
       AND (access_expires_at IS NULL OR access_expires_at > ?)
     ORDER BY created_at DESC LIMIT 1`,
  ).bind(resumeId, userId, Math.floor(Date.now() / 1000)).first<{ entitlement_id: string }>();
  if (!entitlement) return null;
  const result = await env.DB.prepare(
    `UPDATE entitlements SET credits_used = credits_used + 1, updated_at = CURRENT_TIMESTAMP
     WHERE entitlement_id = ? AND status = 'active' AND credits_used < credits_total`,
  ).bind(entitlement.entitlement_id).run() as D1MutationResult;
  return (result.meta?.changes ?? 0) === 1 ? entitlement.entitlement_id : null;
}

async function restoreCorrectionCredit(env: ResumeBuilderEnv, entitlementId: string): Promise<void> {
  await env.DB.prepare(
    `UPDATE entitlements SET credits_used = CASE WHEN credits_used > 0 THEN credits_used - 1 ELSE 0 END,
     updated_at = CURRENT_TIMESTAMP WHERE entitlement_id = ?`,
  ).bind(entitlementId).run();
}

function formatLetterDate(): string {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date());
}

async function generateCoverLetter(
  request: Request,
  env: ResumeBuilderEnv,
  resumeId: string,
  dependencies: ResumeBuilderDependencies,
): Promise<Response> {
  if (request.method !== "POST") return json({ ok: false, message: "Method not allowed." }, 405, { Allow: "POST" });
  if (!hasTrustedOrigin(request)) return json({ ok: false, message: "Request origin rejected." }, 403);
  const probe = await probeResume(request, env, resumeId, dependencies);
  if (probe instanceof Response) return probe;
  if (!probe.resume.paid) {
    return json({ ok: false, action: "complete_payment", message: "Unlock the $9.99 resume package before generating the included cover letter." }, 402);
  }
  const verifiedResume = generatedResume(probe.record.generated_json);
  if (!verifiedResume) return json({ ok: false, message: "Finish your resume before generating the cover letter." }, 409);
  const body = await readJsonBody(request, COVER_BODY_MAX_BYTES);
  if (!body) return json({ ok: false, message: "Cover-letter request is too large or invalid." }, 400);
  const existing = await loadStoredCoverLetter(env, probe.record.user_id, resumeId);
  const correctionRequest = cleanText(body.correctionRequest, COVER_CORRECTION_MAX_CHARS);
  if (existing && !correctionRequest) {
    return json({ ok: false, message: "Your matching cover letter already exists. Use the correction box to refine it." }, 409);
  }
  if (!existing && correctionRequest) {
    return json({ ok: false, message: "Generate the included cover letter before requesting a correction." }, 400);
  }

  const companyName = cleanText(body.companyName, 160) || existing?.context.companyName || "";
  const hiringManager = cleanText(body.hiringManager, 160) || existing?.context.hiringManager || "";
  const targetJobTitle = cleanText(body.targetJobTitle, 160)
    || existing?.context.targetJobTitle
    || verifiedResume.basics.targetTitle;
  const jobPosting = cleanText(body.jobPosting, COVER_JOB_POSTING_MAX_CHARS)
    || existing?.context.jobPosting
    || cleanText(probe.record.target_job_posting, COVER_JOB_POSTING_MAX_CHARS);

  const configuredGlobalLimit = Number.parseInt(env.RESUME_AI_DAILY_ATTEMPT_LIMIT ?? "", 10);
  const globalLimit = Number.isSafeInteger(configuredGlobalLimit) && configuredGlobalLimit > 0
    ? Math.min(configuredGlobalLimit, 10_000)
    : DEFAULT_GLOBAL_AI_DAILY_ATTEMPT_LIMIT;
  const ipHash = await sha256Hex(requestIp(request));
  const allowed = await Promise.all([
    checkRateLimit(env, `resume-ai-user:${probe.record.user_id}`, 10, 24 * 60 * 60),
    checkRateLimit(env, `resume-ai-ip:${ipHash}`, 20, 24 * 60 * 60),
    checkRateLimit(env, "resume-ai-global", globalLimit, 24 * 60 * 60),
  ]);
  if (!allowed.every(Boolean)) {
    return json({ ok: false, message: "The daily AI-generation limit has been reached. Try again tomorrow." }, 429, { "Retry-After": "86400" });
  }

  if (!await acquireCoverLock(env, probe.record.user_id, resumeId)) {
    return json({ ok: false, message: "A cover letter is already being generated. Please wait for it to finish." }, 409);
  }

  let reservedEntitlementId: string | null = null;
  if (existing) {
    reservedEntitlementId = await reserveCorrectionCredit(env, probe.record.user_id, resumeId);
    if (!reservedEntitlementId) {
      await releaseCoverLock(env, resumeId);
      return json({ ok: false, message: "All three package corrections have been used." }, 409);
    }
  }

  const context = { companyName, hiringManager, targetJobTitle, jobPosting };
  const supportedSource = JSON.stringify({ verifiedResume, targetJobContext: context });
  const prompt = `${existing ? "Refine the existing cover letter using the correction request. Preserve all verified facts." : "Write the matching cover letter."}\n\n<VERIFIED_RESUME>\n${JSON.stringify(verifiedResume)}\n</VERIFIED_RESUME>\n\n<TARGET_JOB_CONTEXT>\n${JSON.stringify(context)}\n</TARGET_JOB_CONTEXT>${existing ? `\n\n<EXISTING_COVER_LETTER>\n${JSON.stringify(existing.paragraphs)}\n</EXISTING_COVER_LETTER>\n\n<CORRECTION_REQUEST>\n${correctionRequest}\n</CORRECTION_REQUEST>` : ""}`;
  const generationId = crypto.randomUUID();
  const previousRows = await Promise.all(([
    "cover_json", "cover_pdf", "cover_docx",
  ] as const).map((format) => findCoverFile(env, probe.record.user_id, resumeId, format)));
  const previousObjectKeys = previousRows.flatMap((row) => row?.object_key ? [row.object_key] : []);
  const newObjectKeys = ([
    ["cover_json", "json"], ["cover_pdf", "pdf"], ["cover_docx", "docx"],
  ] as const).map(([format, extension]) => `resume-builder/${probe.record.user_id}/${resumeId}/cover-letter/${generationId}/${format}.${extension}`);

  try {
    const modelResult = await callCoverLetterModel(env, prompt, supportedSource, dependencies);
    const stored: StoredCoverLetter = {
      basics: {
        fullName: verifiedResume.basics.fullName,
        location: verifiedResume.basics.location,
        phone: verifiedResume.basics.phone,
        email: verifiedResume.basics.email,
      },
      date: formatLetterDate(),
      companyName: companyName || undefined,
      hiringManager: hiringManager || undefined,
      targetJobTitle,
      salutation: hiringManager ? `Dear ${hiringManager},` : "Dear Hiring Manager,",
      paragraphs: modelResult.paragraphs,
      closing: "Sincerely,",
      context,
    };
    const theme = normalizeTheme(probe.record.theme);
    const [pdf, docx] = await Promise.all([
      createCoverLetterPdf(stored, theme),
      createCoverLetterDocx(stored, theme),
    ]);
    const jsonBytes = encoder.encode(JSON.stringify(stored));
    const statements = await Promise.all([
      storeCoverFile(env, probe.record.user_id, resumeId, generationId, "cover_json", jsonBytes),
      storeCoverFile(env, probe.record.user_id, resumeId, generationId, "cover_pdf", pdf),
      storeCoverFile(env, probe.record.user_id, resumeId, generationId, "cover_docx", docx),
    ]);
    await env.DB.batch([
      ...statements,
      env.DB.prepare(
        `INSERT INTO resume_generations
         (generation_id, resume_id, user_id, mode, model, input_tokens, output_tokens, outcome)
         VALUES (?, ?, ?, 'cover_letter', ?, ?, ?, 'ok')`,
      ).bind(generationId, resumeId, probe.record.user_id, modelResult.model, modelResult.inputTokens, modelResult.outputTokens),
      env.DB.prepare("UPDATE resumes SET updated_at = CURRENT_TIMESTAMP WHERE resume_id = ? AND user_id = ?")
        .bind(resumeId, probe.record.user_id),
    ]);
    if (env.BOOKS) {
      await Promise.allSettled(previousObjectKeys.filter((key) => !newObjectKeys.includes(key)).map((key) => env.BOOKS!.delete(key)));
    }
    await releaseCoverLock(env, resumeId);
    return json({
      ok: true,
      runConsumed: Boolean(existing),
      message: existing
        ? "Cover letter correction applied. It used one of your three package corrections."
        : "Matching cover letter created. The included first cover-letter build did not use a correction.",
    });
  } catch (error) {
    console.error("Cover letter generation failed", error);
    if (env.BOOKS) await Promise.allSettled(newObjectKeys.map((key) => env.BOOKS!.delete(key)));
    if (reservedEntitlementId) await restoreCorrectionCredit(env, reservedEntitlementId);
    await env.DB.prepare(
      `INSERT INTO resume_generations
       (generation_id, resume_id, user_id, mode, model, guard_flags, outcome)
       VALUES (?, ?, ?, 'cover_letter', 'failed', ?, 'error')`,
    ).bind(crypto.randomUUID(), resumeId, probe.record.user_id, JSON.stringify({ reason: error instanceof Error ? error.message.slice(0, 300) : "unknown" })).run();
    await releaseCoverLock(env, resumeId);
    return json({ ok: false, runConsumed: false, message: "The cover letter could not be generated safely. No correction was consumed. Please try again." }, 502);
  }
}

async function serveCoverLetterFile(
  request: Request,
  env: ResumeBuilderEnv,
  resumeId: string,
  format: "pdf" | "docx",
  dependencies: ResumeBuilderDependencies,
): Promise<Response> {
  if (request.method !== "GET") return json({ ok: false, message: "Method not allowed." }, 405, { Allow: "GET" });
  const probe = await probeResume(request, env, resumeId, dependencies);
  if (probe instanceof Response) return probe;
  if (!probe.resume.paid) return json({ ok: false, message: "File not found." }, 404);
  const storedFormat: CoverFormat = format === "docx" ? "cover_docx" : "cover_pdf";
  const row = await findCoverFile(env, probe.record.user_id, resumeId, storedFormat);
  if (!row || !env.BOOKS) return json({ ok: false, message: "File not found." }, 404);
  const object = await env.BOOKS.get(row.object_key);
  if (!object) return json({ ok: false, message: "File not found." }, 404);
  const isDocx = format === "docx";
  const showInline = format === "pdf" && new URL(request.url).searchParams.get("view") === "1";
  const headers = new Headers();
  headers.set("Content-Type", isDocx
    ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    : "application/pdf");
  headers.set("Content-Disposition", `${showInline ? "inline" : "attachment"}; filename="TRADE-HUSTL3-Cover-Letter.${isDocx ? "docx" : "pdf"}"`);
  headers.set("Cache-Control", "private, no-store");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return new Response(object.body, { status: 200, headers });
}

export async function handleCoverLetterRoute(
  request: Request,
  env: ResumeBuilderEnv,
  dependencies: ResumeBuilderDependencies = {},
): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  const generateMatch = pathname.match(/^\/api\/resume-builder\/resumes\/([^/]+)\/cover-letter\/generate$/);
  if (generateMatch) return generateCoverLetter(request, env, generateMatch[1], dependencies);
  const fileMatch = pathname.match(/^\/api\/resume-builder\/resumes\/([^/]+)\/cover-letter\/files\/(pdf|docx)$/);
  if (fileMatch) return serveCoverLetterFile(request, env, fileMatch[1], fileMatch[2] as "pdf" | "docx", dependencies);
  return null;
}

export async function augmentResumeWithCoverLetter(
  response: Response,
  env: ResumeBuilderEnv,
  resumeId: string,
): Promise<Response> {
  if (!response.ok) return response;
  const payload = await responseJson(response);
  const resumeValue = payload?.resume;
  if (!payload || !resumeValue || typeof resumeValue !== "object" || Array.isArray(resumeValue)) return response;
  const resume = resumeValue as Record<string, unknown>;
  const paid = Boolean(resume.paid);
  const userRow = await env.DB.prepare(
    "SELECT user_id FROM resumes WHERE resume_id = ? AND deleted_at IS NULL LIMIT 1",
  ).bind(resumeId).first<{ user_id: string }>();
  if (!userRow) return response;
  const [jsonRow, pdfRow, docxRow] = await Promise.all([
    findCoverFile(env, userRow.user_id, resumeId, "cover_json"),
    findCoverFile(env, userRow.user_id, resumeId, "cover_pdf"),
    findCoverFile(env, userRow.user_id, resumeId, "cover_docx"),
  ]);
  const generated = Boolean(jsonRow && pdfRow && docxRow);
  const stored = generated ? await loadStoredCoverLetter(env, userRow.user_id, resumeId) : null;
  const next = {
    ...payload,
    resume: {
      ...resume,
      coverLetter: {
        included: true,
        available: paid,
        generated,
        correctionsRemaining: Number(resume.correctionsRemaining) || 0,
        previewUrl: paid && generated ? `/api/resume-builder/resumes/${resumeId}/cover-letter/files/pdf?view=1` : null,
        downloads: paid && generated ? {
          pdf: `/api/resume-builder/resumes/${resumeId}/cover-letter/files/pdf`,
          docx: `/api/resume-builder/resumes/${resumeId}/cover-letter/files/docx`,
        } : null,
        companyName: stored?.context.companyName || "",
        hiringManager: stored?.context.hiringManager || "",
        targetJobTitle: stored?.context.targetJobTitle || "",
      },
    },
  };
  const headers = new Headers(response.headers);
  headers.delete("Content-Length");
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(next), { status: response.status, headers });
}

export async function rerenderCoverLetterTheme(
  env: ResumeBuilderEnv,
  resumeId: string,
  theme: ResumeTheme,
): Promise<boolean> {
  const record = await env.DB.prepare(
    "SELECT user_id FROM resumes WHERE resume_id = ? AND deleted_at IS NULL LIMIT 1",
  ).bind(resumeId).first<{ user_id: string }>();
  if (!record || !env.BOOKS) return false;
  const stored = await loadStoredCoverLetter(env, record.user_id, resumeId);
  if (!stored) return false;
  const generationId = crypto.randomUUID();
  const [oldPdf, oldDocx] = await Promise.all([
    findCoverFile(env, record.user_id, resumeId, "cover_pdf"),
    findCoverFile(env, record.user_id, resumeId, "cover_docx"),
  ]);
  const newKeys = [
    `resume-builder/${record.user_id}/${resumeId}/cover-letter/${generationId}/cover_pdf.pdf`,
    `resume-builder/${record.user_id}/${resumeId}/cover-letter/${generationId}/cover_docx.docx`,
  ];
  try {
    const [pdf, docx] = await Promise.all([
      createCoverLetterPdf(stored, theme),
      createCoverLetterDocx(stored, theme),
    ]);
    const statements = await Promise.all([
      storeCoverFile(env, record.user_id, resumeId, generationId, "cover_pdf", pdf),
      storeCoverFile(env, record.user_id, resumeId, generationId, "cover_docx", docx),
    ]);
    await env.DB.batch(statements);
    const oldKeys = [oldPdf?.object_key, oldDocx?.object_key].filter((key): key is string => Boolean(key));
    await Promise.allSettled(oldKeys.filter((key) => !newKeys.includes(key)).map((key) => env.BOOKS!.delete(key)));
    return true;
  } catch (error) {
    await Promise.allSettled(newKeys.map((key) => env.BOOKS!.delete(key)));
    throw error;
  }
}
