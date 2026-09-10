import assert from "node:assert/strict";
import test from "node:test";
import type { GeneratedResume } from "../worker/resume-documents";
import {
  evaluateCriticalResumeGate,
  hardenResumeCriticalFacts,
} from "../worker/resume-quality-hard-gate";

const intake = {
  contact: {
    fullName: "Kam Ellis",
    email: "kam@example.com",
    phone: "404-555-0100",
    cityState: "Atlanta, GA",
  },
  targetJob: { title: "Facilities Maintenance Technician" },
  fieldValue: {
    certifications: ["EPA 608"],
    technicalSkills: ["HVAC diagnostics", "Plumbing repair", "Preventive maintenance"],
    tools: ["Multimeter", "Gauge manifolds"],
    equipmentSystems: ["Split systems", "Heat pumps"],
  },
  experience: [
    {
      employer: "Property Services LLC",
      jobTitle: "Maintenance Technician",
      location: "Atlanta, GA",
      startDate: "2021",
      endDate: "Present",
      responsibilities: "Diagnosed HVAC faults. Repaired plumbing fixtures. Completed preventive maintenance.",
    },
  ],
  education: "HVAC Technical Certificate — Metro Technical College",
};

const incomplete: GeneratedResume = {
  basics: {
    fullName: "Kam Ellis",
    targetTitle: "Facilities Maintenance Technician",
    location: "Atlanta, GA",
    phone: "404-555-0100",
    email: "kam@example.com",
  },
  summary: "Skilled trades professional with verified experience in HVAC diagnostics and plumbing repair.",
  skills: ["HVAC diagnostics", "Plumbing repair", "Preventive maintenance"],
  certifications: [{ name: "EPA 608" }],
  experience: [{
    employer: "Property Services LLC",
    jobTitle: "Maintenance Technician",
    location: "Atlanta, GA",
    startDate: "2021",
    endDate: "Present",
    bullets: [
      "Diagnosed HVAC faults.",
      "Repaired plumbing fixtures.",
      "Completed preventive maintenance.",
    ],
  }],
  education: [],
  additionalInformation: [],
};

test("hard gate restores verified education that the model dropped", () => {
  const hardened = hardenResumeCriticalFacts(incomplete, intake, "Facilities Maintenance Technician");
  assert.equal(hardened.education.length, 1);
  assert.equal(hardened.education[0].credential, "HVAC Technical Certificate");
  assert.equal(hardened.education[0].institution, "Metro Technical College");
});

test("hard gate returns a checkout-ready resume only after critical facts are preserved", () => {
  const result = evaluateCriticalResumeGate(incomplete, intake, "Facilities Maintenance Technician");
  assert.equal(result.resume.education.length, 1);
  assert.equal(result.issues.length, 0);
  assert.equal(result.ready, true);
  assert.ok(result.score >= 80);
});

test("hard gate blocks a resume that loses verified contact information", () => {
  const result = evaluateCriticalResumeGate({
    ...incomplete,
    basics: { ...incomplete.basics, phone: "" },
  }, intake, "Facilities Maintenance Technician");
  assert.equal(result.ready, true);
  assert.equal(result.resume.basics.phone, "404-555-0100");
});

test("hard gate keeps source facts instead of inventing replacement education", () => {
  const result = evaluateCriticalResumeGate({
    ...incomplete,
    education: [{ credential: "Bachelor of Engineering", institution: "Invented University" }],
  }, intake, "Facilities Maintenance Technician");
  assert.equal(result.ready, true);
  assert.equal(JSON.stringify(result.resume).includes("Invented University"), false);
  assert.equal(JSON.stringify(result.resume).includes("Metro Technical College"), true);
});

test("hard gate replaces corrupted model contact data with verified intake values", () => {
  const result = evaluateCriticalResumeGate({
    ...incomplete,
    basics: {
      ...incomplete.basics,
      fullName: "Kam Ellis - candidate maybe?",
      email: "wrong-model-email@example.net",
      phone: "404-555-0100 wait use this number instead maybe 404-555-0100",
      location: "Atlanta, GA or nearby",
    },
  }, intake, "Facilities Maintenance Technician");

  assert.equal(result.ready, true);
  assert.equal(result.resume.basics.fullName, "Kam Ellis");
  assert.equal(result.resume.basics.email, "kam@example.com");
  assert.equal(result.resume.basics.phone, "404-555-0100");
  assert.equal(result.resume.basics.location, "Atlanta, GA");
});
