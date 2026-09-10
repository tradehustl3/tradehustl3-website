import assert from "node:assert/strict";
import test from "node:test";
import type { GeneratedResume } from "../worker/resume-documents";
import {
  buildCanonicalSourceRecord,
  mergeCanonicalWithAiEnrichment,
  validateCanonicalImmutability,
} from "../worker/resume-source-canonical";
import {
  classifyResumeSections,
  dedupeSkillTerms,
} from "../worker/resume-section-classifier";
import {
  hardenResumeStructure,
  validatePostStructure,
} from "../worker/resume-quality-hard-gate";

// Sanitized fixture matching the text shape produced by the DOCX upload reader:
// section headings on their own lines, employer/title/location grouped above a
// date range, followed by narrative responsibility lines.
const docxExtractedText = `
JORDAN TECH
Atlanta, GA
jordan@example.com | (404) 555-0100
HVAC & FACILITIES MAINTENANCE

PROFESSIONAL SUMMARY
EPA 608 Universal-certified HVAC and facilities maintenance professional with 9+ years of hands-on experience performing preventive maintenance, diagnostics, and repairs.

CERTIFICATIONS
EPA 608 Universal Certification
HVAC Technical Certificate

TECHNICAL SKILLS & TOOLS
Preventive Maintenance • Preventative Maintenance • HVAC Diagnostics • HVAC Troubleshooting • Heat Pumps • Heat Pump Systems

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

EDUCATION & TRAINING
Mississippi Gulf Coast Community College — Gulfport, MS
HVAC Technical Certification

SAFETY TRAINING
OSHA 10
`;

// Same logical resume after a PDF text extractor wraps some role headers onto
// separate lines. This fixture contains no real customer PII.
const pdfExtractedText = `
JORDAN TECH
Atlanta, GA | jordan@example.com | (404) 555-0100

PROFESSIONAL SUMMARY
Facilities maintenance professional experienced in HVAC diagnostics, preventive maintenance, and building repairs.

CERTIFICATIONS & LICENSES
EPA 608 Universal Certification
HVAC Technical Certificate
OSHA 10

CORE SKILLS
Preventive Maintenance | Preventative Maintenance | HVAC Diagnostics | Heat Pumps | Heat Pump Systems

WORK EXPERIENCE
American Campus Communities
Service Supervisor
Marietta, GA
April 2026 - July 2026
Supervised technicians and coordinated HVAC, electrical, plumbing, appliance, and building repairs.
Managed work orders, parts, vendors, and emergency rooftop repairs.

TRC Staffing Services
Facility Maintenance Technician
Atlanta, GA
March 2026 - April 2026
Performed commercial preventive and corrective maintenance and HVAC inspections.
Completed filter changes, split-system repairs, and electrical and plumbing troubleshooting.

Cooler Heating & Air
Independent HVAC Technician
Marietta, GA
January 2022 - March 2026
Diagnosed and repaired air conditioners, furnaces, heat pumps, thermostats, controls, airflow, and refrigerant issues.
Performed preventive maintenance, installations, ductwork, and documented diagnoses and repairs.

Sunrise Senior Living
Maintenance Supervisor
Marietta, GA
April 2017 - December 2022
Led HVAC, electrical, plumbing, mechanical, resident-area, and common-area maintenance.
Managed preventive maintenance schedules, emergency repairs, vendors, and compliance records.

EDUCATION
Mississippi Gulf Coast Community College — Gulfport, MS
HVAC Technical Certification
`;

test("classification precedence keeps summary prose out of credentials", () => {
  const classified = classifyResumeSections(docxExtractedText);
  assert.deepEqual(classified.credentialEntities, [
    "EPA 608 Universal Certification",
    "HVAC Technical Certificate",
    "OSHA 10",
  ]);
  assert.equal(
    classified.credentialEntities.some((item) => /9\+ years/i.test(item)),
    false,
  );
  const summary = classified.sections.summary.map((item) => item.value).join(" ");
  assert.match(summary, /9\+ years/i);
});

test("skill registry collapses exact and near-equivalent aliases", () => {
  const classified = classifyResumeSections(docxExtractedText);
  assert.deepEqual(classified.skillEntities, [
    "Preventive Maintenance",
    "HVAC Diagnostics",
    "Heat Pumps",
  ]);
  assert.deepEqual(
    dedupeSkillTerms(["Preventive Maintenance", "Preventative Maintenance", "HVAC Diagnostics", "HVAC Troubleshooting"]),
    ["Preventive Maintenance", "HVAC Diagnostics"],
  );
});

test("DOCX-shaped extracted text produces a complete source-first v2 record", () => {
  const canonical = buildCanonicalSourceRecord(docxExtractedText);
  assert.equal(canonical.parserVersion, "source-first-v2");
  assert.equal(canonical.coverage.ready, true, JSON.stringify(canonical.coverage.issues));
  assert.equal(canonical.roles.length, 4);
  assert.deepEqual(canonical.credentials.map((item) => item.value), [
    "EPA 608 Universal Certification",
    "HVAC Technical Certificate",
    "OSHA 10",
  ]);
  assert.deepEqual(canonical.skills.map((item) => item.canonicalName), [
    "Preventive Maintenance",
    "HVAC Diagnostics",
    "Heat Pumps",
  ]);
  assert.equal(canonical.roles[0].responsibilities.some((item) => item.value === "Service Supervisor"), false);
});

test("PDF-shaped wrapped headers produce the same canonical role identity", () => {
  const canonical = buildCanonicalSourceRecord(pdfExtractedText);
  assert.equal(canonical.parserVersion, "source-first-v2");
  assert.equal(canonical.coverage.ready, true, JSON.stringify(canonical.coverage.issues));
  assert.equal(canonical.roles.length, 4);
  assert.equal(canonical.roles[0].employer.value, "American Campus Communities");
  assert.equal(canonical.roles[0].jobTitle.value, "Service Supervisor");
  assert.equal(canonical.roles[3].employer.value, "Sunrise Senior Living");
  assert.deepEqual(canonical.credentials.map((item) => item.value), [
    "EPA 608 Universal Certification",
    "HVAC Technical Certificate",
    "OSHA 10",
  ]);
});

test("Gemini may rewrite supported role language but cannot change identity or invent facts", () => {
  const canonical = buildCanonicalSourceRecord(docxExtractedText);
  const aiPrefill = {
    summaryNotes: "HVAC and facilities maintenance professional focused on preventive maintenance, diagnostics, and repairs.",
    contact: { fullName: "Wrong Name", email: "wrong@example.com" },
    roles: canonical.roles.map((role, index) => ({
      employer: index === 0 ? "Invented Employer" : role.employer.value,
      jobTitle: role.jobTitle.value,
      startDate: role.startDate.value,
      endDate: role.endDate.value,
      responsibilities: index === 0
        ? "Coordinated HVAC, electrical, plumbing, appliance, and building repairs.\nManaged work orders, vendors, parts, and emergency rooftop repairs.\nRepaired invented chillers."
        : role.responsibilities.map((item) => item.value).join("\n"),
    })),
    fieldValue: {
      certifications: ["Invented Master License"],
      technicalSkills: ["Preventive Maintenance", "Preventative Maintenance", "Invented Chiller Optimization"],
    },
    education: "Invented University",
  };

  const merged = mergeCanonicalWithAiEnrichment(docxExtractedText, canonical, aiPrefill);
  const roles = merged.roles as Array<Record<string, unknown>>;
  const fieldValue = merged.fieldValue as Record<string, unknown>;
  assert.equal(roles[0].employer, "American Campus Communities");
  assert.equal(roles[0].jobTitle, "Service Supervisor");
  assert.match(String(roles[0].responsibilities), /Coordinated HVAC/i);
  assert.doesNotMatch(String(roles[0].responsibilities), /invented chillers/i);
  assert.deepEqual(fieldValue.certifications, [
    "EPA 608 Universal Certification",
    "HVAC Technical Certificate",
    "OSHA 10",
  ]);
  assert.equal(JSON.stringify(fieldValue).includes("Invented Chiller Optimization"), false);
  assert.equal(validateCanonicalImmutability(canonical, merged).valid, true);
});

test("post-structure hardener moves credentials, removes role-header bullets, and deduplicates output", () => {
  const intake = {
    contact: { fullName: "Jordan Tech", email: "jordan@example.com", phone: "404-555-0100", cityState: "Atlanta, GA" },
    targetJob: { title: "Facilities Maintenance Technician" },
    fieldValue: {
      certifications: ["EPA 608 Universal Certification", "HVAC Technical Certificate", "OSHA 10"],
      technicalSkills: ["Preventive Maintenance", "HVAC Diagnostics", "Heat Pumps"],
    },
    experience: [{
      employer: "American Campus Communities",
      jobTitle: "Service Supervisor",
      location: "Marietta, GA",
      startDate: "April 2026",
      endDate: "July 2026",
      responsibilities: "Supervised technicians and coordinated HVAC repairs. Managed work orders and vendors.",
    }],
    education: "HVAC Technical Certificate — Mississippi Gulf Coast Community College",
  };

  const generated: GeneratedResume = {
    basics: { fullName: "Jordan Tech", targetTitle: "Facilities Maintenance Technician", location: "Atlanta, GA", email: "jordan@example.com", phone: "404-555-0100" },
    summary: "HVAC maintenance professional experienced in preventive maintenance. HVAC maintenance professional experienced in preventive maintenance.",
    skills: ["Preventive Maintenance", "Preventative Maintenance", "HVAC Diagnostics", "HVAC Diagnostics"],
    certifications: [
      { name: "EPA 608 Universal Certification" },
      { name: "EPA 608 Universal-certified HVAC professional with 9+ years of experience performing maintenance." },
      { name: "HVAC Technical Certificate" },
    ],
    experience: [{
      employer: "American Campus Communities",
      jobTitle: "Service Supervisor",
      location: "Marietta, GA",
      startDate: "April 2026",
      endDate: "July 2026",
      bullets: [
        "Service Supervisor",
        "Supervised technicians and coordinated HVAC repairs.",
        "Supervised technicians and coordinated HVAC repairs.",
        "Managed work orders and vendors.",
      ],
    }],
    education: [{ credential: "HVAC Technical Certificate", institution: "Mississippi Gulf Coast Community College" }],
    additionalInformation: ["OSHA 10"],
  };

  assert.ok(validatePostStructure(generated).length >= 4);
  const hardened = hardenResumeStructure(generated, intake, "Facilities Maintenance Technician");
  assert.deepEqual(validatePostStructure(hardened), []);
  assert.deepEqual(hardened.skills, ["Preventive Maintenance", "HVAC Diagnostics"]);
  assert.equal(hardened.additionalInformation.includes("OSHA 10"), false);
  assert.equal(hardened.certifications.some((item) => item.name === "OSHA 10"), true);
  assert.equal(hardened.certifications.some((item) => /9\+ years/i.test(item.name)), false);
  assert.equal(hardened.experience[0].bullets.includes("Service Supervisor"), false);
  assert.equal(hardened.experience[0].bullets.length, 2);
});
