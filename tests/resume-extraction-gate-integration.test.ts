import assert from "node:assert/strict";
import test from "node:test";
import { handleResumeBuilderRoute, type ResumeBuilderDependencies } from "../worker/resume-builder";

const sessionCookie = "tradehustl3_resume_session=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

const sourceResume = `ALEX MORGAN
PROFESSIONAL EXPERIENCE
American Campus Communities — Maintenance Supervisor — Atlanta, GA
June 2024 - July 2026
Led preventive maintenance, HVAC diagnostics, vendor coordination, and Salesforce work orders.
Cooler Heating & Air — HVAC Technician — Marietta, GA
April 2019 - May 2024
Diagnosed split systems, replaced motors and contactors, performed recovery and vacuum procedures.
Metro Facilities — Maintenance Technician — Atlanta, GA
January 2016 - March 2019
Completed electrical, plumbing, HVAC, and building repairs using CMMS work orders.
EDUCATION
Atlanta Technical College — HVAC Technical Certificate
CERTIFICATIONS & LICENSES
EPA 608 Universal
OSHA 10
TECHNICAL SKILLS & TOOLS
Multimeter, digital manifold gauges, vacuum pump, recovery machine, leak detector
HVAC diagnostics, electrical troubleshooting, preventive maintenance
SOFTWARE / CMMS
Salesforce, UpKeep
SAFETY TRAINING
Lockout/Tagout, respirator fit, silica safety training`;

const completePrefill = {
  trade: "Facilities Maintenance",
  experienceLevel: "6–10 years",
  targetJobTitle: "Maintenance Supervisor",
  contact: { fullName: "Alex Morgan", phone: "404-555-0199", cityState: "Atlanta, GA" },
  summaryNotes: "Facilities maintenance and HVAC experience.",
  roles: [
    {
      employer: "American Campus Communities", jobTitle: "Maintenance Supervisor", location: "Atlanta, GA", employmentType: "", startDate: "June 2024", endDate: "July 2026", current: false,
      responsibilities: "Led preventive maintenance, HVAC diagnostics, vendor coordination, and Salesforce work orders.", equipment: "", systems: "", workPerformed: "", leadership: "", workOrders: "Salesforce work orders", measurable: "",
    },
    {
      employer: "Cooler Heating & Air", jobTitle: "HVAC Technician", location: "Marietta, GA", employmentType: "", startDate: "April 2019", endDate: "May 2024", current: false,
      responsibilities: "Diagnosed split systems, replaced motors and contactors, performed recovery and vacuum procedures.", equipment: "", systems: "split systems", workPerformed: "recovery and vacuum procedures", leadership: "", workOrders: "", measurable: "",
    },
    {
      employer: "Metro Facilities", jobTitle: "Maintenance Technician", location: "Atlanta, GA", employmentType: "", startDate: "January 2016", endDate: "March 2019", current: false,
      responsibilities: "Completed electrical, plumbing, HVAC, and building repairs using CMMS work orders.", equipment: "", systems: "", workPerformed: "electrical, plumbing, HVAC, and building repairs", leadership: "", workOrders: "CMMS work orders", measurable: "",
    },
  ],
  fieldValue: {
    certifications: ["EPA 608 Universal", "OSHA 10"],
    licenses: "",
    tools: ["Multimeter", "digital manifold gauges", "vacuum pump", "recovery machine", "leak detector"],
    equipmentSystems: ["split systems"],
    technicalSkills: ["HVAC diagnostics", "electrical troubleshooting", "preventive maintenance"],
    software: ["Salesforce", "UpKeep"],
    safety: ["Lockout/Tagout", "respirator fit", "silica safety training"],
  },
  education: "Atlanta Technical College — HVAC Technical Certificate",
  additionalDetails: "",
};

function sessionAndRateLimitDb(savedIntake?: Record<string, unknown>) {
  const state = { generationReserved: false };
  const DB = {
    prepare(sql: string) {
      return {
        bind: (...values: unknown[]) => {
          void values;
          return {
            async first() {
              if (/RETURNING count/i.test(sql)) return { count: 1 };
              if (/FROM sessions s/i.test(sql)) return { user_id: "user-1", email: "member@example.com", full_name: "Member" };
              if (/FROM resumes WHERE/i.test(sql) && savedIntake) {
                return {
                  resume_id: "resume-1",
                  user_id: "user-1",
                  trade: "Facilities Maintenance",
                  title: "Maintenance Supervisor",
                  intake_json: JSON.stringify(savedIntake),
                  generated_json: null,
                  target_job_posting: null,
                  status: "draft",
                  theme: "plain",
                };
              }
              if (/SELECT intake_json FROM resumes/i.test(sql) && savedIntake) return { intake_json: JSON.stringify(savedIntake) };
              if (/FROM entitlements/i.test(sql)) return null;
              return null;
            },
            async run() {
              if (/UPDATE resumes SET status = 'generating'/i.test(sql)) state.generationReserved = true;
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
    async batch() { return []; },
  };
  return { DB, state };
}

function geminiResponse(value: unknown): Response {
  return new Response(JSON.stringify({
    candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(value) }] } }],
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20 },
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

test("incomplete upload extraction automatically reconciles against the original source before returning prefill", async () => {
  const h = sessionAndRateLimitDb();
  let calls = 0;
  const prompts: string[] = [];
  const thin = {
    ...completePrefill,
    roles: [completePrefill.roles[0]],
    fieldValue: { certifications: [], licenses: "", tools: [], equipmentSystems: [], technicalSkills: [], software: [], safety: [] },
    education: "",
  };
  const dependencies: ResumeBuilderDependencies = {
    geminiFetch: (async (_input, init) => {
      calls += 1;
      const body = JSON.parse(String(init?.body)) as { systemInstruction?: { parts?: Array<{ text?: string }> } };
      prompts.push(body.systemInstruction?.parts?.[0]?.text ?? "");
      return geminiResponse(calls === 1 ? thin : completePrefill);
    }) as typeof fetch,
  };

  const response = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/resume-import", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie, Origin: "https://tradehustl3.com" },
      body: JSON.stringify({ fileName: "resume.pdf", fileType: "pdf", text: sourceResume }),
    }),
    {
      DB: h.DB as unknown as D1Database,
      RESUME_AI_PROVIDER: "gemini",
      RESUME_AI_BRIDGE_URL: "https://resume-ai-bridge.example.run.app",
      RESUME_AI_BRIDGE_SECRET: "bridge-secret",
    },
    dependencies,
  );

  assert.ok(response);
  assert.equal(response.status, 200);
  const payload = await response.json() as { ok?: boolean; reconciled?: boolean; prefill?: { roles?: unknown[] } };
  assert.equal(payload.ok, true);
  assert.equal(payload.reconciled, true);
  assert.equal(payload.prefill?.roles?.length, 3);
  assert.equal(calls, 2);
  assert.match(prompts[1], /Extraction coverage reconciliation rule/i);
  assert.match(prompts[1], /every distinct job, employer, job title/i);
});

test("generation is blocked before the model or run reservation when saved upload coverage is incomplete", async () => {
  const savedIntake = {
    contact: { fullName: "Alex Morgan", email: "alex@example.com", phone: "404-555-0199", cityState: "Atlanta, GA" },
    career: { yearsExperience: "6–10 years", summaryNotes: "Facilities maintenance experience." },
    fieldValue: { certifications: [], licenses: "", tools: [], equipmentSystems: [], technicalSkills: [], software: [], safety: [] },
    experience: [{
      employer: "American Campus Communities",
      jobTitle: "Maintenance Supervisor",
      startDate: "June 2024",
      endDate: "July 2026",
      responsibilities: "Led preventive maintenance and HVAC diagnostics.",
    }],
    education: "",
    sourceResumeText: sourceResume,
    targetJob: { title: "Maintenance Supervisor", company: "", location: "" },
    meta: { source: "upload", importedResume: true, sourceResumePreserved: true },
  };
  const h = sessionAndRateLimitDb(savedIntake);
  let modelCalls = 0;

  const response = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/resumes/resume-1/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie, Origin: "https://tradehustl3.com" },
      body: "{}",
    }),
    {
      DB: h.DB as unknown as D1Database,
      RESUME_AI_PROVIDER: "gemini",
      RESUME_AI_BRIDGE_URL: "https://resume-ai-bridge.example.run.app",
      RESUME_AI_BRIDGE_SECRET: "bridge-secret",
    },
    {
      geminiFetch: (async () => {
        modelCalls += 1;
        return geminiResponse(completePrefill);
      }) as typeof fetch,
    },
  );

  assert.ok(response);
  assert.equal(response.status, 422);
  const payload = await response.json() as { code?: string; runConsumed?: boolean; extractedRoles?: number; sourceRoleSignals?: number };
  assert.equal(payload.code, "EXTRACTION_COVERAGE_FAILED");
  assert.equal(payload.runConsumed, false);
  assert.equal(payload.extractedRoles, 1);
  assert.equal(payload.sourceRoleSignals, 3);
  assert.equal(modelCalls, 0);
  assert.equal(h.state.generationReserved, false);
});