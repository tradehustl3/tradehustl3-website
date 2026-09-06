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

export * from "./resume-builder-base";

type BaseResumeRequest = Parameters<typeof handleBaseResumeBuilderRoute>[0];
type JsonReadableRequest = { json(): Promise<unknown> };

const IMPORT_PRESERVATION_INSTRUCTION = `Uploaded-resume preservation rule:
Preserve every explicit employer, job title, location, date range, certification, education item, contact detail available in the source schema, and every substantive responsibility or accomplishment. Do not summarize away supported facts. Keep every number exactly grounded in the source. When a role has multiple bullets, retain their factual content in responsibilities instead of collapsing the role to a generic sentence. Never invent a missing fact.`;

const GENERATION_PRESERVATION_INSTRUCTION = `Uploaded-resume enhancement rule:
Enhancement means preserve first, then improve wording. Keep every supported contact detail, employer, job title, location, date, certification, education item, and substantive work-history fact from the intake. Reword duties for clarity, trade-specific relevance, and ATS-friendly structure without reducing factual content. Never add a number, percentage, count, date, years-of-experience claim, unit count, team size, equipment size, or quantity unless that numeric fact is explicitly supported by the intake. If metrics are absent, write strong nonnumeric bullets instead of inventing metrics.`;

const STRICT_NUMERIC_RETRY_INSTRUCTION = `Safety retry rule:
A previous draft was rejected because it introduced unsupported numeric wording. Use only numeric facts already supported by the intake. Do not create estimates, percentages, counts, quantities, years, dates, team sizes, equipment sizes, work-order volumes, or performance metrics. Prefer accurate nonnumeric wording whenever a number is not required.`;

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

function preservationDependencies(
  dependencies: ResumeBuilderDependencies,
  strictNumericRetry: boolean,
): ResumeBuilderDependencies {
  return {
    ...dependencies,
    geminiFetch: wrapGeminiFetch(dependencies.geminiFetch ?? fetch, strictNumericRetry),
    anthropicFetch: wrapAnthropicFetch(dependencies.anthropicFetch ?? fetch, strictNumericRetry),
  };
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

function isGeneratePath(pathname: string): boolean {
  return /^\/api\/resume-builder\/resumes\/[^/]+\/generate$/.test(pathname);
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

/**
 * Keeps the proven Resume Builder backend intact while adding protections:
 * 1) uploaded resume facts are preserved more aggressively through import/generation prompts;
 * 2) on the Gemini production path, an AI-created unsupported number is retried automatically;
 * 3) switching between Classic Black and Red Accent re-renders the existing PDF/DOCX/preview
 *    without spending an AI correction run or changing any resume content.
 */
export async function handleResumeBuilderRoute(
  request: Request,
  env: ResumeBuilderEnv,
  dependencies: ResumeBuilderDependencies = {},
): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  const importPath = pathname === "/api/resume-builder/resume-import";
  const generatePath = isGeneratePath(pathname);
  const resumePathMatch = pathname.match(/^\/api\/resume-builder\/resumes\/([^/]+)$/);
  const themeRequestCopy = request.method === "PATCH" && resumePathMatch ? request.clone() : null;
  const themeBody = themeRequestCopy ? await jsonBody(themeRequestCopy) : null;
  const themeChange = themeOnlyBody(themeBody) ? themeBody : null;
  const importCopy = importPath ? request.clone() : null;
  const retryRequest = generatePath && shouldAutoRetryNumericGuard(env) ? request.clone() : null;

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

  const first = await handleBaseResumeBuilderRoute(
    request as unknown as BaseResumeRequest,
    env,
    preservationDependencies(dependencies, false),
  );
  if (!first) return null;

  if (importPath && importCopy) {
    return preserveImportedContact(importCopy, first);
  }

  if (themeChange && resumePathMatch && first.ok) {
    if (hadGeneratedResume) {
      try {
        await rerenderResumeTheme(env, dependencies, resumePathMatch[1], themeChange.theme);
      } catch (error) {
        console.error("Resume theme rerender failed", error);
        if (previousTheme) {
          await env.DB.prepare(
            "UPDATE resumes SET theme = ?, updated_at = CURRENT_TIMESTAMP WHERE resume_id = ? AND deleted_at IS NULL",
          ).bind(previousTheme, resumePathMatch[1]).run();
        }
        return rewrittenJson(first, {
          ok: false,
          message: "We could not switch the resume style. Your existing files are unchanged.",
        }, 500);
      }
    }
    const payload = await responseJson(first) ?? {};
    return rewrittenJson(first, {
      ...payload,
      runConsumed: false,
      filesRefreshed: hadGeneratedResume,
      message: hadGeneratedResume
        ? "Resume style updated. Your preview, PDF, and DOCX were refreshed without using an AI run."
        : "Resume style selected. Classic Black remains the default unless you choose Red Accent.",
    });
  }

  if (!generatePath || !retryRequest || first.status !== 422) return first;
  const firstFailure = await responseJson(first);
  if (firstFailure?.code !== "UNSUPPORTED_NUMERIC_CLAIM") return first;

  const retry = await handleBaseResumeBuilderRoute(
    retryRequest as unknown as BaseResumeRequest,
    env,
    preservationDependencies(dependencies, true),
  );
  if (!retry || retry.status !== 422) return retry;
  const retryFailure = await responseJson(retry);
  if (retryFailure?.code !== "UNSUPPORTED_NUMERIC_CLAIM") return retry;

  return rewrittenJson(retry, {
    ...retryFailure,
    retryable: true,
    action: "retry_generation",
    runConsumed: false,
    missing: [],
    intakeUrl: null,
    message: "HUSTL3 BOT caught unsupported numeric wording and did not consume a customer AI run. Try the build again; do not add or invent metrics just to continue.",
  }, 502);
}