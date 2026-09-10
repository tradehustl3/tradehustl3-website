import assert from "node:assert/strict";
import test from "node:test";
import {
  assessResumeExtractionCoverage,
  assessSavedIntakeExtractionCoverage,
} from "../worker/resume-extraction-coverage";

const source = `
ALEX MORGAN
Maintenance Supervisor

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
Lockout/Tagout, respirator fit, silica safety training
`;

const complete = {
  roles: [
    { employer: "American Campus Communities", jobTitle: "Maintenance Supervisor", startDate: "June 2024", endDate: "July 2026", responsibilities: "Led preventive maintenance, HVAC diagnostics, vendor coordination, and Salesforce work orders." },
    { employer: "Cooler Heating & Air", jobTitle: "HVAC Technician", startDate: "April 2019", endDate: "May 2024", responsibilities: "Diagnosed split systems, replaced motors and contactors, performed recovery and vacuum procedures." },
    { employer: "Metro Facilities", jobTitle: "Maintenance Technician", startDate: "January 2016", endDate: "March 2019", responsibilities: "Completed electrical, plumbing, HVAC, and building repairs using CMMS work orders." },
  ],
  fieldValue: {
    certifications: ["EPA 608 Universal", "OSHA 10"],
    licenses: "",
    tools: ["Multimeter", "digital manifold gauges", "vacuum pump", "recovery machine", "leak detector"],
    equipmentSystems: [],
    technicalSkills: ["HVAC diagnostics", "electrical troubleshooting", "preventive maintenance"],
    software: ["Salesforce", "UpKeep"],
    safety: ["Lockout/Tagout", "respirator fit", "silica safety training"],
  },
  education: "Atlanta Technical College — HVAC Technical Certificate",
  additionalDetails: "",
};

function codes(items: Array<{ code: string }>): string[] {
  return items.map((item) => item.code).sort();
}

test("complete multi-job extraction passes coverage gate", () => {
  const result = assessResumeExtractionCoverage(source, complete);
  assert.equal(result.ready, true);
  assert.equal(result.sourceRoleSignals, 3);
  assert.equal(result.extractedRoles, 3);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.warnings, []);
});

test("thin extraction is blocked only by missing core resume facts", () => {
  const result = assessResumeExtractionCoverage(source, {
    roles: [{ employer: "American Campus Communities", jobTitle: "Maintenance Supervisor", responsibilities: "" }],
    fieldValue: { certifications: [], tools: [], equipmentSystems: [], technicalSkills: [], software: [], safety: [], licenses: "" },
    education: "",
    additionalDetails: "",
  });

  assert.equal(result.ready, false);
  assert.deepEqual(codes(result.issues), [
    "credentials",
    "dates",
    "education",
    "jobs",
    "responsibilities",
  ]);
  assert.deepEqual(codes(result.warnings), ["skills_tools", "software_cmms", "training"]);
});

test("missing optional enrichment fields cannot block an otherwise valid uploaded resume", () => {
  const result = assessResumeExtractionCoverage(source, {
    roles: complete.roles.map((role) => ({
      ...role,
      equipment: "",
      systems: "",
      workPerformed: "",
      leadership: "",
      workOrders: "",
      measurable: "",
    })),
    fieldValue: {
      certifications: ["EPA 608 Universal", "OSHA 10"],
      licenses: "",
      tools: [],
      equipmentSystems: [],
      technicalSkills: [],
      software: [],
      safety: [],
    },
    education: complete.education,
    additionalDetails: "",
  });

  // PASS: every dated role has its employer, title, dates and substantive duty text;
  // education and credentials explicitly present in the source were preserved.
  assert.equal(result.ready, true);
  assert.deepEqual(result.issues, []);

  // Missing equipment, systems, leadership/work-order detail, tools/skills,
  // CMMS/software and training may be reported for diagnostics, but never block.
  assert.deepEqual(codes(result.warnings), ["skills_tools", "software_cmms", "training"]);
});

test("missing core role identity, dates, or substantive work still blocks even when optional enrichment exists", () => {
  const result = assessResumeExtractionCoverage(source, {
    ...complete,
    roles: [
      {
        ...complete.roles[0],
        employer: "",
        jobTitle: "",
        startDate: "",
        endDate: "",
        responsibilities: "",
      },
      complete.roles[1],
      complete.roles[2],
    ],
  });

  assert.equal(result.ready, false);
  assert.deepEqual(codes(result.issues), ["dates", "employers", "job_titles", "responsibilities"]);
  assert.deepEqual(result.warnings, []);
});

test("education and credentials remain blocking source facts when the uploaded resume explicitly contains them", () => {
  const result = assessResumeExtractionCoverage(source, {
    ...complete,
    fieldValue: {
      ...complete.fieldValue,
      certifications: [],
      licenses: "",
    },
    education: "",
  });

  assert.equal(result.ready, false);
  assert.deepEqual(codes(result.issues), ["credentials", "education"]);
  assert.deepEqual(result.warnings, []);
});

test("saved uploaded intake is checked against its authoritative source text", () => {
  const result = assessSavedIntakeExtractionCoverage({
    ...complete,
    experience: complete.roles,
    roles: undefined,
    sourceResumeText: source,
    meta: { source: "upload", importedResume: true, sourceResumePreserved: true },
  });
  assert.equal(result.ready, true);
  assert.equal(result.extractedRoles, 3);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.warnings, []);
});

test("guided intake without an uploaded source is not subject to upload coverage gate", () => {
  const result = assessSavedIntakeExtractionCoverage({
    experience: [],
    education: "",
    meta: { source: "guided_intake", importedResume: false },
  });
  assert.equal(result.ready, true);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.warnings, []);
});
