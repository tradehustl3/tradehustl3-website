import assert from "node:assert/strict";
import test from "node:test";
import { buildCanonicalSourceRecord } from "../worker/resume-source-canonical";
import { classifyResumeSections } from "../worker/resume-section-classifier";
import { repairResumeExtractionFromSource } from "../worker/resume-extraction-coverage";

const inlineResumeText = `
JORDAN TECH
HVAC & Facilities Maintenance
Atlanta, GA | jordan@example.com | (404) 555-0100

PROFESSIONAL SUMMARY
EPA 608 Universal-certified HVAC and facilities maintenance professional with 9+ years of experience performing preventive and corrective maintenance.

TECHNICAL SKILLS
HVAC Diagnostics & Repair | Preventive Maintenance | Heat Pumps | Electrical Troubleshooting | Salesforce / CMMS

CERTIFICATIONS
EPA 608 Universal Certification | OSHA 10 | HVAC Technical Certificate

PROFESSIONAL EXPERIENCE
Service Supervisor | Campus Housing Partners Apr 2026 - Jul 2026
• Directed maintenance operations covering HVAC, electrical, plumbing, appliances, and building repairs.
• Coordinated technicians, vendors, work orders, parts, and emergency repairs.
Facility Maintenance Technician | Metro Staffing Services Mar 2026 - Apr 2026
• Performed preventive and corrective maintenance in commercial and warehouse facilities.
• Completed HVAC inspections, filter changes, minor repairs, and electrical troubleshooting.
Independent HVAC Technician | Regional Heating & Air Jan 2022 - Mar 2026
• Diagnosed and repaired air conditioners, furnaces, heat pumps, thermostats, controls, and refrigerant issues.
• Performed preventive maintenance, equipment installation, ductwork, and service documentation.
Maintenance Supervisor | Senior Living Group Apr 2017 - Dec 2022
• Led preventive and corrective maintenance covering HVAC, electrical, plumbing, mechanical systems, and common areas.
• Planned PM schedules, maintained service records, and coordinated emergency repairs.

EDUCATION
Metro Technical College, Atlanta, GA | HVAC Technical Certification
`;

test("combined credential line is split into separate canonical credentials", () => {
  const classified = classifyResumeSections(inlineResumeText);
  assert.deepEqual(classified.credentialEntities, [
    "EPA 608 Universal Certification",
    "OSHA 10",
    "HVAC Technical Certificate",
  ]);
  assert.equal(classified.credentialEntities.some((value) => /9\+ years/i.test(value)), false);
});

test("inline TITLE | EMPLOYER + DATE headers preserve distinct role identity", () => {
  const repaired = repairResumeExtractionFromSource(inlineResumeText, { roles: [] }).structured;
  const roles = repaired.roles as Array<Record<string, unknown>>;

  assert.equal(roles.length, 4);
  assert.equal(roles[0].jobTitle, "Service Supervisor");
  assert.equal(roles[0].employer, "Campus Housing Partners");
  assert.notEqual(roles[0].jobTitle, roles[0].employer);
  assert.equal(roles[1].jobTitle, "Facility Maintenance Technician");
  assert.equal(roles[1].employer, "Metro Staffing Services");
  assert.notEqual(roles[1].jobTitle, roles[1].employer);
});

test("real-world inline layout produces a complete source-first v2 canonical record", () => {
  const canonical = buildCanonicalSourceRecord(inlineResumeText);

  assert.equal(canonical.parserVersion, "source-first-v2");
  assert.equal(canonical.coverage.ready, true, JSON.stringify(canonical.coverage.issues));
  assert.equal(canonical.roles.length, 4);
  assert.deepEqual(canonical.credentials.map((item) => item.value), [
    "EPA 608 Universal Certification",
    "OSHA 10",
    "HVAC Technical Certificate",
  ]);
  assert.equal(canonical.roles[0].employer.value, "Campus Housing Partners");
  assert.equal(canonical.roles[0].jobTitle.value, "Service Supervisor");
  assert.equal(canonical.roles[0].responsibilities.some((item) => item.value === "Service Supervisor"), false);
});
