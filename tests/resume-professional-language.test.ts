import assert from "node:assert/strict";
import test from "node:test";
import { validatePostStructure } from "../worker/resume-quality-hard-gate";
import type { GeneratedResume } from "../worker/resume-documents";

function resumeWithBullet(bullet: string): GeneratedResume {
  return {
    basics: { fullName: "Test Candidate", targetTitle: "Maintenance Technician" },
    summary: "Maintenance professional with hands-on building systems experience.",
    skills: ["Preventive Maintenance"],
    certifications: [],
    experience: [{
      jobTitle: "Maintenance Technician",
      employer: "Example Property",
      location: "Atlanta, GA",
      startDate: "2024",
      endDate: "Present",
      bullets: [bullet],
    }],
    education: [],
    additionalInformation: [],
  };
}

for (const bullet of [
  "i lead 4 people on my team",
  "yea i worked on Salesforce",
  "I was Responsibilities for preventive maintenance",
  "I'm gonna fix HVAC equipment",
]) {
  test(`blocks raw customer wording: ${bullet}`, () => {
    const issues = validatePostStructure(resumeWithBullet(bullet));
    assert.equal(issues.some((issue) => issue.code === "raw_intake_language"), true);
  });
}

test("accepts a professional rewrite of the same verified fact", () => {
  const issues = validatePostStructure(resumeWithBullet(
    "Led a four-person maintenance team and coordinated daily work assignments.",
  ));
  assert.equal(issues.some((issue) => issue.code === "raw_intake_language"), false);
});

test("blocks first-person wording in the professional summary", () => {
  const resume = resumeWithBullet("Managed preventive maintenance work orders.");
  resume.summary = "I have experience maintaining commercial building systems.";
  const issues = validatePostStructure(resume);
  assert.equal(issues.some((issue) => issue.code === "raw_intake_language"), true);
});
