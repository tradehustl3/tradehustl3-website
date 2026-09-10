import assert from "node:assert/strict";
import test from "node:test";
import { runResumeCalibration } from "../scripts/lib/resume-calibration";
import type { ResumeBuilderDependencies, ResumeBuilderEnv } from "../worker/resume-builder-base";

const sourceText = `
ZACHARY ELLIS
Building Equipment Mechanic | HVAC & Facilities Maintenance
Marietta, GA | 470-557-6004 | zmaintenance88@gmail.com
EPA 608 Universal Certification | OSHA 10 | HVAC Technical Certificate
Service Supervisor | American Campus Communities | Apr 2026 - Jul 2026
Directed maintenance operations covering HVAC, electrical, plumbing, appliances, and building repairs.
Independent HVAC Technician | Cooler Heating & Air | Jan 2022 - Mar 2026
Diagnosed and repaired air conditioners, furnaces, heat pumps, thermostats, and controls.
`;

const prefill = {
  trade: "Facilities Maintenance",
  experienceLevel: "6–10 years",
  targetJobTitle: "Building Equipment Mechanic",
  contact: { fullName: "Zachary Ellis", phone: "470-557-6004", cityState: "Marietta, GA" },
  summaryNotes: "HVAC and facilities maintenance professional",
  roles: [
    { employer: "American Campus Communities", jobTitle: "Service Supervisor", location: "", employmentType: "", startDate: "Apr 2026", endDate: "Jul 2026", current: false, responsibilities: "Directed maintenance operations covering HVAC, electrical, plumbing, appliances, and building repairs.", equipment: "", systems: "", workPerformed: "", leadership: "", workOrders: "", measurable: "" },
    { employer: "Cooler Heating & Air", jobTitle: "Independent HVAC Technician", location: "", employmentType: "", startDate: "Jan 2022", endDate: "Mar 2026", current: false, responsibilities: "Diagnosed and repaired air conditioners, furnaces, heat pumps, thermostats, and controls.", equipment: "", systems: "", workPerformed: "", leadership: "", workOrders: "", measurable: "" },
  ],
  fieldValue: { certifications: ["EPA 608 Universal Certification", "HVAC Technical Certificate"], licenses: "", tools: [], equipmentSystems: ["Air conditioners", "Furnaces", "Heat pumps"], technicalSkills: ["HVAC diagnostics"], software: [], safety: ["OSHA 10"] },
  education: "",
  additionalDetails: "",
};

const generated = {
  basics: { fullName: "Zachary Ellis", targetTitle: "Building Equipment Mechanic", location: "Marietta, GA", phone: "470-557-6004", email: "zmaintenance88@gmail.com" },
  summary: "HVAC and facilities maintenance professional experienced in building systems and equipment diagnostics.",
  skills: ["HVAC Diagnostics", "Electrical Troubleshooting", "Preventive Maintenance"],
  certifications: [{ name: "EPA 608 Universal Certification" }, { name: "HVAC Technical Certificate" }],
  experience: [
    { jobTitle: "Service Supervisor", employer: "American Campus Communities", startDate: "Apr 2026", endDate: "Jul 2026", bullets: ["Directed maintenance operations across HVAC, electrical, plumbing, appliances, and building repairs."] },
    { jobTitle: "Independent HVAC Technician", employer: "Cooler Heating & Air", startDate: "Jan 2022", endDate: "Mar 2026", bullets: ["Diagnosed and repaired air conditioners, furnaces, heat pumps, thermostats, and controls."] },
  ],
  education: [],
  additionalInformation: ["OSHA 10"],
  claimSources: [
    { claimPath: "summary", sourceFactIds: ["upload.raw.0"] },
    { claimPath: "skills.0", sourceFactIds: ["upload.raw.0"] },
    { claimPath: "skills.1", sourceFactIds: ["roles.0.bullets.0"] },
    { claimPath: "skills.2", sourceFactIds: ["roles.0.bullets.0"] },
    { claimPath: "certifications.0", sourceFactIds: ["upload.raw.0"] },
    { claimPath: "certifications.1", sourceFactIds: ["upload.raw.0"] },
    { claimPath: "experience.0.bullets.0", sourceFactIds: ["roles.0.bullets.0"] },
    { claimPath: "experience.1.bullets.0", sourceFactIds: ["roles.1.bullets.0"] },
    { claimPath: "additionalInformation.0", sourceFactIds: ["upload.raw.0"] },
  ],
};

function dependencies(): ResumeBuilderDependencies {
  return {
    geminiFetch: async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { systemInstruction?: { parts?: Array<{ text?: string }> } };
      const isImport = body.systemInstruction?.parts?.[0]?.text?.includes("extract factual resume data");
      return new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(isImport ? prefill : generated) }] } }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 200 } }), { status: 200, headers: { "Content-Type": "application/json" } });
    },
    createDocx: async () => new TextEncoder().encode("DOCX"),
    createPdf: async (_resume, watermarked) => new TextEncoder().encode(watermarked ? "PREVIEW" : "PDF"),
  };
}

const env: ResumeBuilderEnv = {
  DB: {} as D1Database,
  CALIBRATION_MODE: "1",
  RESUME_AI_PROVIDER: "gemini",
  RESUME_AI_BRIDGE_URL: "https://bridge.example",
  RESUME_AI_BRIDGE_SECRET: "test-secret",
};

test("calibration runner rejects execution unless explicitly enabled", async () => {
  await assert.rejects(() => runResumeCalibration({ ...env, CALIBRATION_MODE: "0" }, { fileName: "resume.docx", sourceText }, dependencies()), /disabled/i);
});

test("calibration runner skips account storage and returns the production-quality artifacts", async () => {
  const result = await runResumeCalibration(env, { fileName: "resume.docx", sourceText, trade: "Facilities Maintenance", title: "Building Equipment Mechanic" }, dependencies());
  assert.equal(result.extraction.ready, true);
  assert.equal(result.resume.basics.email, "zmaintenance88@gmail.com");
  assert.equal(result.resume.experience.length, 2);
  assert.equal(new TextDecoder().decode(result.files.docx), "DOCX");
  assert.equal(new TextDecoder().decode(result.files.pdf), "PDF");
  assert.equal(new TextDecoder().decode(result.files.preview), "PREVIEW");
  assert.deepEqual(result.guardFlags, []);
});
