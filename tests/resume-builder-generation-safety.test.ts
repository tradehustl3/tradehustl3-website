import assert from "node:assert/strict";
import test from "node:test";
import { handleResumeAiBridge, resetAccessTokenCacheForTests } from "../services/resume-ai-bridge/app.mjs";
import { handleResumeBuilderRoute } from "../worker/resume-builder";
import { handleResumeBuilderRoute as handleBaseResumeBuilderRoute } from "../worker/resume-builder-base";
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
  entitled?: boolean;
  theme?: "plain" | "navy" | "lead";
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
        if (/RETURNING count/i.test(sql)) return { count: 1 };
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
            theme: options.theme ?? "plain",
          };
        }
        if (/FROM entitlements/i.test(sql)) {
          if (options.entitled === false) return null;
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

test("generation stops before AI when intake contains only a title, experience level, and credential", async () => {
  const h = harness({
    intake: {
      contact: { fullName: "Kamyren Ellis", email: "example@example.com" },
      targetJob: { title: "HVAC" },
      career: { yearsExperience: "Less than 1 year" },
      fieldValue: { certifications: ["ASME Section IX"] },
      experience: [],
    },
  });
  let aiCalled = false;
  const dependencies = dependenciesFor(entryLevelResume);
  dependencies.anthropicFetch = (async () => {
    aiCalled = true;
    return new Response();
  }) as typeof fetch;

  const { response, payload } = await run(h, dependencies);
  assert.equal(response.status, 422);
  assert.equal(payload.code, "INTAKE_INFORMATION_REQUIRED");
  assert.equal(payload.action, "return_to_intake");
  assert.equal(payload.runConsumed, false);
  assert.equal(aiCalled, false);
  assert.equal(h.state.creditsUsed, 0);
  assert.equal(h.objects.size, 0);
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
      responseSchema: { type: string; required: string[] };
      thinkingConfig: { thinkingLevel: string; includeThoughts: boolean };
    };
    contents: Array<{ parts: Array<{ text: string }> }>;
  };
  assert.equal(body.model, "gemini-3.8-flash");
  assert.equal(body.generationConfig.maxOutputTokens, 8_000);
  assert.equal(body.generationConfig.candidateCount, 1);
  assert.equal(body.generationConfig.responseMimeType, "application/json");
  assert.equal(body.generationConfig.responseSchema.type, "OBJECT");
  assert.equal(body.generationConfig.responseSchema.required.includes("claimSources"), true);
  assert.deepEqual(body.generationConfig.thinkingConfig, { thinkingLevel: "LOW", includeThoughts: false });
  assert.match(body.systemInstruction.parts[0].text, /desired target title does not prove/i);
  assert.match(body.systemInstruction.parts[0].text, /Salesforce/i);
  assert.match(body.contents[0].parts[0].text, /VERIFIED FACT CATALOG:/);
  assert.match(body.contents[0].parts[0].text, /technicalSkills\.0/);
  const generation = h.batched.find((item) => /INSERT INTO resume_generations/i.test(item.sql));
  assert.ok(generation);
  assert.equal(generation.values[4], "gemini-3.8-flash");
  assert.equal(generation.values[5], 11);
  assert.equal(generation.values[6], 25);
});

test("Gemini bridge failure falls back to Claude and records the model that completed the build", async () => {
  const h = harness();
  let geminiCalls = 0;
  let anthropicCalls = 0;
  const anthropicFetch = anthropicReturning(entryLevelResume);
  const response = await handleResumeBuilderRoute(
    request(),
    {
      DB: h.DB as unknown as D1Database,
      BOOKS: h.BOOKS as unknown as R2Bucket,
      RESUME_AI_PROVIDER: "gemini",
      RESUME_AI_BRIDGE_URL: "https://resume-ai-bridge.example.run.app",
      RESUME_AI_BRIDGE_SECRET: "bridge-test-secret-never-send-to-browser",
      ANTHROPIC_API_KEY: "test-key",
      CLAUDE_MODEL: "claude-sonnet-5",
    },
    {
      geminiFetch: (async () => {
        geminiCalls += 1;
        return new Response(JSON.stringify({ error: { message: "bridge unavailable" } }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }) as typeof fetch,
      anthropicFetch: (async (...args) => {
        anthropicCalls += 1;
        return anthropicFetch!(...args);
      }) as typeof fetch,
      createDocx: async (generated) => encoder.encode(`DOCX:${JSON.stringify(generated)}`),
      createPdf: async (generated, watermarked) => encoder.encode(`${watermarked ? "PREVIEW" : "PDF"}:${JSON.stringify(generated)}`),
    },
  );

  assert.ok(response);
  assert.equal(response.status, 200);
  assert.equal(geminiCalls, 1);
  assert.equal(anthropicCalls, 1);
  assert.equal(h.state.creditsUsed, 1);
  assert.equal(h.objects.size, 3);
  const generation = h.batched.find((item) => /INSERT INTO resume_generations/i.test(item.sql));
  assert.ok(generation);
  assert.equal(generation.values[4], "claude-sonnet-5");
});

test("an unpaid correction returns an explicit payment action without calling the model or changing files", async () => {
  const h = harness({ generated: entryLevelResume, used: 1, entitled: false });
  let modelCalls = 0;
  const response = await handleResumeBuilderRoute(
    request({ correctionRequest: "Change my end date to June 2025" }),
    {
      DB: h.DB as unknown as D1Database,
      BOOKS: h.BOOKS as unknown as R2Bucket,
      RESUME_AI_PROVIDER: "gemini",
      RESUME_AI_BRIDGE_URL: "https://resume-ai-bridge.example.run.app",
      RESUME_AI_BRIDGE_SECRET: "bridge-test-secret-never-send-to-browser",
    },
    {
      geminiFetch: (async () => {
        modelCalls += 1;
        throw new Error("must not call Gemini");
      }) as typeof fetch,
    },
  );

  assert.ok(response);
  assert.equal(response.status, 402);
  const payload = await response.json() as Record<string, unknown>;
  assert.equal(payload.code, "PAYMENT_REQUIRED");
  assert.equal(payload.action, "complete_payment");
  assert.equal(payload.runConsumed, false);
  assert.equal(modelCalls, 0);
  assert.equal(h.state.creditsUsed, 1);
  assert.equal(h.objects.size, 0);
  assert.equal(h.batched.length, 0);
});

test("a paid Gemini correction sends prior context, persists the revision, regenerates files, and leaves two corrections", async () => {
  const priorResume: GeneratedResume = {
    ...entryLevelResume,
    experience: [{
      jobTitle: "HVAC Apprentice",
      employer: "Apex Mechanical",
      startDate: "January 2024",
      endDate: "Present",
      bullets: ["Assisted with preventive maintenance"],
    }],
  };
  const revisedResume: GeneratedResume = {
    ...priorResume,
    experience: [{
      ...priorResume.experience[0],
      endDate: "June 2025",
      bullets: ["Assisted with rooftop-unit diagnostics and preventive maintenance"],
    }],
  };
  const intake = {
    contact: { fullName: "Devon Price" },
    career: {
      summaryNotes: "Trade-school graduate with hands-on lab training and a strong safety mindset",
      skillsAndTools: "Brazing, multimeter, rooftop-unit diagnostics",
      licensesAndCertifications: "OSHA ten",
    },
    experience: [{
      jobTitle: "HVAC Apprentice",
      employer: "Apex Mechanical",
      startDate: "January 2024",
      endDate: "Present",
      responsibilitiesAndWins: "Assisted with preventive maintenance and rooftop-unit diagnostics",
    }],
    education: "HVAC Certificate, Akron Career Center",
  };
  const h = harness({ generated: priorResume, used: 1, total: 4, intake });
  let requestBody = "";
  const response = await handleResumeBuilderRoute(
    request({ correctionRequest: "Change my end date to June 2025 and emphasize rooftop diagnostics" }),
    {
      DB: h.DB as unknown as D1Database,
      BOOKS: h.BOOKS as unknown as R2Bucket,
      RESUME_AI_PROVIDER: "gemini",
      RESUME_AI_BRIDGE_URL: "https://resume-ai-bridge.example.run.app",
      RESUME_AI_BRIDGE_SECRET: "bridge-test-secret-never-send-to-browser",
      GEMINI_MODEL: "gemini-3.8-flash",
    },
    {
      geminiFetch: (async (_input, init) => {
        requestBody = String(init?.body);
        return new Response(JSON.stringify({
          candidates: [{
            finishReason: "STOP",
            content: { parts: [{ text: JSON.stringify(revisedResume) }] },
          }],
          usageMetadata: { promptTokenCount: 40, candidatesTokenCount: 60 },
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }) as typeof fetch,
      createDocx: async (generated) => encoder.encode(`DOCX:${JSON.stringify(generated)}`),
      createPdf: async (generated, watermarked) => encoder.encode(`${watermarked ? "PREVIEW" : "PDF"}:${JSON.stringify(generated)}`),
    },
  );

  assert.ok(response);
  assert.equal(response.status, 200);
  const payload = await response.json() as Record<string, unknown>;
  assert.equal(payload.runNumber, 2);
  assert.equal(payload.correctionsRemaining, 2);
  assert.equal(h.state.creditsUsed, 2);
  const storedRevision = JSON.parse(h.state.generatedJson ?? "{}") as typeof revisedResume & {
    grounding?: { version?: number; repaired?: boolean };
  };
  assert.deepEqual({ ...storedRevision, grounding: undefined }, { ...revisedResume, grounding: undefined });
  assert.equal(storedRevision.grounding?.version, 1);
  assert.equal(storedRevision.grounding?.repaired, true);
  assert.equal(h.objects.size, 3);
  assert.equal(h.filePointers.size, 3);
  assert.equal([...h.filePointers.values()].every((key) => key.includes("/generations/")), true);

  const bridgePayload = JSON.parse(requestBody) as { contents: Array<{ parts: Array<{ text: string }> }> };
  const prompt = bridgePayload.contents[0].parts[0].text;
  assert.match(prompt, /ORIGINAL INTAKE:/);
  assert.match(prompt, /CURRENT RESUME:/);
  assert.match(prompt, /CUSTOMER CORRECTION:/);
  assert.match(prompt, /Assisted with preventive maintenance/);
  assert.match(prompt, /Change my end date to June 2025 and emphasize rooftop diagnostics/);

  const generation = h.batched.find((item) => /INSERT INTO resume_generations/i.test(item.sql));
  assert.ok(generation);
  assert.equal(generation.values[3], "correction");
  assert.equal(generation.values[4], "gemini-3.8-flash");
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

test("unsupported numeric wording removed by deterministic repair completes without another customer build", async () => {
  const h = harness();
  const inflated = { ...entryLevelResume, summary: "Reduced callbacks by 35 percent across service visits." };
  const { response, payload } = await run(h, dependenciesFor(inflated));
  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(h.state.creditsUsed, 1);
  assert.ok(h.state.generatedJson);
  assert.doesNotMatch(h.state.generatedJson ?? "", /35/);
  const generation = h.batched.find((item) => /INSERT INTO resume_generations/i.test(item.sql));
  assert.ok(generation);
  assert.equal(String(generation.values[7]), "[]");
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

for (const provider of ["gemini", "anthropic"] as const) {
  for (const theme of ["plain", "navy", "lead"] as const) {
    test(`${provider} ${theme}: split JSON text reaches the preview without corrupting string values`, async () => {
      const h = harness({ theme });
      const raw = JSON.stringify(entryLevelResume);
      const split = raw.indexOf("Devon") + 3;
      const parts = [raw.slice(0, split), raw.slice(split)];
      // This is the response immediately before the old adapter's failing parse.
      assert.deepEqual(JSON.parse(parts.join("")), entryLevelResume);
      assert.throws(() => JSON.parse(parts.join("\n")), SyntaxError);
      const modelFetch = (async () => new Response(JSON.stringify(provider === "gemini"
        ? { candidates: [{ finishReason: "STOP", content: { parts: parts.map((text) => ({ text })) } }] }
        : { stop_reason: "end_turn", content: parts.map((text) => ({ type: "text", text })) }
      ))) as typeof fetch;
      const response = await handleResumeBuilderRoute(request(), {
        DB: h.DB as unknown as D1Database, BOOKS: h.BOOKS as unknown as R2Bucket,
        RESUME_AI_PROVIDER: provider, RESUME_AI_BRIDGE_URL: "https://bridge.example",
        RESUME_AI_BRIDGE_SECRET: "test-secret", ANTHROPIC_API_KEY: "test-key",
      }, { ...dependenciesFor(entryLevelResume), geminiFetch: modelFetch, anthropicFetch: modelFetch });
      assert.equal(response?.status, 200, await response?.clone().text());
      assert.equal(h.state.creditsUsed, 1);
      assert.equal(h.objects.size, 3);
      assert.equal(JSON.parse(h.state.generatedJson!).basics.fullName, "Devon Price");
    });
  }
}

for (const theme of ["plain", "navy", "lead"] as const) {
  test(`${theme}: the generation token budget survives the real bridge and a complete response renders`, async () => {
    resetAccessTokenCacheForTests();
    const h = harness({ theme });
    const secret = "0123456789abcdef0123456789abcdef";
    let forwardedBudget = 0;
    const geminiFetch = (async (url, init) => handleResumeAiBridge(new Request(String(url), init), {
      RESUME_AI_BRIDGE_SECRET: secret, GOOGLE_CLOUD_PROJECT_ID: "test-project", NODE_ENV: "test",
    }, { fetch: async (url: string, init?: RequestInit) => {
      if (url.startsWith("http://metadata.google.internal/")) {
        return Response.json({ access_token: "test-token", expires_in: 3600 });
      }
      forwardedBudget = JSON.parse(String(init?.body)).generationConfig.maxOutputTokens;
      // A provider fixture needing more than the old hardcoded 4,000-token ceiling.
      const truncated = forwardedBudget < 8_000;
      return Response.json({ candidates: [{ finishReason: truncated ? "MAX_TOKENS" : "STOP",
        content: { parts: [{ text: truncated ? '{"basics":' : JSON.stringify(entryLevelResume) }] } }] });
    } })) as typeof fetch;
    const response = await handleResumeBuilderRoute(request(), {
      DB: h.DB as unknown as D1Database, BOOKS: h.BOOKS as unknown as R2Bucket,
      RESUME_AI_PROVIDER: "gemini", RESUME_AI_BRIDGE_URL: "https://bridge.example",
      RESUME_AI_BRIDGE_SECRET: secret,
    }, { ...dependenciesFor(entryLevelResume), geminiFetch });
    assert.equal(response?.status, 200, await response?.clone().text());
    assert.equal(forwardedBudget, 8_000);
    assert.equal(h.state.creditsUsed, 1);
    assert.equal(h.objects.size, 3);
  });
}

for (const provider of ["gemini", "anthropic"] as const) {
  const envelope = (text: string, stop?: string) => provider === "gemini"
    ? { candidates: [{ finishReason: stop ?? "STOP", content: { parts: [{ text }] } }] }
    : { stop_reason: stop ?? "end_turn", content: [{ type: "text", text }] };
  const cases = [
    { stage: "http", body: "private upstream message", status: 503 },
    { stage: "provider_json", body: "private invalid envelope" },
    { stage: "provider_envelope", body: JSON.stringify({ content: {}, candidates: {} }) },
    { stage: "empty_output", body: JSON.stringify(envelope("")) },
    { stage: "resume_json", body: JSON.stringify(envelope('{"private":"truncated')) },
    { stage: "truncated", body: JSON.stringify(envelope(JSON.stringify(entryLevelResume), provider === "gemini" ? "MAX_TOKENS" : "max_tokens")) },
  ];
  for (const item of cases) {
    test(`${provider} ${item.stage}: rejected correction preserves files, refunds run, and records only safe telemetry`, async () => {
      const h = harness({ generated: entryLevelResume, used: 1 });
      const prior = h.state.generatedJson;
      h.objects.set("prior-preview", encoder.encode("PRIOR"));
      h.filePointers.set("preview", "prior-preview");
      const modelFetch = (async () => new Response(item.body, { status: item.status ?? 200 })) as typeof fetch;
      const response = await handleResumeBuilderRoute(request({ correctionRequest: "Keep verified facts" }), {
        DB: h.DB as unknown as D1Database, BOOKS: h.BOOKS as unknown as R2Bucket,
        RESUME_AI_PROVIDER: provider, RESUME_AI_BRIDGE_URL: "https://bridge.example",
        RESUME_AI_BRIDGE_SECRET: "test-secret", ...(provider === "anthropic" ? { ANTHROPIC_API_KEY: "test-key" } : {}),
      }, { ...dependenciesFor(entryLevelResume), geminiFetch: modelFetch, anthropicFetch: modelFetch });
      assert.equal(response?.status, 502);
      const payload = await response!.json() as Record<string, unknown>;
      assert.equal(payload.code, "MODEL_OUTPUT_ERROR");
      assert.equal(payload.runConsumed, false);
      assert.equal(h.state.creditsUsed, 1);
      assert.equal(h.state.generatedJson, prior);
      assert.equal(h.state.status, "ready");
      assert.equal(h.objects.size, 1);
      assert.equal(h.filePointers.get("preview"), "prior-preview");
      const log = h.batched.find((entry) => /INSERT INTO resume_generations/i.test(entry.sql));
      assert.ok(log);
      const telemetry = JSON.parse(String(log.values[5]));
      assert.equal(telemetry.stage, item.stage);
      assert.equal(telemetry.provider, provider);
      assert.doesNotMatch(JSON.stringify(telemetry), /private|Devon|test-secret|test-key/);
      assert.equal(payload.stage, undefined);
    });
  }
}

test("Gemini schema rejection does not call a fallback model or consume an AI run", async () => {
  const h = harness();
  let fallbackCalls = 0;
  const response = await handleResumeBuilderRoute(request(), {
    DB: h.DB as unknown as D1Database, BOOKS: h.BOOKS as unknown as R2Bucket,
    RESUME_AI_PROVIDER: "gemini", RESUME_AI_BRIDGE_URL: "https://bridge.example",
    RESUME_AI_BRIDGE_SECRET: "test-secret", ANTHROPIC_API_KEY: "test-key",
  }, { ...dependenciesFor(entryLevelResume),
    geminiFetch: (async () => Response.json({ candidates: [{ finishReason: "STOP",
      content: { parts: [{ text: JSON.stringify(emptyOutput) }] } }] })) as typeof fetch,
    anthropicFetch: (async () => { fallbackCalls++; return Response.json({}); }) as typeof fetch,
  });
  assert.equal(response?.status, 422);
  assert.equal(fallbackCalls, 0);
  assert.equal(h.state.creditsUsed, 0);
  assert.equal(h.objects.size, 0);
});

test("malformed uploaded-resume output cannot turn source recovery into a consumed run", async () => {
  const h = harness({ intake: {
    contact: { fullName: "Rosa Delgado" },
    career: { summaryNotes: selfEmployedResume.summary, skillsAndTools: "Drywall repair, basic plumbing" },
    experience: [{ jobTitle: "Self-Employed Handyman", responsibilitiesAndWins: selfEmployedResume.experience[0].bullets[0] }],
    meta: { source: "upload", importedResume: true },
  } });
  const response = await handleBaseResumeBuilderRoute(request(), {
    DB: h.DB as unknown as D1Database, BOOKS: h.BOOKS as unknown as R2Bucket, ANTHROPIC_API_KEY: "test-key",
  }, { ...dependenciesFor(selfEmployedResume),
    anthropicFetch: (async () => Response.json({ content: [{ type: "text", text: '{"summary":' }] })) as typeof fetch,
  });
  assert.ok(response);
  const payload = await response.json() as Record<string, unknown>;
  assert.equal(response.status, 502);
  assert.equal(payload.runConsumed, false);
  assert.equal(h.state.creditsUsed, 0);
  assert.equal(h.state.generatedJson, null);
  assert.equal(h.objects.size, 0);
});

test("unsupported correction dates remain rejected with no provider fallback and no consumed correction", async () => {
  const safe = { ...selfEmployedResume, experience: [{ ...selfEmployedResume.experience[0], startDate: "2020", endDate: "2021" }] };
  const unsafe = { ...safe, experience: [{ ...safe.experience[0], endDate: "2099" }] };
  const h = harness({ generated: safe, used: 1, intake: {
    contact: { fullName: "Rosa Delgado" },
    career: { summaryNotes: safe.summary, skillsAndTools: "Drywall repair, basic plumbing" },
    experience: [{ jobTitle: "Self-Employed Handyman", startDate: "2020", endDate: "2021",
      responsibilitiesAndWins: safe.experience[0].bullets[0] }],
  } });
  let fallbackCalls = 0;
  const prior = h.state.generatedJson;
  const response = await handleResumeBuilderRoute(request({ correctionRequest: "Improve wording using the same verified facts" }), {
    DB: h.DB as unknown as D1Database, BOOKS: h.BOOKS as unknown as R2Bucket,
    RESUME_AI_PROVIDER: "gemini", RESUME_AI_BRIDGE_URL: "https://bridge.example",
    RESUME_AI_BRIDGE_SECRET: "test-secret", ANTHROPIC_API_KEY: "test-key",
  }, { ...dependenciesFor(safe),
    geminiFetch: (async () => Response.json({ candidates: [{ finishReason: "STOP",
      content: { parts: [{ text: JSON.stringify(unsafe) }] } }] })) as typeof fetch,
    anthropicFetch: (async () => { fallbackCalls++; return Response.json({}); }) as typeof fetch,
  });
  const payload = await response!.json() as Record<string, unknown>;
  assert.equal(payload.code, "UNSUPPORTED_NUMERIC_CLAIM");
  assert.equal(payload.runConsumed, false);
  assert.equal(fallbackCalls, 0);
  assert.equal(h.state.creditsUsed, 1);
  assert.equal(h.state.generatedJson, prior);
  assert.equal(h.objects.size, 0);
});

test("rejected Gemini output followed by a fallback outage cannot consume an uploaded-resume run", async () => {
  const h = harness({ intake: {
    contact: { fullName: "Rosa Delgado" },
    career: { summaryNotes: selfEmployedResume.summary, skillsAndTools: "Drywall repair, basic plumbing" },
    experience: [{ jobTitle: "Self-Employed Handyman", responsibilitiesAndWins: selfEmployedResume.experience[0].bullets[0] }],
    meta: { source: "upload", importedResume: true },
  } });
  const response = await handleBaseResumeBuilderRoute(request(), {
    DB: h.DB as unknown as D1Database, BOOKS: h.BOOKS as unknown as R2Bucket,
    RESUME_AI_PROVIDER: "gemini", RESUME_AI_BRIDGE_URL: "https://bridge.example",
    RESUME_AI_BRIDGE_SECRET: "test-secret", ANTHROPIC_API_KEY: "test-key",
  }, { ...dependenciesFor(selfEmployedResume),
    geminiFetch: (async () => Response.json({ candidates: [{ finishReason: "STOP",
      content: { parts: [{ text: '{"summary":' }] } }] })) as typeof fetch,
    anthropicFetch: (async () => { throw new Error("private provider outage"); }) as typeof fetch,
  });
  assert.equal(response?.status, 502);
  assert.equal(h.state.creditsUsed, 0);
  assert.equal(h.state.generatedJson, null);
  assert.equal(h.objects.size, 0);
  const log = h.batched.find((entry) => /INSERT INTO resume_generations/i.test(entry.sql));
  assert.equal(JSON.parse(String(log!.values[5])).stage, "resume_json");
});
