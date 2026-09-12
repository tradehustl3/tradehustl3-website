import {
  handleResumeBuilderRoute as handleBaseResumeBuilderRoute,
  type ResumeBuilderDependencies,
  type ResumeBuilderEnv,
} from "./resume-builder-base";
import {
  createResumeDocx,
  createResumePdf,
  type GeneratedResume,
  type ResumeTheme,
} from "./resume-documents";
import {
  augmentResumeWithCoverLetter,
  handleCoverLetterRoute,
  rerenderCoverLetterTheme,
} from "./cover-letter";
import { hardenGeneratedResumePackage } from "./resume-package-hardener";
import {
  assessResumeExtractionCoverage,
  assessSavedIntakeExtractionCoverage,
  repairResumeExtractionFromSource,
} from "./resume-extraction-coverage";
import {
  buildCanonicalSourceRecord,
  mergeCanonicalWithAiEnrichment,
  validateCanonicalImmutability,
  type CanonicalSourceRecord,
} from "./resume-source-canonical";

export * from "./resume-builder-base";

type BaseResumeRequest = Parameters<typeof handleBaseResumeBuilderRoute>[0];
type JsonReadableRequest = { json(): Promise<unknown> };

type RateLimitObservation = {
  bucket: string;
  count: number;
  effectiveCount: number;
  windowStart: number;
};

type RateLimitPolicy = {
  env: ResumeBuilderEnv;
  observations: RateLimitObservation[];
};

type CanonicalImportPlan = {
  sourceText: string;
  canonical: CanonicalSourceRecord;
};

const IMPORT_PRESERVATION_INSTRUCTION = `Uploaded-resume preservation rule:
Preserve every explicit employer, job title, location, date range, certification, education item, contact detail available in the source schema, and every substantive responsibility or accomplishment. Do not summarize away supported facts. Keep every number exactly grounded in the source. When a role has multiple bullets, retain their factual content in responsibilities instead of collapsing the role to a generic sentence. Never invent a missing fact.`;

const GENERATION_PRESERVATION_INSTRUCTION = `Uploaded-resume enhancement rule:
Enhancement means preserve first, then improve wording. Use BOTH authoritative customer sources: the structured intake and the original uploaded resume text in sourceResumeText. Keep every supported contact detail, employer, job title, location, date, certification/license, education item, substantive duty/accomplishment, tool/equipment/system, software/CMMS item, and meaningful training fact found in either source. The original uploaded resume is the backup evidence layer whenever structured extraction omitted a supported fact. Reword and reorganize for clarity, trade relevance, and ATS readability, but do not reduce factual coverage. For raw-source-only facts, ground the rewritten claim to the matching upload.raw.* fact. Never add a number, percentage, count, date, years-of-experience claim, unit count, team size, equipment size, or quantity unless that numeric fact is explicitly supported by the structured intake or original uploaded resume. If metrics are absent, write strong nonnumeric bullets instead of inventing metrics.`;

const STRICT_NUMERIC_RETRY_INSTRUCTION = `Safety retry rule:
A previous draft was rejected because it introduced unsupported numeric wording. Use only numeric facts already supported by the structured intake, original uploaded resume text, or customer correction. Do not create estimates, percentages, counts, quantities, years, dates, team sizes, equipment sizes, work-order volumes, or performance metrics. Prefer accurate nonnumeric wording whenever a number is not required.`;

function patchedSystemInstruction(current: string, strictNumericRetry: boolean): string {
  const isImport = /extract factual resume data for TRADE HUSTL3/i.test(current);
  if (isImport) return `${current}\n\n${IMPORT_PRESERVATION_INSTRUCTION}`;
  return `${current}\n\n${GENERATION_PRESERVATION_INSTRUCTION}${strictNumericRetry ? `\n\n${STRICT_NUMERIC_RETRY_INSTRUCTION}` : ""}`;
}

function wrapGeminiFetch(delegate: typeof fetch, strictNumericRetry: boolean): typeof fetch {
  const wrapped: typeof fetch = async (input, init) => {
    if (!init || typeof init.body !== "string") return delegate(input, init);
    try {
      const root = JSON.parse(init.body) as Record<string, unknown>;
      const instruction = root.systemInstruction;
      if (instruction && typeof instruction === "object" && !Array.isArray(instruction)) {
        const instructionRecord = instruction as Record<string, unknown>;
        const parts = Array.isArray(instructionRecord.parts) ? [...instructionRecord.parts] : [];
        if (parts.length && parts[0] && typeof parts[0] === "object" && !Array.isArray(parts[0])) {
          const first = { ...(parts[0] as Record<string, unknown>) };
          if (typeof first.text === "string") {
            first.text = patchedSystemInstruction(first.text, strictNumericRetry);
            parts[0] = first;
            root.systemInstruction = { ...instructionRecord, parts };
            return delegate(input, { ...init, body: JSON.stringify(root) });
          }
        }
      }
    } catch {
      // If an upstream request shape ever changes, preserve the original call.
    }
    return delegate(input, init);
  };
  return wrapped;
}

function wrapAnthropicFetch(delegate: typeof fetch, strictNumericRetry: boolean): typeof fetch {
  const wrapped: typeof fetch = async (input, init) => {
    if (!init || typeof init.body !== "string") return delegate(input, init);
    try {
      const root = JSON.parse(init.body) as Record<string, unknown>;
      if (typeof root.system === "string") {
        root.system = patchedSystemInstruction(root.system, strictNumericRetry);
        return delegate(input, { ...init, body: JSON.stringify(root) });
      }
    } catch {
      // If an upstream request shape ever changes, preserve the original call.
    }
    return delegate(input, init);
  };
  return wrapped;
}

export function preservationDependencies(
  dependencies: ResumeBuilderDependencies,
  strictNumericRetry: boolean,
): ResumeBuilderDependencies {
  return {
    ...dependencies,
    geminiFetch: wrapGeminiFetch(dependencies.geminiFetch ?? fetch, strictNumericRetry),
    anthropicFetch: wrapAnthropicFetch(dependencies.anthropicFetch ?? fetch, strictNumericRetry),
  };
}

const IMPORT_RECONCILIATION_INSTRUCTION = `Extraction coverage reconciliation rule:
A previous extraction of this uploaded resume was incomplete. Re-read the entire SOURCE_RESUME from top to bottom and return a complete factual extraction. Capture every distinct job, employer, job title, location, date range, substantive responsibility, education item, certification or license, skill, tool, equipment/system, software/CMMS product, and meaningful training item explicitly present. Do not omit older roles merely to keep the response short. Do not invent or infer anything that is not in the source.`;

export function reconciliationDependencies(dependencies: ResumeBuilderDependencies): ResumeBuilderDependencies {
  const base = preservationDependencies(dependencies, false);
  const appendGemini: typeof fetch = async (input, init) => {
    if (!init || typeof init.body !== "string") return (base.geminiFetch ?? fetch)(input, init);
    try {
      const root = JSON.parse(init.body) as Record<string, unknown>;
      const instruction = root.systemInstruction;
      if (instruction && typeof instruction === "object" && !Array.isArray(instruction)) {
        const instructionRecord = instruction as Record<string, unknown>;
        const parts = Array.isArray(instructionRecord.parts) ? [...instructionRecord.parts] : [];
        if (parts[0] && typeof parts[0] === "object" && !Array.isArray(parts[0])) {
          const first = { ...(parts[0] as Record<string, unknown>) };
          if (typeof first.text === "string" && /extract factual resume data for TRADE HUSTL3/i.test(first.text)) {
            first.text = `${first.text}\n\n${IMPORT_RECONCILIATION_INSTRUCTION}`;
            parts[0] = first;
            root.systemInstruction = { ...instructionRecord, parts };
            return (base.geminiFetch ?? fetch)(input, { ...init, body: JSON.stringify(root) });
          }
        }
      }
    } catch {
      // Preserve the original request if the provider payload changes.
    }
    return (base.geminiFetch ?? fetch)(input, init);
  };
  const appendAnthropic: typeof fetch = async (input, init) => {
    if (!init || typeof init.body !== "string") return (base.anthropicFetch ?? fetch)(input, init);
    try {
      const root = JSON.parse(init.body) as Record<string, unknown>;
      if (typeof root.system === "string" && /extract factual resume data for TRADE HUSTL3/i.test(root.system)) {
        root.system = `${root.system}\n\n${IMPORT_RECONCILIATION_INSTRUCTION}`;
        return (base.anthropicFetch ?? fetch)(input, { ...init, body: JSON.stringify(root) });
      }
    } catch {
      // Preserve the original request if the provider payload changes.
    }
    return (base.anthropicFetch ?? fetch)(input, init);
  };
  return { ...base, geminiFetch: appendGemini, anthropicFetch: appendAnthropic };
}

function firstResumeEmail(text: string): string {
  return text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)?.[0]?.trim() ?? "";
}

function firstResumePhone(text: string): string {
  return text.match(/(?:\+?1[\s.()-]*)?(?:\(?\d{3}\)?[\s.-]*)\d{3}[\s.-]*\d{4}/)?.[0]?.replace(/\s+/g, " ").trim() ?? "";
}

async function jsonBody(request: JsonReadableRequest): Promise<Record<string, unknown> | null> {
  try {
    const parsed = await request.json();
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

function rewrittenJson(response: Response, body: Record<string, unknown>, status = response.status): Response {
  const headers = new Headers(response.headers);
  headers.delete("Content-Length");
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}

export function effectiveResumePreviewRateLimitCount(bucket: string, count: number): number {
  if (bucket.startsWith("resume-ai-unpaid-user:")) return Math.ceil(count / 2);
  if (bucket.startsWith("resume-ai-unpaid-ip:")) return Math.ceil((count * 6) / 20);
  return count;
}

function proxiedMethod(target: object, property: PropertyKey): unknown {
  const value = Reflect.get(target, property, target);
  return typeof value === "function" ? value.bind(target) : value;
}

function createResumePreviewRateLimitPolicy(env: ResumeBuilderEnv): RateLimitPolicy {
  const observations: RateLimitObservation[] = [];
  const db = new Proxy(env.DB as unknown as object, {
    get(target, property) {
      if (property !== "prepare") return proxiedMethod(target, property);
      return (query: string) => {
        const statement = env.DB.prepare(query);
        if (!query.includes("INSERT INTO rate_limits")) return statement;
        return new Proxy(statement as unknown as object, {
          get(statementTarget, statementProperty) {
            if (statementProperty !== "bind") return proxiedMethod(statementTarget, statementProperty);
            return (...values: unknown[]) => {
              const bound = statement.bind(...values);
              const bucket = typeof values[0] === "string" ? values[0] : "";
              const windowStart = typeof values[1] === "number" ? values[1] : 0;
              if (!bucket.startsWith("resume-ai-")) return bound;
              return new Proxy(bound as unknown as object, {
                get(boundTarget, boundProperty) {
                  if (boundProperty !== "first") return proxiedMethod(boundTarget, boundProperty);
                  return async (...args: unknown[]) => {
                    const first = Reflect.get(boundTarget, "first", boundTarget);
                    const row = await (first as (...values: unknown[]) => Promise<unknown>).apply(boundTarget, args);
                    if (!row || typeof row !== "object" || Array.isArray(row)) return row;
                    const record = row as Record<string, unknown>;
                    const count = typeof record.count === "number" ? record.count : Number(record.count);
                    if (!Number.isFinite(count)) return row;
                    const effectiveCount = effectiveResumePreviewRateLimitCount(bucket, count);
                    observations.push({ bucket, count, effectiveCount, windowStart });
                    return { ...record, count: effectiveCount };
                  };
                },
              }) as unknown as D1PreparedStatement;
            };
          },
        }) as unknown as D1PreparedStatement;
      };
    },
  }) as unknown as D1Database;
  return { env: { ...env, DB: db }, observations };
}

function configuredGlobalRateLimit(env: ResumeBuilderEnv): number {
  const configured = Number.parseInt(env.RESUME_AI_DAILY_ATTEMPT_LIMIT ?? "", 10);
  return Number.isSafeInteger(configured) && configured > 0 ? Math.min(configured, 10_000) : 250;
}

function rateLimitThreshold(bucket: string, env: ResumeBuilderEnv): number | null {
  if (bucket.startsWith("resume-ai-unpaid-user:")) return 3;
  if (bucket.startsWith("resume-ai-unpaid-ip:")) return 6;
  if (bucket.startsWith("resume-ai-user:")) return 10;
  if (bucket.startsWith("resume-ai-ip:")) return 20;
  if (bucket === "resume-ai-global") return configuredGlobalRateLimit(env);
  return null;
}

export function resumePreviewRateLimitReason(
  observations: ReadonlyArray<Pick<RateLimitObservation, "bucket" | "effectiveCount">>,
  env: Pick<ResumeBuilderEnv, "RESUME_AI_DAILY_ATTEMPT_LIMIT"> = {},
): string {
  for (const observation of observations) {
    const threshold = rateLimitThreshold(observation.bucket, env as ResumeBuilderEnv);
    if (threshold === null || observation.effectiveCount <= threshold) continue;
    if (observation.bucket.startsWith("resume-ai-unpaid-user:")) return "UNPAID_USER_DAILY";
    if (observation.bucket.startsWith("resume-ai-unpaid-ip:")) return "UNPAID_IP_DAILY";
    if (observation.bucket.startsWith("resume-ai-user:")) return "USER_DAILY";
    if (observation.bucket.startsWith("resume-ai-ip:")) return "IP_DAILY";
    if (observation.bucket === "resume-ai-global") return "GLOBAL_DAILY";
  }
  return "UNKNOWN";
}

function customerRateLimitMessage(reason: string): string {
  if (reason === "GLOBAL_DAILY") {
    return "Resume building is temporarily at capacity. Your information is saved. Please try again later.";
  }
  if (reason === "IP_DAILY" || reason === "UNPAID_IP_DAILY") {
    return "This network has reached its resume-build limit for today. Your information is saved. Please try again after the limit resets.";
  }
  return "This account has reached its resume-build limit for today. Your information is saved. Please try again after the limit resets.";
}

async function refundRateLimitObservations(
  env: ResumeBuilderEnv,
  observations: ReadonlyArray<RateLimitObservation>,
  unpaidOnly: boolean,
): Promise<void> {
  const unique = new Map<string, RateLimitObservation>();
  for (const observation of observations) {
    const isUnpaid = observation.bucket.startsWith("resume-ai-unpaid-user:")
      || observation.bucket.startsWith("resume-ai-unpaid-ip:");
    if (unpaidOnly && !isUnpaid) continue;
    unique.set(`${observation.bucket}:${observation.windowStart}`, observation);
  }
  await Promise.all(Array.from(unique.values()).map((observation) => env.DB.prepare(
    `UPDATE rate_limits
     SET count = CASE WHEN count > 0 THEN count - 1 ELSE 0 END
     WHERE bucket = ? AND window_start = ?`,
  ).bind(observation.bucket, observation.windowStart).run()));
}

async function handleRateLimitedGeneration(
  response: Response,
  env: ResumeBuilderEnv,
  policy: RateLimitPolicy,
): Promise<Response> {
  const payload = await responseJson(response);
  if (response.status !== 429 || payload?.code !== "RATE_LIMITED") return response;
  const reason = resumePreviewRateLimitReason(policy.observations, env);
  await refundRateLimitObservations(env, policy.observations, false);
  return rewrittenJson(response, {
    ...payload,
    rateLimitReason: reason,
    message: customerRateLimitMessage(reason),
  }, 429);
}

async function refundUnpaidPreviewLimitOnFailure(
  response: Response,
  env: ResumeBuilderEnv,
  policy: RateLimitPolicy,
): Promise<void> {
  if (response.ok || response.status === 429) return;
  await refundRateLimitObservations(env, policy.observations, true);
}

async function preserveImportedContact(requestCopy: JsonReadableRequest, response: Response): Promise<Response> {
  if (!response.ok) return response;
  const requestBody = await jsonBody(requestCopy);
  const payload = await responseJson(response);
  if (!requestBody || !payload || !payload.prefill || typeof payload.prefill !== "object" || Array.isArray(payload.prefill)) {
    return response;
  }
  const sourceText = typeof requestBody.text === "string" ? requestBody.text : "";
  const prefill = { ...(payload.prefill as Record<string, unknown>) };
  const contactValue = prefill.contact;
  const contact = contactValue && typeof contactValue === "object" && !Array.isArray(contactValue)
    ? { ...(contactValue as Record<string, unknown>) }
    : {};
  const email = firstResumeEmail(sourceText);
  const phone = firstResumePhone(sourceText);
  if (email) contact.email = email;
  if (!contact.phone && phone) contact.phone = phone;
  prefill.contact = contact;
  return rewrittenJson(response, { ...payload, prefill });
}

async function prepareCanonicalImport(requestCopy: JsonReadableRequest): Promise<CanonicalImportPlan | null> {
  const requestBody = await jsonBody(requestCopy);
  const sourceText = typeof requestBody?.text === "string" ? requestBody.text.trim() : "";
  if (!sourceText) return null;
  return { sourceText, canonical: buildCanonicalSourceRecord(sourceText) };
}

async function finalizeSourceFirstImport(
  response: Response,
  plan: CanonicalImportPlan,
): Promise<Response> {
  // Preserve authentication, origin, validation, and rate-limit failures from
  // the proven base route. Canonical parsing never bypasses access controls.
  if (!response.ok && response.status < 500) return response;

  if (!plan.canonical.coverage.ready) {
    return rewrittenJson(response, {
      ok: false,
      code: "CANONICAL_SOURCE_PARSE_FAILED",
      retryable: true,
      action: "review_import",
      runConsumed: false,
      sourceFirst: true,
      parserVersion: plan.canonical.parserVersion,
      issues: plan.canonical.coverage.issues,
      warnings: plan.canonical.coverage.warnings,
      sourceRoleSignals: plan.canonical.coverage.sourceRoleSignals,
      extractedRoles: plan.canonical.coverage.extractedRoles,
      message: "HUSTL3 BOT could not establish a complete source record from this resume. AI was not allowed to replace or invent the missing structure.",
    }, 422);
  }

  const payload = response.ok ? await responseJson(response) : null;
  const aiPrefill = payload?.prefill && typeof payload.prefill === "object" && !Array.isArray(payload.prefill)
    ? payload.prefill
    : {};
  const merged = mergeCanonicalWithAiEnrichment(plan.sourceText, plan.canonical, aiPrefill);
  const immutability = validateCanonicalImmutability(plan.canonical, merged);
  const coverage = assessResumeExtractionCoverage(plan.sourceText, merged);

  if (!immutability.valid || !coverage.ready) {
    return rewrittenJson(response, {
      ok: false,
      code: "CANONICAL_SOURCE_INTEGRITY_FAILED",
      retryable: true,
      action: "review_import",
      runConsumed: false,
      sourceFirst: true,
      parserVersion: plan.canonical.parserVersion,
      immutableIssues: immutability.issues,
      issues: coverage.issues,
      warnings: coverage.warnings,
      sourceRoleSignals: coverage.sourceRoleSignals,
      extractedRoles: coverage.extractedRoles,
      message: "HUSTL3 BOT stopped because the canonical source facts did not survive import verification unchanged. Nothing was generated.",
    }, 422);
  }

  return rewrittenJson(response, {
    ...(payload ?? {}),
    ok: true,
    prefill: merged,
    sourceFirst: true,
    parserVersion: plan.canonical.parserVersion,
    aiEnrichmentApplied: Boolean(payload?.prefill),
    aiEnrichmentOptional: true,
    immutableSourceFactsVerified: true,
    extractionCoverage: {
      ready: true,
      sourceRoleSignals: coverage.sourceRoleSignals,
      extractedRoles: coverage.extractedRoles,
      warnings: coverage.warnings,
    },
  }, 200);
}

async function reconcileImportedExtraction(
  requestCopy: JsonReadableRequest,
  retryRequest: BaseResumeRequest,
  response: Response,
  env: ResumeBuilderEnv,
  dependencies: ResumeBuilderDependencies,
): Promise<Response> {
  if (!response.ok) return response;
  const requestBody = await jsonBody(requestCopy);
  const payload = await responseJson(response);
  if (!requestBody || !payload || !payload.prefill || typeof payload.prefill !== "object" || Array.isArray(payload.prefill)) {
    return response;
  }
  const sourceText = typeof requestBody.text === "string" ? requestBody.text : "";
  const firstCoverage = assessResumeExtractionCoverage(sourceText, payload.prefill);
  if (firstCoverage.ready) return response;

  const retry = await handleBaseResumeBuilderRoute(
    retryRequest,
    env,
    reconciliationDependencies(dependencies),
  );
  if (!retry || !retry.ok) {
    return rewrittenJson(response, {
      ok: false,
      code: "EXTRACTION_COVERAGE_FAILED",
      retryable: true,
      action: "retry_import",
      runConsumed: false,
      issues: firstCoverage.issues,
      message: "HUSTL3 BOT found resume details that were not fully captured. It retried the extraction, but the resume still needs another upload attempt before generation.",
    }, 422);
  }

  const retryPayload = await responseJson(retry);
  if (!retryPayload || !retryPayload.prefill || typeof retryPayload.prefill !== "object" || Array.isArray(retryPayload.prefill)) {
    return rewrittenJson(retry, {
      ok: false,
      code: "EXTRACTION_COVERAGE_FAILED",
      retryable: true,
      action: "retry_import",
      runConsumed: false,
      issues: firstCoverage.issues,
      message: "HUSTL3 BOT could not verify the uploaded resume extraction. Nothing was generated.",
    }, 422);
  }

  const retryCoverage = assessResumeExtractionCoverage(sourceText, retryPayload.prefill);
  if (!retryCoverage.ready) {
    const fallback = repairResumeExtractionFromSource(sourceText, retryPayload.prefill);
    const fallbackCoverage = assessResumeExtractionCoverage(sourceText, fallback.structured);
    if (!fallbackCoverage.ready) {
      return rewrittenJson(retry, {
        ok: false,
        code: "EXTRACTION_COVERAGE_FAILED",
        retryable: true,
        action: "retry_import",
        runConsumed: false,
        issues: fallbackCoverage.issues,
        warnings: fallbackCoverage.warnings,
        sourceRoleSignals: fallbackCoverage.sourceRoleSignals,
        extractedRoles: fallbackCoverage.extractedRoles,
        deterministicFallbackAttempted: true,
        message: "HUSTL3 BOT stopped because the uploaded resume was still not completely extracted after AI reconciliation and deterministic source recovery. Nothing was generated.",
      }, 422);
    }

    return rewrittenJson(retry, {
      ...retryPayload,
      prefill: fallback.structured,
      reconciled: true,
      deterministicFallbackApplied: fallback.repaired,
      extractionCoverage: {
        ready: true,
        sourceRoleSignals: fallbackCoverage.sourceRoleSignals,
        extractedRoles: fallbackCoverage.extractedRoles,
        warnings: fallbackCoverage.warnings,
      },
    });
  }

  return rewrittenJson(retry, {
    ...retryPayload,
    reconciled: true,
    extractionCoverage: {
      ready: true,
      sourceRoleSignals: retryCoverage.sourceRoleSignals,
      extractedRoles: retryCoverage.extractedRoles,
    },
  });
}

function isResumeTheme(theme: unknown): theme is ResumeTheme {
  return theme === "plain" || theme === "navy";
}

function themeOnlyBody(body: Record<string, unknown> | null): body is { theme: ResumeTheme } {
  return Boolean(body && Object.keys(body).length === 1 && isResumeTheme(body.theme));
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function storeThemeFile(
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

async function rerenderResumeTheme(
  env: ResumeBuilderEnv,
  dependencies: ResumeBuilderDependencies,
  resumeId: string,
  theme: ResumeTheme,
): Promise<void> {
  const record = await env.DB.prepare(
    "SELECT user_id, generated_json FROM resumes WHERE resume_id = ? AND deleted_at IS NULL LIMIT 1",
  ).bind(resumeId).first<{ user_id: string; generated_json: string | null }>();
  if (!record?.generated_json) return;
  if (!env.BOOKS) throw new Error("Resume file storage is unavailable.");

  const generated = JSON.parse(record.generated_json) as GeneratedResume;
  const generationId = crypto.randomUUID();
  const newObjectKeys = (["docx", "pdf", "preview"] as const).map((format) => {
    const extension = format === "docx" ? "docx" : "pdf";
    return `resume-builder/${record.user_id}/${resumeId}/generations/${generationId}/${format}.${extension}`;
  });
  const previousObjectKeys = (await Promise.all(
    (["docx", "pdf", "preview"] as const).map((format) => env.DB.prepare(
      "SELECT object_key FROM resume_files WHERE resume_id = ? AND user_id = ? AND format = ? LIMIT 1",
    ).bind(resumeId, record.user_id, format).first<{ object_key: string }>()),
  )).flatMap((row) => row?.object_key ? [row.object_key] : []);

  try {
    const [docx, pdf, preview] = await Promise.all([
      (dependencies.createDocx ?? createResumeDocx)(generated, theme),
      (dependencies.createPdf ?? createResumePdf)(generated, false, theme),
      (dependencies.createPdf ?? createResumePdf)(generated, true, theme),
    ]);
    const fileStatements = await Promise.all([
      storeThemeFile(env, record.user_id, resumeId, generationId, "docx", docx),
      storeThemeFile(env, record.user_id, resumeId, generationId, "pdf", pdf),
      storeThemeFile(env, record.user_id, resumeId, generationId, "preview", preview),
    ]);
    await env.DB.batch(fileStatements);
    await Promise.allSettled(
      previousObjectKeys.filter((key) => !newObjectKeys.includes(key)).map((key) => env.BOOKS!.delete(key)),
    );
  } catch (error) {
    await Promise.allSettled(newObjectKeys.map((key) => env.BOOKS!.delete(key)));
    throw error;
  }
}

function shouldAutoRetryNumericGuard(env: ResumeBuilderEnv): boolean {
  return env.RESUME_AI_PROVIDER?.trim().toLowerCase() === "gemini"
    || Boolean(env.RESUME_AI_BRIDGE_URL?.trim());
}

async function authenticatedResumeProbe(
  request: Request,
  env: ResumeBuilderEnv,
  dependencies: ResumeBuilderDependencies,
  resumeId: string,
): Promise<Response | null> {
  const probeUrl = new URL(request.url);
  probeUrl.pathname = `/api/resume-builder/resumes/${encodeURIComponent(resumeId)}`;
  probeUrl.search = "";
  return handleBaseResumeBuilderRoute(
    new Request(probeUrl.toString(), { method: "GET", headers: request.headers }),
    env,
    preservationDependencies(dependencies, false),
  );
}

async function enforceUploadExtractionCoverageBeforeGeneration(
  request: Request,
  env: ResumeBuilderEnv,
  dependencies: ResumeBuilderDependencies,
  resumeId: string,
): Promise<Response | null> {
  const probe = await authenticatedResumeProbe(request, env, dependencies, resumeId);
  if (!probe || !probe.ok) return probe;

  const record = await env.DB.prepare(
    "SELECT intake_json FROM resumes WHERE resume_id = ? AND deleted_at IS NULL LIMIT 1",
  ).bind(resumeId).first<{ intake_json: string }>();
  if (!record?.intake_json) return rewrittenJson(probe, {
    ok: false,
    code: "EXTRACTION_COVERAGE_ERROR",
    retryable: true,
    action: "retry_import",
    runConsumed: false,
    message: "HUSTL3 BOT could not verify the saved uploaded resume before generation. No AI run was used.",
  }, 503);

  try {
    const intake = JSON.parse(record.intake_json) as unknown;
    const coverage = assessSavedIntakeExtractionCoverage(intake);
    if (coverage.ready) return null;
    return rewrittenJson(probe, {
      ok: false,
      code: "EXTRACTION_COVERAGE_FAILED",
      retryable: true,
      action: "retry_import",
      paymentSafe: true,
      runConsumed: false,
      issues: coverage.issues,
      missing: coverage.issues.map((issue) => issue.message),
      sourceRoleSignals: coverage.sourceRoleSignals,
      extractedRoles: coverage.extractedRoles,
      intakeUrl: `/resume-builder/intake?resume_id=${encodeURIComponent(resumeId)}`,
      message: "HUSTL3 BOT stopped generation because the uploaded resume was not fully captured in the saved intake. No AI generation run was used and no weak preview was produced.",
    }, 422);
  } catch (error) {
    console.error("Resume extraction coverage preflight failed", error);
    return rewrittenJson(probe, {
      ok: false,
      code: "EXTRACTION_COVERAGE_ERROR",
      retryable: true,
      action: "retry_import",
      runConsumed: false,
      message: "HUSTL3 BOT could not verify the uploaded resume before generation. No AI run was used.",
    }, 503);
  }
}

async function enforceCheckoutQualityGate(
  request: Request,
  env: ResumeBuilderEnv,
  dependencies: ResumeBuilderDependencies,
  resumeId: string,
): Promise<Response | null> {
  const probe = await authenticatedResumeProbe(request, env, dependencies, resumeId);
  if (!probe || !probe.ok) return probe;
  try {
    const gate = await hardenGeneratedResumePackage(env, dependencies, resumeId);
    if (gate.ready) return null;
    return rewrittenJson(probe, {
      ok: false,
      code: "QUALITY_GATE_FAILED",
      paymentSafe: true,
      runConsumed: false,
      qualityScore: gate.score,
      issues: gate.issues,
      message: "This resume is not eligible for checkout yet. HUSTL3 BOT must produce a complete, verified resume before payment can open.",
    }, 409);
  } catch (error) {
    console.error("Resume checkout quality preflight failed", error);
    return rewrittenJson(probe, {
      ok: false,
      code: "QUALITY_GATE_ERROR",
      paymentSafe: true,
      runConsumed: false,
      message: "Checkout is paused because the resume package could not be verified safely. Your existing resume and payment status are unchanged.",
    }, 503);
  }
}

async function hardenSuccessfulGeneration(
  response: Response,
  env: ResumeBuilderEnv,
  dependencies: ResumeBuilderDependencies,
  resumeId: string,
): Promise<Response> {
  if (!response.ok) return response;
  try {
    const gate = await hardenGeneratedResumePackage(env, dependencies, resumeId);
    if (!gate.ready) {
      return rewrittenJson(response, {
        ok: false,
        code: "QUALITY_GATE_FAILED",
        retryable: false,
        action: "return_to_intake",
        paymentSafe: true,
        runConsumed: false,
        qualityScore: gate.score,
        issues: gate.issues,
        missing: gate.issues,
        intakeUrl: `/resume-builder/intake?resume_id=${encodeURIComponent(resumeId)}`,
        message: "HUSTL3 BOT stopped this draft because it is not complete enough to show as a paid-quality preview. Review the intake and rebuild.",
      }, 422);
    }
    if (!gate.changed) return response;
    const payload = await responseJson(response) ?? {};
    return rewrittenJson(response, {
      ...payload,
      qualityHardened: true,
      qualityScore: gate.score,
      message: "Your protected preview passed the final completeness gate and is ready to review.",
    });
  } catch (error) {
    console.error("Resume post-generation hardening failed", error);
    return rewrittenJson(response, {
      ok: false,
      code: "QUALITY_GATE_ERROR",
      retryable: true,
      action: "retry_generation",
      paymentSafe: true,
      runConsumed: false,
      message: "The resume was generated, but the final quality verification could not finish. No payment can open until verification succeeds.",
    }, 503);
  }
}

/**
 * Keeps the proven Resume Builder backend intact while adding protections:
 * 1) uploaded resumes establish an immutable canonical source record before AI enrichment;
 * 2) on the Gemini production path, an AI-created unsupported number is retried automatically;
 * 3) switching between Classic Black and Red Accent re-renders the existing PDF/DOCX/preview
 *    without spending an AI correction run or changing any resume content;
 * 4) the paid $9.99 entitlement includes an on-demand matching cover letter that shares the
 *    existing three-correction package limit instead of creating an unbounded AI-cost path;
 * 5) free-preview rate limits tolerate normal retries while failed generations do not consume
 *    the prospect-facing preview allowance. The original user/IP/global cost controls remain;
 * 6) generated packages are deterministically hardened before review and checkout is blocked
 *    unless the saved resume still passes the critical completeness gate.
 */
export async function handleResumeBuilderRoute(
  request: Request,
  env: ResumeBuilderEnv,
  dependencies: ResumeBuilderDependencies = {},
): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;

  const coverLetterResponse = await handleCoverLetterRoute(request, env, dependencies);
  if (coverLetterResponse) return coverLetterResponse;

  const importPath = pathname === "/api/resume-builder/resume-import";
  const generationPathMatch = pathname.match(/^\/api\/resume-builder\/resumes\/([^/]+)\/generate$/);
  const generatePath = Boolean(generationPathMatch);
  const checkoutPathMatch = pathname.match(/^\/api\/resume-builder\/resumes\/([^/]+)\/checkout$/);
  const resumePathMatch = pathname.match(/^\/api\/resume-builder\/resumes\/([^/]+)$/);
  const themeRequestCopy = request.method === "PATCH" && resumePathMatch ? request.clone() : null;
  const themeBody = themeRequestCopy ? await jsonBody(themeRequestCopy) : null;
  const themeChange = themeOnlyBody(themeBody) ? themeBody : null;
  const importContactCopy = importPath ? request.clone() : null;
  const importCoverageCopy = importPath ? request.clone() : null;
  const importRetryCopy = importPath ? request.clone() : null;
  const importCanonicalCopy = importPath ? request.clone() : null;
  const canonicalImportPlan = importCanonicalCopy ? await prepareCanonicalImport(importCanonicalCopy) : null;
  const retryRequest = generatePath && shouldAutoRetryNumericGuard(env) ? request.clone() : null;

  if (request.method === "POST" && generationPathMatch) {
    const blocked = await enforceUploadExtractionCoverageBeforeGeneration(request, env, dependencies, generationPathMatch[1]);
    if (blocked) return blocked;
  }

  if (request.method === "POST" && checkoutPathMatch) {
    const blocked = await enforceCheckoutQualityGate(request, env, dependencies, checkoutPathMatch[1]);
    if (blocked) return blocked;
  }

  let previousTheme: ResumeTheme | null = null;
  let hadGeneratedResume = false;
  if (themeChange && resumePathMatch) {
    const probe = await handleBaseResumeBuilderRoute(
      new Request(request.url, { method: "GET", headers: request.headers }),
      env,
      preservationDependencies(dependencies, false),
    );
    if (!probe) return null;
    if (!probe.ok) return probe;
    const probePayload = await responseJson(probe);
    const resumeValue = probePayload?.resume;
    if (!resumeValue || typeof resumeValue !== "object" || Array.isArray(resumeValue)) return probe;
    const resume = resumeValue as Record<string, unknown>;
    previousTheme = isResumeTheme(resume.theme) ? resume.theme : "plain";
    hadGeneratedResume = typeof resume.previewUrl === "string" && resume.previewUrl.length > 0;
  }

  const firstRateLimitPolicy = generatePath ? createResumePreviewRateLimitPolicy(env) : null;
  const first = await handleBaseResumeBuilderRoute(
    request as unknown as BaseResumeRequest,
    firstRateLimitPolicy?.env ?? env,
    preservationDependencies(dependencies, false),
  );
  if (!first) return null;

  if (firstRateLimitPolicy) {
    if (first.status === 429) return handleRateLimitedGeneration(first, env, firstRateLimitPolicy);
    await refundUnpaidPreviewLimitOnFailure(first, env, firstRateLimitPolicy);
  }

  if (importPath && canonicalImportPlan && importContactCopy) {
    const sourceFirst = await finalizeSourceFirstImport(first, canonicalImportPlan);
    return preserveImportedContact(importContactCopy, sourceFirst);
  }

  // Legacy reconciliation remains only as a compatibility path for malformed
  // requests that did not yield source text. Normal PDF/DOCX imports never let
  // AI own job identity, dates, education, credentials, or contact facts.
  if (importPath && importContactCopy && importCoverageCopy && importRetryCopy) {
    const reconciled = await reconcileImportedExtraction(
      importCoverageCopy,
      importRetryCopy as unknown as BaseResumeRequest,
      first,
      env,
      dependencies,
    );
    return preserveImportedContact(importContactCopy, reconciled);
  }

  if (themeChange && resumePathMatch && first.ok) {
    let coverLetterRefreshed = false;
    if (hadGeneratedResume) {
      try {
        coverLetterRefreshed = await rerenderCoverLetterTheme(env, resumePathMatch[1], themeChange.theme);
        await rerenderResumeTheme(env, dependencies, resumePathMatch[1], themeChange.theme);
      } catch (error) {
        console.error("Resume package theme rerender failed", error);
        if (coverLetterRefreshed && previousTheme) {
          try {
            await rerenderCoverLetterTheme(env, resumePathMatch[1], previousTheme);
          } catch (rollbackError) {
            console.error("Cover letter theme rollback failed", rollbackError);
          }
        }
        if (previousTheme) {
          await env.DB.prepare(
            "UPDATE resumes SET theme = ?, updated_at = CURRENT_TIMESTAMP WHERE resume_id = ? AND deleted_at IS NULL",
          ).bind(previousTheme, resumePathMatch[1]).run();
        }
        return rewrittenJson(first, {
          ok: false,
          message: "We could not switch the resume package style. Your existing files are unchanged.",
        }, 500);
      }
    }
    const payload = await responseJson(first) ?? {};
    return rewrittenJson(first, {
      ...payload,
      runConsumed: false,
      filesRefreshed: hadGeneratedResume,
      coverLetterRefreshed,
      message: hadGeneratedResume
        ? coverLetterRefreshed
          ? "Style updated. Your resume and matching cover letter files were refreshed without using an AI run."
          : "Resume style updated. Your preview, PDF, and DOCX were refreshed without using an AI run."
        : "Resume style selected. Classic Black remains the default unless you choose Red Accent.",
    });
  }

  if (request.method === "GET" && resumePathMatch && first.ok) {
    return augmentResumeWithCoverLetter(first, env, resumePathMatch[1]);
  }

  if (generatePath && generationPathMatch && first.ok) {
    return hardenSuccessfulGeneration(first, env, dependencies, generationPathMatch[1]);
  }

  if (!generatePath || !retryRequest || first.status !== 422) return first;
  const firstFailure = await responseJson(first);
  if (firstFailure?.code !== "UNSUPPORTED_NUMERIC_CLAIM") return first;

  const retryRateLimitPolicy = createResumePreviewRateLimitPolicy(env);
  const retry = await handleBaseResumeBuilderRoute(
    retryRequest as unknown as BaseResumeRequest,
    retryRateLimitPolicy.env,
    preservationDependencies(dependencies, true),
  );
  if (!retry) return null;
  if (retry.status === 429) return handleRateLimitedGeneration(retry, env, retryRateLimitPolicy);
  await refundUnpaidPreviewLimitOnFailure(retry, env, retryRateLimitPolicy);
  if (retry.ok && generationPathMatch) {
    return hardenSuccessfulGeneration(retry, env, dependencies, generationPathMatch[1]);
  }
  if (retry.status !== 422) return retry;
  const retryFailure = await responseJson(retry);
  if (retryFailure?.code !== "UNSUPPORTED_NUMERIC_CLAIM") return retry;

  return rewrittenJson(retry, {
    ...retryFailure,
    retryable: true,
    action: "retry_generation",
    runConsumed: false,
    missing: [],
    intakeUrl: null,
    message: "HUSTL3 BOT automatically retried the build, but unsupported numeric wording still remained. No customer AI run was consumed. Only review numeric facts that are actually present in your uploaded resume or intake before rebuilding.",
  }, 502);
}
