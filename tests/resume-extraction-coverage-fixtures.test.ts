import assert from "node:assert/strict";
import test from "node:test";
import { assessResumeExtractionCoverage, repairResumeExtractionFromSource } from "../worker/resume-extraction-coverage";

type ExpectedGate = {
  ready: boolean;
  issues: string[];
  warnings: string[];
  sourceRoleSignals: number;
  extractedRoles: number;
};

type CoverageFixture = {
  name: string;
  source: string;
  structured: Record<string, unknown>;
  expected: ExpectedGate;
};

function codes(items: Array<{ code: string }>): string[] {
  return items.map((item) => item.code).sort();
}

const noOptionalSectionsSource = `
JORDAN TECH
PROFESSIONAL EXPERIENCE
North Plant — Maintenance Technician — Atlanta, GA
January 2022 - Present
Performed preventive and corrective building maintenance and HVAC diagnostics.
`;

const optionalFieldsBlankSource = `
JORDAN TECH
PROFESSIONAL EXPERIENCE
North Plant — Maintenance Technician — Atlanta, GA
January 2022 - Present
Diagnosed rooftop HVAC equipment, handled building systems, led repair coordination, and documented Salesforce work orders.
`;

const multipleJobsSource = `
JORDAN TECH
PROFESSIONAL EXPERIENCE
North Plant — Maintenance Technician — Atlanta, GA
January 2024 - Present
Performed HVAC diagnostics and preventive maintenance.

South Campus — HVAC Technician — Marietta, GA
May 2021 - December 2023
Serviced split systems and completed corrective repairs.

Metro Facilities — Maintenance Mechanic — Atlanta, GA
March 2018 - April 2021
Completed electrical, plumbing, mechanical, and general building repairs.
`;

const overlappingDatesSource = `
JORDAN TECH
PROFESSIONAL EXPERIENCE
Campus Housing — Service Supervisor — Atlanta, GA
April 2024 - July 2026
Directed maintenance operations and coordinated emergency HVAC repairs.

Cooler Heating & Air — HVAC Technician — Marietta, GA
January 2022 - March 2026
Diagnosed and repaired air conditioners, furnaces, and heat pumps.

Senior Living Center — Maintenance Supervisor — Gulfport, MS
April 2020 - December 2022
Led preventive and corrective maintenance for building systems.
`;

const proseCredentialSource = `
JORDAN TECH
HVAC technician with EPA 608 Universal certification and OSHA 10 safety training.

PROFESSIONAL EXPERIENCE
Coastal Air — HVAC Technician — Gulfport, MS
June 2021 - Present
Diagnosed HVAC systems, completed preventive maintenance, and repaired electrical controls.
`;

const productionShapeSource = `
JORDAN TECH
BUILDING EQUIPMENT MECHANIC / HVAC & FACILITIES MAINTENANCE

CERTIFICATIONS
EPA 608 Universal Certification
OSHA 10
HVAC Technical Certificate

PROFESSIONAL EXPERIENCE
American Campus Communities — Service Supervisor — Marietta, GA
April 2026 - July 2026
Supervised technicians and coordinated HVAC, electrical, plumbing, appliance, and building repairs.
Managed work orders, parts, vendors, and emergency rooftop repairs.

TRC Staffing Services — Facility Maintenance Technician — Atlanta, GA
March 2026 - April 2026
Performed commercial preventive and corrective maintenance and HVAC inspections.
Completed filter changes, split-system repairs, and electrical and plumbing troubleshooting.

Cooler Heating & Air — Independent HVAC Technician — Marietta, GA
January 2022 - March 2026
Diagnosed and repaired air conditioners, furnaces, heat pumps, thermostats, controls, airflow, and refrigerant issues.
Performed preventive maintenance, installations, ductwork, and documented diagnoses and repairs.

Sunrise Senior Living — Maintenance Supervisor — Marietta, GA
April 2017 - December 2022
Led HVAC, electrical, plumbing, mechanical, resident-area, and common-area maintenance.
Managed preventive maintenance schedules, emergency repairs, vendors, and compliance records.

EDUCATION
Mississippi Gulf Coast Community College — Gulfport, MS
HVAC Technical Certification
`;

const fixtures: CoverageFixture[] = [
  {
    name: "PASS: valid resume with optional sections completely absent",
    source: noOptionalSectionsSource,
    structured: {
      roles: [{ employer: "North Plant", jobTitle: "Maintenance Technician", startDate: "January 2022", endDate: "Present", responsibilities: "Performed preventive and corrective building maintenance and HVAC diagnostics.", equipment: "", systems: "", workPerformed: "", leadership: "", workOrders: "", measurable: "" }],
      fieldValue: { certifications: [], licenses: "", tools: [], equipmentSystems: [], technicalSkills: [], software: [], safety: [] },
      education: "",
      additionalDetails: "",
    },
    expected: { ready: true, issues: [], warnings: [], sourceRoleSignals: 1, extractedRoles: 1 },
  },
  {
    name: "PASS: blank optional equipment systems leadership and CMMS fields are advisory only",
    source: optionalFieldsBlankSource,
    structured: {
      roles: [{ employer: "North Plant", jobTitle: "Maintenance Technician", startDate: "January 2022", endDate: "Present", responsibilities: "Diagnosed rooftop HVAC equipment, handled building systems, led repair coordination, and documented Salesforce work orders.", equipment: "", systems: "", workPerformed: "", leadership: "", workOrders: "", measurable: "" }],
      fieldValue: { certifications: [], licenses: "", tools: [], equipmentSystems: [], technicalSkills: [], software: [], safety: [] },
      education: "",
      additionalDetails: "",
    },
    expected: { ready: true, issues: [], warnings: ["skills_tools", "software_cmms"], sourceRoleSignals: 1, extractedRoles: 1 },
  },
  {
    name: "PASS: all jobs in a multi-job resume are represented",
    source: multipleJobsSource,
    structured: {
      roles: [
        { employer: "North Plant", jobTitle: "Maintenance Technician", startDate: "January 2024", endDate: "Present", responsibilities: "Performed HVAC diagnostics and preventive maintenance." },
        { employer: "South Campus", jobTitle: "HVAC Technician", startDate: "May 2021", endDate: "December 2023", responsibilities: "Serviced split systems and completed corrective repairs." },
        { employer: "Metro Facilities", jobTitle: "Maintenance Mechanic", startDate: "March 2018", endDate: "April 2021", responsibilities: "Completed electrical, plumbing, mechanical, and general building repairs." },
      ],
      fieldValue: { certifications: [], licenses: "", tools: [], equipmentSystems: [], technicalSkills: ["HVAC diagnostics"], software: [], safety: [] },
      education: "",
      additionalDetails: "",
    },
    expected: { ready: true, issues: [], warnings: [], sourceRoleSignals: 3, extractedRoles: 3 },
  },
  {
    name: "FAIL: one dated job is missing from a multi-job extraction",
    source: multipleJobsSource,
    structured: {
      roles: [
        { employer: "North Plant", jobTitle: "Maintenance Technician", startDate: "January 2024", endDate: "Present", responsibilities: "Performed HVAC diagnostics and preventive maintenance." },
        { employer: "South Campus", jobTitle: "HVAC Technician", startDate: "May 2021", endDate: "December 2023", responsibilities: "Serviced split systems and completed corrective repairs." },
      ],
      fieldValue: { certifications: [], licenses: "", tools: [], equipmentSystems: [], technicalSkills: ["HVAC diagnostics"], software: [], safety: [] },
      education: "",
      additionalDetails: "",
    },
    expected: { ready: false, issues: ["jobs"], warnings: [], sourceRoleSignals: 3, extractedRoles: 2 },
  },
  {
    name: "PASS: overlapping employment dates are valid when every role is preserved",
    source: overlappingDatesSource,
    structured: {
      roles: [
        { employer: "Campus Housing", jobTitle: "Service Supervisor", startDate: "April 2024", endDate: "July 2026", responsibilities: "Directed maintenance operations and coordinated emergency HVAC repairs." },
        { employer: "Cooler Heating & Air", jobTitle: "HVAC Technician", startDate: "January 2022", endDate: "March 2026", responsibilities: "Diagnosed and repaired air conditioners, furnaces, and heat pumps." },
        { employer: "Senior Living Center", jobTitle: "Maintenance Supervisor", startDate: "April 2020", endDate: "December 2022", responsibilities: "Led preventive and corrective maintenance for building systems." },
      ],
      fieldValue: { certifications: [], licenses: "", tools: [], equipmentSystems: ["building systems"], technicalSkills: [], software: [], safety: [] },
      education: "",
      additionalDetails: "",
    },
    expected: { ready: true, issues: [], warnings: [], sourceRoleSignals: 3, extractedRoles: 3 },
  },
  {
    name: "FAIL: overlapping dates do not excuse a missing role",
    source: overlappingDatesSource,
    structured: {
      roles: [
        { employer: "Campus Housing", jobTitle: "Service Supervisor", startDate: "April 2024", endDate: "July 2026", responsibilities: "Directed maintenance operations and coordinated emergency HVAC repairs." },
        { employer: "Cooler Heating & Air", jobTitle: "HVAC Technician", startDate: "January 2022", endDate: "March 2026", responsibilities: "Diagnosed and repaired air conditioners, furnaces, and heat pumps." },
      ],
      fieldValue: { certifications: [], licenses: "", tools: [], equipmentSystems: ["building systems"], technicalSkills: [], software: [], safety: [] },
      education: "",
      additionalDetails: "",
    },
    expected: { ready: false, issues: ["jobs"], warnings: [], sourceRoleSignals: 3, extractedRoles: 2 },
  },
  {
    name: "PASS: credentials embedded in prose are preserved",
    source: proseCredentialSource,
    structured: {
      roles: [{ employer: "Coastal Air", jobTitle: "HVAC Technician", startDate: "June 2021", endDate: "Present", responsibilities: "Diagnosed HVAC systems, completed preventive maintenance, and repaired electrical controls." }],
      fieldValue: { certifications: ["EPA 608 Universal", "OSHA 10"], licenses: "", tools: [], equipmentSystems: [], technicalSkills: ["HVAC systems"], software: [], safety: ["OSHA 10 safety training"] },
      education: "",
      additionalDetails: "",
    },
    expected: { ready: true, issues: [], warnings: [], sourceRoleSignals: 1, extractedRoles: 1 },
  },
  {
    name: "FAIL: credentials embedded in prose cannot be dropped completely",
    source: proseCredentialSource,
    structured: {
      roles: [{ employer: "Coastal Air", jobTitle: "HVAC Technician", startDate: "June 2021", endDate: "Present", responsibilities: "Diagnosed HVAC systems, completed preventive maintenance, and repaired electrical controls." }],
      fieldValue: { certifications: [], licenses: "", tools: [], equipmentSystems: [], technicalSkills: ["HVAC systems"], software: [], safety: ["OSHA 10 safety training"] },
      education: "",
      additionalDetails: "",
    },
    expected: { ready: false, issues: ["credentials"], warnings: [], sourceRoleSignals: 1, extractedRoles: 1 },
  },
];

for (const fixture of fixtures) {
  test(fixture.name, () => {
    const result = assessResumeExtractionCoverage(fixture.source, fixture.structured);
    assert.equal(result.ready, fixture.expected.ready);
    assert.deepEqual(codes(result.issues), fixture.expected.issues.slice().sort());
    assert.deepEqual(codes(result.warnings), fixture.expected.warnings.slice().sort());
    assert.equal(result.sourceRoleSignals, fixture.expected.sourceRoleSignals);
    assert.equal(result.extractedRoles, fixture.expected.extractedRoles);
  });
}

test("deterministic fallback restores an incomplete multi-job extraction", () => {
  const partial = {
    roles: [
      { employer: "North Plant", jobTitle: "Maintenance Technician", startDate: "January 2024", endDate: "Present", responsibilities: "Performed HVAC diagnostics and preventive maintenance." },
      { employer: "South Campus", jobTitle: "HVAC Technician", startDate: "May 2021", endDate: "December 2023", responsibilities: "Serviced split systems and completed corrective repairs." },
    ],
    fieldValue: { certifications: [], licenses: "", technicalSkills: ["HVAC diagnostics"] },
    education: "",
  };
  const repaired = repairResumeExtractionFromSource(multipleJobsSource, partial);
  const coverage = assessResumeExtractionCoverage(multipleJobsSource, repaired.structured);
  assert.equal(repaired.repaired, true);
  assert.equal(coverage.ready, true);
  assert.equal(coverage.extractedRoles, 3);
});

test("deterministic fallback prefers literal source-backed employer title and dates", () => {
  const structured = {
    roles: [{ employer: "Invented Employer", jobTitle: "Chief Engineer", startDate: "May 2022", endDate: "August 2024", responsibilities: "" }],
    fieldValue: { certifications: [], licenses: "" },
    education: "",
  };
  const repaired = repairResumeExtractionFromSource(noOptionalSectionsSource, structured).structured;
  const roles = repaired.roles as Array<Record<string, unknown>>;
  assert.equal(roles.length, 1);
  assert.equal(roles[0].employer, "North Plant");
  assert.equal(roles[0].jobTitle, "Maintenance Technician");
  assert.equal(roles[0].startDate, "January 2022");
  assert.equal(roles[0].endDate, "Present");
});

test("production-shaped empty extraction recovers four roles education and credentials", () => {
  const empty = { roles: [], fieldValue: { certifications: [], licenses: "" }, education: "" };
  const repaired = repairResumeExtractionFromSource(productionShapeSource, empty);
  const coverage = assessResumeExtractionCoverage(productionShapeSource, repaired.structured);
  const root = repaired.structured;
  const field = root.fieldValue as Record<string, unknown>;
  const certifications = field.certifications as string[];
  assert.equal(repaired.repaired, true);
  assert.equal(coverage.ready, true, JSON.stringify(coverage.issues));
  assert.equal(coverage.extractedRoles, 4);
  assert.match(String(root.education), /Mississippi Gulf Coast Community College/);
  assert.ok(certifications.some((item) => /EPA 608 Universal Certification/i.test(item)));
  assert.ok(certifications.some((item) => /OSHA 10/i.test(item)));
  assert.ok(certifications.some((item) => /HVAC Technical Certificate/i.test(item)));
});
