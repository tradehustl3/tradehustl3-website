import assert from "node:assert/strict";
import test from "node:test";
import { handleResumeBuilderRoute } from "../worker/resume-builder";
import type { ResumeBuilderDependencies } from "../worker/resume-builder";
import type { GeneratedResume } from "../worker/resume-documents";

const sessionCookie = "tradehustl3_resume_session=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const encoder = new TextEncoder();

const entryLevelResume: GeneratedResume = {
  basics: { fullName: "Devon Price", targetTitle: "HVAC Apprentice" },
  summary: "Trade-school graduate with hands-on lab training and a strong safety mindset.",
  skills: ["Brazing", "Multimeter"],
  certifications: [{ name: "OSHA 10" }],
  experience: [],
  education: [{ credential: "HVAC Certificate", institution: "Akron Career Center" }],
  additionalInformation: [],
};

const selfEmployedResume: GeneratedResume = {
  basics: { fullName: "Rosa Delgado", targetTitle: "Maintenance Technician" },
  summary: "Maintenance worker with residential repair and supported side-work experience.",
  skills: ["Drywall repair", "Basic plumbing"],
  certifications: [],
  experience: [{
    jobTitle: "Self-Employed Handyman",
    bullets: ["Completed residential drywall and fixture repairs for local homeowners"],
  }],
  education: [],
  additionalInformation: [],
};

const emptyOutput = {
  basics: { fullName: "", targetTitle: "" },
  summary: "",
  skills: [],
  certifications: [],
  experience: [],
  education: [],
  additionalInformation: [],
};

const entryIntake = {
  contact: { fullName: "Devon Price" },
  career: {
    yearsExperience: "No paid experience yet",
    summaryNotes: "Trade-school graduate with hands-on lab training and a strong safety mindset",
    skillsAndTools: "Brazing, multimeter",
    licensesAndCertifications: "OSHA ten",
  },
  experience: [],
  education: "HVAC Certificate, Akron Career Center",
};

type HarnessOptions = {
  generated?: GeneratedResume;
  used?: number;
  total?: number;
  intake?: unknown;
};

function harness(options: HarnessOptions = {}) {
  const state = {
    creditsUsed: options.used ?? 0,
    creditsTotal: options.total ?? 4,
    status: options.generated ? "ready" : "draft",
    generatedJson: options.generated ? JSON.stringify(options.generated) : null as string | null,
  };
  const writes: Array<{ sql: string; values: unknown[] }> = [];
  const batched: Array<{ sql: string; values: unknown[] }> = [];
  const objects = new Map<string, Uint8Array>();
  const deleted: string[] = [];
  const filePointers = new Map<string, string>();

  function statement(sql: string, values: unknown[]) {
    return {
      sql,
      values,
      async first() {
        if (/FROM sessions s/i.test(sql)) {
          return { user_id: "user-1", email: "member@example.com", full_name: "Member" };
        }
        if (/FROM resumes WHERE/i.test(sql)) {
          return {
            resume_id: "resume-1",
            user_id: "user-1",
            trade: "HVAC & Refrigeration",
            title: "HVAC Apprentice",
            intake_json: JSON.stringify(options.intake ?? entryIntake),
            generated_json: state.generatedJson,
            target_job_posting: null,
            status: state.status,
          };
        }
        if (/FROM entitlements/i.test(sql)) {
          return {
            entitlement_id: "entitlement-1",
            credits_total: state.creditsTotal,
            credits_used: state.creditsUsed,
            status: "active",
          };
        }
        if (/SELECT object_key FROM resume_files/i.test(sql)) {
          const key = filePointers.get(String(values[2]));
          return key ? { object_key: key } : null;
        }
        return null;
      },
      async run() {
        writes.push({ sql, values });
        if (/UPDATE resumes SET status = 'generating'/i.test(sql)) {
          if (state.status === "generating") return { meta: { changes: 0 } };
          state.status = "generating";
          return { meta: { changes: 1 } };
        }
        if (/UPDATE entitlements SET credits_used = credits_used \+ 1/i.test(sql)) {
          if (state.creditsUsed >= state.creditsTotal) return { meta: { changes: 0 } };
          state.creditsUsed += 1;
          return { meta: { changes: 1 } };
        }
        if (/UPDATE resumes SET status = \?/i.test(sql)) state.status = String(values[0]);
        return { meta: { changes: 1 } };
      },
    };
  }

  const DB = {
    prepare(sql: string) {
      return { bind: (...values: unknown[]) => statement(sql, values) };
    },
    async batch(statements: Array<{ sql: string; values: unknown[] }>) {
      for (const item of statements) {
        batched.push({ sql: item.sql, values: item.values });
        if (/UPDATE entitlements SET credits_used = CASE/i.test(item.sql)) {
          state.creditsUsed = Math.max(0, state.creditsUsed - 1);
        }
        if (/UPDATE resumes SET status = \?/i.test(item.sql)) state.status = String(item.values[0]);
        if (/UPDATE resumes SET generated_json/i.test(item.sql)) {
          state.generatedJson = String(item.values[0]);
          state.status = "ready";
        }
        if (/INSERT INTO resume_files/i.test(item.sql)) {
          filePointers.set(String(item.values[3]), String(item.values[4]));
        }
      }
      return [];
    },
  };

  const BOOKS = {
    async put(key: string, bytes: Uint8Array) { objects.set(key, bytes); },
    async get(key: string) { return objects.has(key) ? { body: objects.get(key) } : null; },
    async delete(key: string) { deleted.push(key); objects.delete(key); },
  };

  return { state, writes, batched, objects, deleted, filePointers, DB, BOOKS };
}

function request(body: Record<string, unknown> = {}) {
  return new Request("https://tradehustl3.com/api/resume-builder/resumes/resume-1/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: sessionCookie },
    body: JSON.stringify(body),
  });
}

function anthropicReturning(resume: unknown): ResumeBuilderDependencies["anthropicFetch"] {
  return (async () => new Response(JSON.stringify({
    content: [{ type: "text", text: JSON.stringify(resume) }],
    usage: { input_tokens: 10, output_tokens: 20 },
  }), { status: 200, headers: { "Content-Type": "application/json" } })) as typeof fetch;
}

function dependenciesFor(resume: unknown): ResumeBuilderDependencies {
  return {
    anthropicFetch: anthropicReturning(resume),
    createDocx: async (generated) => encoder.encode(`DOCX:${JSON.stringify(generated)}`),
    createPdf: async (generated, watermarked) => encoder.encode(`${watermarked ? "PREVIEW" : "PDF"}:${JSON.stringify(generated)}`),
  };
}

async function run(
  h: ReturnType<typeof harness>,
  dependencies: ResumeBuilderDependencies,
  body: Record<string, unknown> = {},
  books: unknown = h.BOOKS,
) {
  const response = await handleResumeBuilderRoute(
    request(body),
    { DB: h.DB as unknown as D1Database, BOOKS: books as R2Bucket, ANTHROPIC_API_KEY: "test-key" },
    dependencies,
  );
  assert.ok(response);
  return { response, payload: await response.json() as Record<string, unknown> };
}

test("entry-level candidate with no employment history generates successfully", async () => {
  const h = harness();
  const { response, payload } = await run(h, dependenciesFor(entryLevelResume));
  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(h.state.creditsUsed, 1);
  assert.equal(h.objects.size, 3);
});

test("Gemini generation uses structured output, bounded thinking, and the authenticated bridge", async () => {
  const h = harness();
  let calledUrl = "";
  let calledInit: RequestInit | undefined;
  const bridgeSecret = "bridge-test-secret-never-send-to-browser";
  const dependencies: ResumeBuilderDependencies = {
    geminiFetch: (async (input, init) => {
      calledUrl = String(input);
      calledInit = init;
      return new Response(JSON.stringify({
        candidates: [{
          finishReason: "STOP",
          content: { parts: [{ text: JSON.stringify(entryLevelResume) }] },
        }],
        usageMetadata: {
          promptTokenCount: 11,
          candidatesTokenCount: 22,
          thoughtsTokenCount: 3,
        },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch,
    createDocx: async (generated) => encoder.encode(`DOCX:${JSON.stringify(generated)}`),
    createPdf: async (generated, watermarked) => encoder.encode(`${watermarked ? "PREVIEW" : "PDF"}:${JSON.stringify(generated)}`),
  };

  const response = await handleResumeBuilderRoute(
    request(),
    {
      DB: h.DB as unknown as D1Database,
      BOOKS: h.BOOKS as unknown as R2Bucket,
      RESUME_AI_PROVIDER: "gemini",
      RESUME_AI_BRIDGE_URL: "https://resume-ai-bridge.example.run.app/",
      RESUME_AI_BRIDGE_SECRET: bridgeSecret,
    },
    dependencies,
  );

  assert.ok(response);
  assert.equal(response.status, 200);
  assert.equal(calledUrl, "https://resume-ai-bridge.example.run.app/generate");
  assert.doesNotMatch(calledUrl, new RegExp(bridgeSecret));
  const headers = new Headers(calledInit?.headers);
  assert.equal(headers.get("authorization"), `Bearer ${bridgeSecret}`);
  const bodyText = String(calledInit?.body);
  assert.doesNotMatch(bodyText, new RegExp(bridgeSecret));
  const body = JSON.parse(bodyText) as {
    model: string;
    systemInstruction: { parts: Array<{ text: string }> };
    generationConfig: {
      maxOutputTokens: number;
      candidateCount: number;
      responseMimeType: string;
      responseSchema: { type: string };
      thinkingConfig: { thinkingLevel: string; includeThoughts: boolean };
    };
  };
  assert.equal(body.model, "gemini-3.8-flash");
  assert.equal(body.generationConfig.maxOutputTokens, 2_200);
  assert.equal(body.generationConfig.candidateCount, 1);
  assert.equal(body.generationConfig.responseMimeType, "application/json");
  assert.equal(body.generationConfig.responseSchema.type, "OBJECT");
  assert.deepEqual(body.generationConfig.thinkingConfig, { thinkingLevel: "LOW", includeThoughts: false });
  assert.match(body.systemInstruction.parts[0].text, /desired target title does not prove/i);
  assert.match(body.systemInstruction.parts[0].text, /Salesforce/i);
  const generation = h.batched.find((item) => /INSERT INTO resume_generations/i.test(item.sql));
  assert.ok(generation);
  assert.equal(generation.values[4], "gemini-3.8-flash");
  assert.equal(generation.values[5], 11);
  assert.equal(generation.values[6], 25);
});

test("self-employed candidate with no named employer generates successfully", async () => {
  const h = harness({ intake: {
    contact: { fullName: "Rosa Delgado" },
    career: { summaryNotes: "Maintenance worker with residential repair and supported side-work experience", skillsAndTools: "Drywall repair, basic plumbing" },
    experience: [{ jobTitle: "Self-Employed Handyman", responsibilitiesAndWins: "Completed residential drywall and fixture repairs for local homeowners" }],
  } });
  const { response } = await run(h, dependenciesFor(selfEmployedResume));
  assert.equal(response.status, 200);
  assert.ok(h.state.generatedJson);
  assert.doesNotMatch(h.state.generatedJson, /"employer"/);
});

test("non-substantive output returns an intake action and restores the reserved run", async () => {
  const h = harness();
  const { response, payload } = await run(h, dependenciesFor(emptyOutput));
  assert.equal(response.status, 422);
  assert.equal(payload.code, "INTAKE_INFORMATION_REQUIRED");
  assert.equal(payload.retryable, false);
  assert.equal(payload.action, "return_to_intake");
  assert.equal(payload.paymentSafe, true);
  assert.equal(payload.runConsumed, false);
  assert.equal(payload.intakeUrl, "/resume-builder/intake?resume_id=resume-1");
  assert.equal(h.state.creditsUsed, 0);
  assert.equal(h.state.status, "draft");
});

test("unsupported numeric claims return sanitized telemetry and an intake action", async () => {
  const h = harness();
  const inflated = { ...entryLevelResume, summary: "Reduced callbacks by 35 percent across service visits." };
  const { response, payload } = await run(h, dependenciesFor(inflated));
  assert.equal(response.status, 422);
  assert.equal(payload.code, "UNSUPPORTED_NUMERIC_CLAIM");
  assert.equal(payload.retryable, false);
  assert.deepEqual(payload.missing, ["measurable results, dates, and quantities"]);
  assert.equal(h.state.creditsUsed, 0);
  const generation = h.batched.find((item) => /INSERT INTO resume_generations/i.test(item.sql));
  assert.ok(generation);
  const flags = String(generation.values[5]);
  assert.match(flags, /"count":1/);
  assert.match(flags, /career summary/);
  assert.doesNotMatch(flags, /35/);
});

test("a deterministic failure can repeat without reducing the four-run allowance", async () => {
  const h = harness();
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { response } = await run(h, dependenciesFor(emptyOutput));
    assert.equal(response.status, 422);
    assert.equal(h.state.creditsUsed, 0);
  }
  const { response } = await run(h, dependenciesFor(entryLevelResume));
  assert.equal(response.status, 200);
  assert.equal(h.state.creditsUsed, 1);
});

test("a failed correction never deletes or replaces the prior generation", async () => {
  const h = harness({ generated: selfEmployedResume, used: 1, intake: {
    contact: { fullName: "Rosa Delgado" },
    career: { summaryNotes: "Maintenance worker", skillsAndTools: "Drywall repair" },
  } });
  for (const format of ["docx", "pdf", "preview"]) {
    const extension = format === "docx" ? "docx" : "pdf";
    const key = `resume-builder/user-1/resume-1/generations/prior/${format}.${extension}`;
    h.filePointers.set(format, key);
    h.objects.set(key, encoder.encode(`PRIOR-${format}`));
  }
  const priorJson = h.state.generatedJson;
  const { response } = await run(h, dependenciesFor(emptyOutput), { correctionRequest: "Fix the end date" });
  assert.equal(response.status, 422);
  assert.equal(h.state.creditsUsed, 1);
  assert.equal(h.state.generatedJson, priorJson);
  assert.equal(h.objects.size, 3);
  assert.equal(h.deleted.some((key) => key.includes("/prior/")), false);
});

test("a generic model-stage error is attributed to model output", async () => {
  const h = harness();
  const dependencies: ResumeBuilderDependencies = {
    ...dependenciesFor(entryLevelResume),
    anthropicFetch: (async () => { throw new Error("operation failed"); }) as typeof fetch,
  };
  const { response, payload } = await run(h, dependencies);
  assert.equal(response.status, 502);
  assert.equal(payload.code, "MODEL_OUTPUT_ERROR");
  assert.equal(payload.retryable, true);
  assert.equal(h.state.creditsUsed, 0);
});

test("a misleading storage message from the render stage stays a render error", async () => {
  const h = harness();
  const dependencies = dependenciesFor(entryLevelResume);
  dependencies.createDocx = async () => { throw new Error("R2 upload storage failure"); };
  const { payload } = await run(h, dependencies);
  assert.equal(payload.code, "DOCUMENT_RENDER_ERROR");
  assert.equal(h.state.creditsUsed, 0);
});

test("a misleading model message from R2 stays a storage error and partial uploads are removed", async () => {
  const h = harness();
  let puts = 0;
  const books = {
    ...h.BOOKS,
    async put(key: string, bytes: Uint8Array) {
      puts += 1;
      if (puts === 3) throw new Error("Claude returned invalid json");
      h.objects.set(key, bytes);
    },
  };
  const { payload } = await run(h, dependenciesFor(entryLevelResume), {}, books);
  assert.equal(payload.code, "FILE_STORAGE_ERROR");
  assert.equal(h.state.creditsUsed, 0);
  assert.equal(h.objects.size, 0);
  assert.equal(h.deleted.length, 3);
});

test("a successful replacement deletes superseded R2 objects only after commit", async () => {
  const h = harness({ generated: selfEmployedResume, used: 1, intake: {
    contact: { fullName: "Rosa Delgado" },
    career: { summaryNotes: "Maintenance worker with residential repair and supported side-work experience", skillsAndTools: "Drywall repair, basic plumbing" },
    experience: [{ jobTitle: "Self-Employed Handyman", responsibilitiesAndWins: "Completed residential drywall and fixture repairs for local homeowners" }],
  } });
  const priorKeys: string[] = [];
  for (const format of ["docx", "pdf", "preview"]) {
    const extension = format === "docx" ? "docx" : "pdf";
    const key = `resume-builder/user-1/resume-1/generations/prior/${format}.${extension}`;
    priorKeys.push(key);
    h.filePointers.set(format, key);
    h.objects.set(key, encoder.encode(`PRIOR-${format}`));
  }
  const { response } = await run(
    h,
    dependenciesFor(selfEmployedResume),
    { correctionRequest: "Use clearer trade language" },
  );
  assert.equal(response.status, 200);
  assert.deepEqual(new Set(h.deleted), new Set(priorKeys));
  assert.equal(h.objects.size, 3);
  assert.equal([...h.objects.keys()].every((key) => key.includes("/generations/") && !key.includes("/prior/")), true);
});

test("an active generation lock rejects a second request before reserving a credit", async () => {
  const h = harness();
  h.state.status = "generating";
  const { response, payload } = await run(h, dependenciesFor(entryLevelResume));
  assert.equal(response.status, 409);
  assert.match(String(payload.message), /already in progress/i);
  assert.equal(h.state.creditsUsed, 0);
});

test("a paid owner can update intake without replacing payment or generated output", async () => {
  const h = harness({ generated: selfEmployedResume, used: 1 });
  const before = h.state.generatedJson;
  const response = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/resumes/resume-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({
        trade: "Facilities Maintenance",
        title: "Maintenance Technician",
        targetJobPosting: "",
        intake: { contact: { fullName: "Rosa Delgado" }, career: { skillsAndTools: "Drywall repair" } },
      }),
    }),
    { DB: h.DB as unknown as D1Database },
  );
  assert.ok(response);
  assert.equal(response.status, 200);
  const payload = await response.json() as { paid?: boolean; resumeId?: string };
  assert.equal(payload.paid, true);
  assert.equal(payload.resumeId, "resume-1");
  assert.equal(h.state.creditsUsed, 1);
  assert.equal(h.state.generatedJson, before);
  const update = h.writes.find((item) => /UPDATE resumes SET trade = \?/i.test(item.sql));
  assert.ok(update);
  assert.doesNotMatch(update.sql, /generated_json|status\s*=/i);
});
