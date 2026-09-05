import {
  handleResumeBuilderRoute as handleBaseResumeBuilderRoute,
  type ResumeBuilderDependencies,
  type ResumeBuilderEnv,
} from "./resume-builder-base";

export * from "./resume-builder-base";

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

async function jsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const parsed = await request.json() as unknown;
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

async function preserveImportedContact(requestCopy: Request, response: Response): Promise<Response> {
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

function shouldAutoRetryNumericGuard(env: ResumeBuilderEnv): boolean {
  return env.RESUME_AI_PROVIDER?.trim().toLowerCase() === "gemini"
    || Boolean(env.RESUME_AI_BRIDGE_URL?.trim());
}

/**
 * Keeps the proven Resume Builder backend intact while adding two protections:
 * 1) uploaded resume facts are preserved more aggressively through import/generation prompts;
 * 2) on the Gemini production path, an AI-created unsupported number is retried automatically
 *    instead of sending the customer back to intake to invent metrics that were never supplied.
 */
export async function handleResumeBuilderRoute(
  request: Request,
  env: ResumeBuilderEnv,
  dependencies: ResumeBuilderDependencies = {},
): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  const importPath = pathname === "/api/resume-builder/resume-import";
  const generatePath = isGeneratePath(pathname);
  const importCopy = importPath ? request.clone() : null;
  const retryRequest = generatePath && shouldAutoRetryNumericGuard(env) ? request.clone() : null;

  const first = await handleBaseResumeBuilderRoute(
    request,
    env,
    preservationDependencies(dependencies, false),
  );
  if (!first) return null;

  if (importPath && importCopy) {
    return preserveImportedContact(importCopy, first);
  }

  if (!generatePath || !retryRequest || first.status !== 422) return first;
  const firstFailure = await responseJson(first);
  if (firstFailure?.code !== "UNSUPPORTED_NUMERIC_CLAIM") return first;

  const retry = await handleBaseResumeBuilderRoute(
    retryRequest,
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
