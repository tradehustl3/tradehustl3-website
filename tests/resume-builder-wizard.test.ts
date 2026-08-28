import assert from "node:assert/strict";
import test from "node:test";
import { unsupportedNumbers } from "../worker/resume-builder";
import type { GeneratedResume } from "../worker/resume-documents";
import {
  emptyRole,
  emptyWizardData,
  fromIntake,
  roleNarrative,
  toIntake,
} from "../app/resume-builder/intake/wizard-data";

// Loose readers for the intentionally free-form intake payload.
const obj = (value: unknown): Record<string, unknown> => value as Record<string, unknown>;
const arr = (value: unknown): Record<string, unknown>[] => value as Record<string, unknown>[];
const str = (value: unknown): string => String(value ?? "");

const baseGenerated: GeneratedResume = {
  basics: { fullName: "Jordan Vega", targetTitle: "HVAC Service Technician" },
  summary: "Refrigeration technician who keeps commercial systems online.",
  skills: ["Brazing", "Refrigerant charging"],
  certifications: [],
  experience: [],
  education: [],
  additionalInformation: [],
};

// -- numeric guard: the guided intake's structured fields count as fact --------

test("a number entered in a role's structured equipment field is not flagged as invented", () => {
  const generated: GeneratedResume = {
    ...baseGenerated,
    experience: [{
      jobTitle: "HVAC Technician",
      employer: "Peak Mechanical",
      bullets: ["Maintained 42 rooftop units across a national retail portfolio"],
    }],
  };
  const intake = {
    contact: { fullName: "Jordan Vega" },
    career: { yearsExperience: "3–5 years", summaryNotes: "Commercial HVAC." },
    experience: [{
      employer: "Peak Mechanical",
      jobTitle: "HVAC Technician",
      equipment: "42 rooftop units, split systems, walk-in coolers",
      responsibilitiesAndWins: "Equipment: 42 rooftop units, split systems, walk-in coolers",
    }],
  };
  assert.deepEqual(unsupportedNumbers(generated, intake), []);
});

test("a certification number selected in the field-value step is treated as supported", () => {
  const generated: GeneratedResume = {
    ...baseGenerated,
    certifications: [{ name: "EPA 608 Universal" }, { name: "OSHA 30" }],
  };
  const intake = {
    contact: { fullName: "Jordan Vega" },
    career: { yearsExperience: "3–5 years", summaryNotes: "Commercial HVAC." },
    fieldValue: {
      certifications: ["EPA 608 Universal", "OSHA 30"],
      tools: [],
      equipmentSystems: [],
      technicalSkills: [],
      software: [],
      safety: [],
      licenses: "",
    },
    experience: [],
  };
  assert.deepEqual(unsupportedNumbers(generated, intake), []);
});

test("a fabricated number that appears in no intake field is still flagged", () => {
  const generated: GeneratedResume = {
    ...baseGenerated,
    summary: "Refrigeration technician with 12 years leading rooftop retrofits.",
  };
  const intake = {
    contact: { fullName: "Jordan Vega" },
    career: { yearsExperience: "3–5 years", summaryNotes: "Commercial HVAC service and PMs." },
    fieldValue: { certifications: [], tools: [], equipmentSystems: [], technicalSkills: [], software: [], safety: [], licenses: "" },
    experience: [],
  };
  const flags = unsupportedNumbers(generated, intake);
  assert.ok(flags.some((flag) => flag.token === "12" && flag.section === "career summary"));
});

test("the legacy intake shape (only responsibilitiesAndWins + career notes) still validates", () => {
  const generated: GeneratedResume = {
    ...baseGenerated,
    summary: "Technician with 6 years of commercial refrigeration experience.",
    experience: [{
      jobTitle: "Refrigeration Tech",
      bullets: ["Completed 30 preventive-maintenance visits each month"],
    }],
  };
  const intake = {
    contact: { fullName: "Jordan Vega" },
    career: { yearsExperience: "6–10 years", summaryNotes: "6 years commercial refrigeration." },
    experience: [{ responsibilitiesAndWins: "Completed 30 PM visits per month on refrigeration racks." }],
  };
  assert.deepEqual(unsupportedNumbers(generated, intake), []);
});

// -- wizard <-> intake mapping keeps the legacy contract ----------------------

test("toIntake mirrors structured role detail into the legacy responsibilitiesAndWins field", () => {
  const data = emptyWizardData();
  data.trade = "Facilities Maintenance";
  data.experienceLevel = "3–5 years";
  data.contact = { fullName: "Sam Rivera", phone: "555-0100", cityState: "Dallas, TX" };
  data.summaryNotes = "Multi-trade building maintenance.";
  data.roles = [{
    ...emptyRole(),
    employer: "Northline Properties",
    jobTitle: "Maintenance Lead",
    responsibilities: "Ran the day shift work-order queue.",
    equipment: "Package HVAC, boilers, sump pumps",
    measurable: "Closed 55 work orders per week across 3 properties",
    workOrders: "Corrigo and mobile work-order app",
  }];
  data.fieldValue.tools = ["Multimeter", "Drain auger"];
  data.fieldValue.certifications = ["EPA 608", "CPO"];
  data.fieldValue.safety = ["Lockout/tagout (LOTO)"];

  const intake = obj(toIntake(data, "sam@example.com"));
  const role = arr(intake.experience)[0];
  const career = obj(intake.career);

  assert.equal(str(role.measurable), "Closed 55 work orders per week across 3 properties");
  assert.match(str(role.responsibilitiesAndWins), /Ran the day shift work-order queue/);
  assert.match(str(role.responsibilitiesAndWins), /Corrigo and mobile work-order app/);
  assert.match(str(role.responsibilitiesAndWins), /55 work orders per week/);
  assert.match(str(career.skillsAndTools), /Multimeter/);
  assert.match(str(career.licensesAndCertifications), /EPA 608/);
  assert.match(str(career.safetyTraining), /LOTO/);
  assert.equal(str(obj(intake.contact).email), "sam@example.com");
  assert.equal(str(career.yearsExperience), "3–5 years");
});

test("roleNarrative and toIntake drop fully empty roles", () => {
  const data = emptyWizardData();
  data.trade = "Electrical";
  data.roles = [emptyRole(), emptyRole()];
  const intake = obj(toIntake(data, "e@example.com"));
  assert.equal(arr(intake.experience).length, 0);
  assert.equal(roleNarrative(emptyRole()), "");
});

test("fromIntake hydrates a legacy resume without a structured fieldValue block", () => {
  const legacy = {
    contact: { fullName: "Old Save", phone: "555-1111", cityState: "Reno, NV" },
    career: {
      yearsExperience: "1–2 years",
      summaryNotes: "Apprentice plumber.",
      skillsAndTools: "PEX crimp, press tool, drain snake",
      licensesAndCertifications: "OSHA 10",
      safetyTraining: "Confined space, LOTO",
    },
    experience: [{ employer: "City Plumbing", jobTitle: "Apprentice", dates: "2023 – Present", responsibilitiesAndWins: "Assisted on 20 residential rough-ins." }],
    education: "Trade school, 2023",
  };
  const data = fromIntake(legacy, { trade: "Plumbing", title: "Plumber", posting: "", fullName: null });
  assert.equal(data.trade, "Plumbing");
  assert.equal(data.experienceLevel, "1–2 years");
  assert.equal(data.roles[0].employer, "City Plumbing");
  assert.equal(data.roles[0].current, true);
  assert.match(data.roles[0].responsibilities, /20 residential rough-ins/);
  assert.ok(data.fieldValue.safety.includes("Confined space"));

  // Round-trip keeps the customer's numbers available to the guard.
  const generated: GeneratedResume = {
    ...baseGenerated,
    experience: [{ jobTitle: "Apprentice", bullets: ["Assisted on 20 residential rough-ins"] }],
  };
  assert.deepEqual(unsupportedNumbers(generated, toIntake(data, "old@example.com")), []);
});

test("a fully loaded ten-role intake stays well under the worker size ceiling", () => {
  const data = emptyWizardData();
  data.trade = "HVAC & Refrigeration";
  data.experienceLevel = "11+ years";
  data.contact = { fullName: "Capacity Check", phone: "555-0000", cityState: "Phoenix, AZ" };
  data.summaryNotes = "x".repeat(1200);
  data.roles = Array.from({ length: 10 }, (_, index) => ({
    ...emptyRole(),
    employer: `Employer ${index}`,
    jobTitle: "Lead Technician",
    responsibilities: "y".repeat(1200),
    equipment: "z".repeat(400),
    systems: "z".repeat(400),
    workPerformed: "z".repeat(400),
    leadership: "z".repeat(400),
    workOrders: "z".repeat(400),
    measurable: "z".repeat(400),
  }));
  const size = JSON.stringify(toIntake(data, "cap@example.com")).length;
  assert.ok(size < 120_000, `intake JSON was ${size} chars`);
});
