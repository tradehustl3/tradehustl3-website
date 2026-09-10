import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalSourceRecord,
  repairResumeFromSource,
  validateResumeAgainstSource,
} from "../worker/resume-quality";
import type { GeneratedResume } from "../worker/resume-documents";

const rawResume = `
Jordan Tech
jordan@example.com | 555-222-1111

EXPERIENCE
Maintenance Technician | North Plant | 2022 - Present
- Diagnosed rooftop HVAC equipment and replaced contactors and capacitors.
- Managed preventive-maintenance work orders in Salesforce.

EDUCATION
Metro Technical College — HVAC Technical Certificate

CERTIFICATIONS
EPA 608 Universal

TOOLS
Multimeter, manifold gauges, vacuum pump

TRAINING
Lockout/tagout safety training
`;

function uploadedIntake() {
  return {
    meta: { importedResume: true, source: "upload" },
    sourceResumeText: rawResume,
    contact: { fullName: "Jordan Tech", email: "jordan@example.com", phone: "555-222-1111" },
    targetJob: { title: "HVAC Technician" },
    // Intentionally thin structured extraction: raw upload contains Salesforce duty,
    // tools, education, credential and training that are not all represented here.
    experience: [{
      employer: "North Plant",
      jobTitle: "Maintenance Technician",
      startDate: "2022",
      current: true,
      responsibilities: "Diagnosed rooftop HVAC equipment.",
    }],
    fieldValue: { certifications: [], tools: [], equipmentSystems: [], technicalSkills: [], software: [], safety: [] },
    education: "",
    additionalDetails: "",
  };
}

function generated(): GeneratedResume {
  return {
    basics: { fullName: "Jordan Tech", targetTitle: "HVAC Technician", email: "jordan@example.com", phone: "555-222-1111" },
    summary: "HVAC technician experienced with rooftop HVAC equipment.",
    skills: ["Multimeter", "Manifold gauges", "Vacuum pump"],
    certifications: [{ name: "EPA 608 Universal" }],
    experience: [{
      employer: "North Plant",
      jobTitle: "Maintenance Technician",
      startDate: "2022",
      endDate: "Present",
      bullets: [
        "Diagnosed rooftop HVAC equipment and replaced contactors and capacitors.",
        "Managed preventive-maintenance work orders in Salesforce.",
      ],
    }],
    education: [{ credential: "HVAC Technical Certificate", institution: "Metro Technical College" }],
    additionalInformation: ["Lockout/tagout safety training"],
  };
}

test("original uploaded resume supports generated facts omitted by structured extraction", () => {
  const source = canonicalSourceRecord(uploadedIntake(), "HVAC Technician");
  const issues = validateResumeAgainstSource(generated(), source);
  assert.equal(issues.some((issue) => issue.code === "unsupported_duty"), false);
  assert.equal(issues.some((issue) => issue.code === "unsupported_skill"), false);
  assert.equal(issues.some((issue) => issue.code === "unsupported_credential"), false);
  assert.equal(issues.some((issue) => issue.code === "unsupported_education"), false);
  assert.equal(issues.some((issue) => issue.code === "unsupported_additional_information"), false);
});

test("deterministic repair keeps raw-upload-grounded duties and training", () => {
  const source = canonicalSourceRecord(uploadedIntake(), "HVAC Technician");
  const repaired = repairResumeFromSource(generated(), source);
  assert.ok(repaired.experience[0]?.bullets.some((bullet) => bullet.includes("Salesforce")));
  assert.ok(repaired.additionalInformation.some((item) => item.includes("Lockout/tagout")));
  assert.ok(repaired.education.some((item) => item.institution === "Metro Technical College"));
  assert.ok(repaired.certifications.some((item) => item.name === "EPA 608 Universal"));
  assert.ok(repaired.skills.includes("Multimeter"));
});
