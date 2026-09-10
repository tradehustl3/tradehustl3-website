import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCanonicalSourceRecord,
  mergeCanonicalWithAiEnrichment,
  validateCanonicalImmutability,
} from "../worker/resume-source-canonical";
import { assessResumeExtractionCoverage } from "../worker/resume-extraction-coverage";

const source = `
JORDAN TECH
Atlanta, GA
jordan@example.com | (404) 555-0100
BUILDING EQUIPMENT MECHANIC / HVAC & FACILITIES MAINTENANCE

PROFESSIONAL SUMMARY
EPA 608 Universal-certified HVAC and facilities maintenance professional with 9+ years of experience performing preventive maintenance and repairs.

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

test("canonical parser establishes complete structure before AI", () => {
  const canonical = buildCanonicalSourceRecord(source);
  assert.equal(canonical.parserVersion, "source-first-v2");
  assert.equal(canonical.coverage.ready, true, JSON.stringify(canonical.coverage.issues));
  assert.equal(canonical.roles.length, 4);
  assert.equal(canonical.roles[0].employer.value, "American Campus Communities");
  assert.equal(canonical.roles[0].jobTitle.value, "Service Supervisor");
  assert.equal(canonical.roles[0].startDate.value, "April 2026");
  assert.equal(canonical.roles[0].endDate.value, "July 2026");
  assert.equal(canonical.roles[2].employer.value, "Cooler Heating & Air");
  assert.match(canonical.education.map((item) => item.value).join(" "), /Mississippi Gulf Coast Community College/);
  assert.deepEqual(
    canonical.credentials.map((item) => item.value),
    ["EPA 608 Universal Certification", "OSHA 10", "HVAC Technical Certificate"],
  );
  assert.equal(canonical.credentials.some((item) => /9\+ years/i.test(item.value)), false);
  assert.match(canonical.summaryFacts.map((item) => item.value).join(" "), /9\+ years/i);
});

test("AI cannot add delete rename reorder or redates canonical roles", () => {
  const canonical = buildCanonicalSourceRecord(source);
  const hostileAi = {
    trade: "HVAC & Refrigeration",
    experienceLevel: "6–10 years",
    contact: {
      email: "wrong@example.com",
      phone: "999-999-9999",
      cityState: "Miami, FL",
    },
    roles: [
      {
        employer: "Invented Employer",
        jobTitle: "Chief Engineer",
        location: "Miami, FL",
        startDate: "May 2022",
        endDate: "August 2024",
        current: true,
        responsibilities: "Invented duties.",
      },
    ],
    fieldValue: {
      certifications: ["Invented Master License"],
      tools: ["Invented Tool"],
    },
    education: "Invented University",
  };

  const merged = mergeCanonicalWithAiEnrichment(source, canonical, hostileAi);
  const roles = merged.roles as Array<Record<string, unknown>>;
  const contact = merged.contact as Record<string, unknown>;
  const field = merged.fieldValue as Record<string, unknown>;

  assert.equal(roles.length, 4);
  assert.equal(roles[0].employer, "American Campus Communities");
  assert.equal(roles[0].jobTitle, "Service Supervisor");
  assert.equal(roles[0].startDate, "April 2026");
  assert.equal(roles[0].endDate, "July 2026");
  assert.equal(roles[0].current, false);
  assert.equal(contact.email, "jordan@example.com");
  assert.equal(contact.phone, "(404) 555-0100");
  assert.equal(contact.cityState, "Atlanta, GA");
  assert.deepEqual(field.certifications, [
    "EPA 608 Universal Certification",
    "OSHA 10",
    "HVAC Technical Certificate",
  ]);
  assert.equal(merged.education, "Mississippi Gulf Coast Community College — Gulfport, MS\nHVAC Technical Certification");

  const immutable = validateCanonicalImmutability(canonical, merged);
  assert.equal(immutable.valid, true, JSON.stringify(immutable.issues));
  const coverage = assessResumeExtractionCoverage(source, merged);
  assert.equal(coverage.ready, true, JSON.stringify(coverage.issues));
});

test("AI enrichment keeps only source-backed descriptive values", () => {
  const canonical = buildCanonicalSourceRecord(source);
  const ai = {
    trade: "HVAC & Refrigeration",
    roles: canonical.roles.map((role) => ({
      employer: role.employer.value,
      jobTitle: role.jobTitle.value,
      startDate: role.startDate.value,
      endDate: role.endDate.value,
      equipment: role.id === "source-role-3" ? "heat pumps" : "Invented Chiller",
    })),
    fieldValue: {
      certifications: [],
      equipmentSystems: ["heat pumps", "Invented Chiller"],
      software: ["Salesforce"],
    },
  };

  const merged = mergeCanonicalWithAiEnrichment(source, canonical, ai);
  const roles = merged.roles as Array<Record<string, unknown>>;
  const field = merged.fieldValue as Record<string, unknown>;
  assert.equal(roles[2].equipment, "heat pumps");
  assert.equal(roles[0].equipment, "");
  assert.deepEqual(field.technicalSkills, ["Heat Pumps"]);
  assert.deepEqual(field.software, []);
});
