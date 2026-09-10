import assert from "node:assert/strict";
import test from "node:test";
import { handleResumeBuilderRoute, type ResumeBuilderDependencies } from "../worker/resume-builder";
import type { GeneratedResume } from "../worker/resume-documents";

const sessionCookie = "tradehustl3_resume_session=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const encoder = new TextEncoder();

const intake = {
  contact: {
    fullName: "Sample Supervisor",
    email: "sample@example.com",
    phone: "555-555-0101",
    cityState: "Marietta, GA",
  },
  career: {
    yearsExperience: "6–10 years",
    summaryNotes: "Facilities maintenance supervisor with HVAC, electrical, plumbing, work-order, vendor, and team-leadership experience.",
    skillsAndTools: "HVAC diagnostics, electrical troubleshooting, plumbing troubleshooting, Salesforce",
    licensesAndCertifications: "EPA 608 Universal Certification, OSHA 10, HVAC Technical Certificate",
    safetyTraining: "OSHA 10",
  },
  fieldValue: {
    certifications: ["EPA 608 Universal Certification", "OSHA 10", "HVAC Technical Certificate"],
    software: ["Salesforce"],
    technicalSkills: ["HVAC diagnostics", "Electrical troubleshooting", "Plumbing troubleshooting"],
  },
  experience: [{
    employer: "Campus Housing Company",
    jobTitle: "Service Supervisor",
    location: "Marietta, GA",
    startDate: "April 2026",
    endDate: "July 2026",
    dates: "April 2026 – July 2026",
    responsibilities: "Directed maintenance operations for a 278-unit student housing community and coordinated HVAC replacements.",
    responsibilitiesAndWins: "Directed maintenance operations for a 278-unit student housing community and coordinated HVAC replacements.",
  }],
  education: "Community College — HVAC Technical Certification",
  targetJob: { title: "Maintenance Supervisor", company: "", location: "" },
};

const safeResume: GeneratedResume = {
  basics: {
    fullName: "Sample Supervisor",
    targetTitle: "Maintenance Supervisor",
    location: "Marietta, GA",
    phone: "555-555-0101",
    email: "sample@example.com",
  },
  summary: "Facilities maintenance supervisor with HVAC, electrical, plumbing, work-order, vendor, and team-leadership experience.",
  skills: ["HVAC diagnostics", "Electrical troubleshooting", "Plumbing troubleshooting", "Salesforce"],
  certifications: [
    { name: "EPA 608 Universal Certification" },
    { name: "OSHA 10" },
    { name: "HVAC Technical Certificate" },
  ],
  experience: [{
    employer: "Campus Housing Company",
    jobTitle: "Service Supervisor",
    location: "Marietta, GA",
    startDate: "April 2026",
    endDate: "July 2026",
    bullets: ["Directed maintenance operations for a 278-unit student housing community and coordinated HVAC replacements."],
  }],
  education: [{ credential: "HVAC Technical Certification", institution: "Community College" }],
  additionalInformation: [],
};

function harness(savedIntake: Record<string, unknown> = intake) {
  const state = { status: "draft", generatedJson: null as string | null };
  const objects = new Map<string, Uint8Array>();

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
            trade: "Facilities Maintenance",
            title: "Maintenance Supervisor",
            intake_json: JSON.stringify(savedIntake),
            generated_json: state.generatedJson,
            target_job_posting: null,
            status: state.status,
            theme: "plain",
          };
        }
        if (/FROM entitlements/i.test(sql)) return null;
        if (/SELECT object_key FROM resume_files/i.test(sql)) return null;
        return null;
      },
      async run() {
        if (/UPDATE resumes SET status = 'generating'/i.test(sql)) {
          if (state.status === "generating") return { meta: { changes: 0 } };
          state.status = "generating";
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
        if (/UPDATE resumes SET status = \?/i.test(item.sql)) state.status = String(item.values[0]);
        if (/UPDATE resumes SET generated_json/i.test(item.sql)) {
          state.generatedJson = String(item.values[0]);
          state.status = "ready";
        }
      }
      return [];
    },
  };

  const BOOKS = {
    async put(key: string, bytes: Uint8Array) { objects.set(key, bytes); },
    async get(key: string) { return objects.has(key) ? { body: objects.get(key) } : null; },
    async delete(key: string) { objects.delete(key); },
  };

  return { state, objects, DB, BOOKS };
}

test("Gemini uploaded-resume enhancement repairs an invented metric without forcing a second model call", async () => {
  const h = harness();
  let calls = 0;
  const systemPrompts: string[] = [];
  const inflated: GeneratedResume = {
    ...safeResume,
    summary: "Facilities maintenance supervisor who reduced callbacks by 35 percent while leading HVAC and building operations.",
  };

  const dependencies: ResumeBuilderDependencies = {
    geminiFetch: (async (_input, init) => {
      calls += 1;
      const body = JSON.parse(String(init?.body)) as {
        systemInstruction?: { parts?: Array<{ text?: string }> };
      };
      systemPrompts.push(body.systemInstruction?.parts?.[0]?.text ?? "");
      const generated = calls === 1 ? inflated : safeResume;
      return new Response(JSON.stringify({
        candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(generated) }] } }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, thoughtsTokenCount: 0 },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch,
    createDocx: async (generated) => encoder.encode(`DOCX:${JSON.stringify(generated)}`),
    createPdf: async (generated, watermarked) => encoder.encode(`${watermarked ? "PREVIEW" : "PDF"}:${JSON.stringify(generated)}`),
  };

  const response = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/resumes/resume-1/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie, Origin: "https://tradehustl3.com" },
      body: "{}",
    }),
    {
      DB: h.DB as unknown as D1Database,
      BOOKS: h.BOOKS as unknown as R2Bucket,
      RESUME_AI_PROVIDER: "gemini",
      RESUME_AI_BRIDGE_URL: "https://resume-ai-bridge.example.run.app",
      RESUME_AI_BRIDGE_SECRET: "bridge-secret",
    },
    dependencies,
  );

  assert.ok(response);
  assert.equal(response.status, 200);
  const payload = await response.json() as { ok?: boolean; runNumber?: number };
  assert.equal(payload.ok, true);
  assert.equal(payload.runNumber, 1);
  assert.equal(calls, 1);
  assert.equal(h.state.status, "ready");
  assert.equal(h.objects.size, 3);
  assert.match(systemPrompts[0], /Enhancement means preserve first/i);
  assert.match(systemPrompts[0], /If metrics are absent, write strong nonnumeric bullets/i);
  assert.equal(systemPrompts.length, 1);
  assert.doesNotMatch(JSON.stringify(h.state.generatedJson), /35 percent/i);
});

test("a multi-job uploaded HVAC resume cannot collapse into summary, certifications, and skills", async () => {
  const multiJobIntake = {
    ...intake,
    experience: [
      {
        employer: "Campus Housing Company",
        jobTitle: "Maintenance Supervisor",
        location: "Marietta, GA",
        startDate: "June 2026",
        endDate: "July 2026",
        responsibilities: "Supervised a five-person team and coordinated HVAC vendors.",
        workOrders: "Managed 150–200 monthly work orders in Salesforce.",
      },
      {
        employer: "Industrial Warehouse",
        jobTitle: "Facility Maintenance Technician",
        startDate: "January 2023",
        endDate: "May 2026",
        responsibilities: "Diagnosed HVAC, electrical, plumbing, and mechanical faults and completed PMs.",
      },
      {
        employer: "Cooler Heating & Air",
        jobTitle: "HVAC Technician",
        startDate: "April 2017",
        endDate: "December 2019",
        responsibilities: "Serviced compressors, motors, contactors, capacitors, transformers, and control boards.",
      },
    ],
    meta: { source: "upload", importedResume: true },
  };
  const h = harness(multiJobIntake);
  let rendered: GeneratedResume | null = null;
  const collapsed: GeneratedResume = {
    basics: safeResume.basics,
    summary: safeResume.summary,
    skills: safeResume.skills,
    certifications: safeResume.certifications,
    experience: [],
    education: [],
    additionalInformation: [],
  };
  const response = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/resumes/resume-1/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie, Origin: "https://tradehustl3.com" },
      body: "{}",
    }),
    {
      DB: h.DB as unknown as D1Database,
      BOOKS: h.BOOKS as unknown as R2Bucket,
      RESUME_AI_PROVIDER: "gemini",
      RESUME_AI_BRIDGE_URL: "https://resume-ai-bridge.example.run.app",
      RESUME_AI_BRIDGE_SECRET: "bridge-secret",
    },
    {
      geminiFetch: (async () => new Response(JSON.stringify({
        candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(collapsed) }] } }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20 },
      }), { status: 200, headers: { "Content-Type": "application/json" } })) as typeof fetch,
      createDocx: async (generated) => {
        rendered = generated;
        return encoder.encode("DOCX");
      },
      createPdf: async (generated) => {
        rendered = generated;
        return encoder.encode("PDF");
      },
    },
  );
  assert.ok(response);
  assert.equal(response.status, 200);
  assert.ok(rendered);
  const repaired = rendered as GeneratedResume;
  assert.deepEqual(repaired.experience.map((job) => job.employer), ["Campus Housing Company", "Industrial Warehouse", "Cooler Heating & Air"]);
  assert.deepEqual(repaired.experience.map((job) => job.startDate), ["June 2026", "January 2023", "April 2017"]);
  assert.match(repaired.experience[0].bullets.join(" "), /150–200 monthly work orders/i);
  assert.equal(JSON.parse(h.state.generatedJson ?? "{}").experience.length, 3);
});

test("bullet-level Rewrite persists to preview, PDF, and DOCX without consuming an AI run", async () => {
  const h = harness();
  h.state.generatedJson = JSON.stringify(safeResume);
  h.state.status = "ready";
  const rewritten = "Direct maintenance operations and coordinate HVAC replacements across the student housing community.";
  let renderedDocx = "";
  let renderedPdf = "";

  const response = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/resumes/resume-1/bullets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie, Origin: "https://tradehustl3.com" },
      body: JSON.stringify({ jobIndex: 0, bulletIndex: 0, choice: "edited", text: rewritten }),
    }),
    { DB: h.DB as unknown as D1Database, BOOKS: h.BOOKS as unknown as R2Bucket },
    {
      createDocx: async (generated) => {
        renderedDocx = generated.experience[0].bullets[0];
        return encoder.encode(`DOCX:${JSON.stringify(generated)}`);
      },
      createPdf: async (generated) => {
        renderedPdf = generated.experience[0].bullets[0];
        return encoder.encode(`PDF:${JSON.stringify(generated)}`);
      },
    },
  );

  assert.ok(response);
  assert.equal(response.status, 200);
  const payload = await response.json() as { runConsumed?: boolean; message?: string };
  assert.equal(payload.runConsumed, false);
  assert.match(payload.message ?? "", /preview, PDF, and DOCX/i);
  const stored = JSON.parse(h.state.generatedJson ?? "{}") as GeneratedResume & {
    editorial?: { selections?: Array<{ choice?: string }> };
  };
  assert.equal(stored.experience[0].bullets[0], rewritten);
  assert.equal(stored.editorial?.selections?.[0]?.choice, "edited");
  assert.equal(renderedDocx, rewritten);
  assert.equal(renderedPdf, rewritten);
  assert.equal(h.objects.size, 3);
});

test("bullet editor blocks a newly invented number and leaves existing files unchanged", async () => {
  const h = harness();
  h.state.generatedJson = JSON.stringify(safeResume);
  h.state.status = "ready";
  const response = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/resumes/resume-1/bullets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie, Origin: "https://tradehustl3.com" },
      body: JSON.stringify({ jobIndex: 0, bulletIndex: 0, choice: "edited", text: "Reduced callbacks by 99 percent." }),
    }),
    { DB: h.DB as unknown as D1Database, BOOKS: h.BOOKS as unknown as R2Bucket },
  );
  assert.ok(response);
  assert.equal(response.status, 422);
  const payload = await response.json() as { code?: string; runConsumed?: boolean };
  assert.equal(payload.code, "UNSUPPORTED_NUMERIC_CLAIM");
  assert.equal(payload.runConsumed, false);
  assert.equal(h.state.generatedJson, JSON.stringify(safeResume));
  assert.equal(h.objects.size, 0);
});
