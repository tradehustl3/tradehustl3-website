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

test("complete multi-job extraction passes coverage gate", () => {
  const result = assessResumeExtractionCoverage(source, complete);
  assert.equal(result.ready, true);
  assert.equal(result.sourceRoleSignals, 3);
  assert.equal(result.extractedRoles, 3);
  assert.deepEqual(result.issues, []);
});

test("thin extraction is blocked before generation when uploaded source has multiple jobs and sections", () => {
  const result = assessResumeExtractionCoverage(source, {
    roles: [{ employer: "American Campus Communities", jobTitle: "Maintenance Supervisor", responsibilities: "" }],
    fieldValue: { certifications: [], tools: [], equipmentSystems: [], technicalSkills: [], software: [], safety: [], licenses: "" },
    education: "",
    additionalDetails: "",
  });
  assert.equal(result.ready, false);
  const codes = new Set(result.issues.map((issue) => issue.code));
  for (const code of ["jobs", "dates", "responsibilities", "education", "credentials", "skills_tools", "software_cmms", "training"]) {
    assert.equal(codes.has(code as never), true, `expected coverage issue: ${code}`);
  }
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
});

test("guided intake without an uploaded source is not subject to upload coverage gate", () => {
  const result = assessSavedIntakeExtractionCoverage({
    experience: [],
    education: "",
    meta: { source: "guided_intake", importedResume: false },
  });
  assert.equal(result.ready, true);
  assert.deepEqual(result.issues, []);
});
