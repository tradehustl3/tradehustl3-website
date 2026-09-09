import assert from "node:assert/strict";
import test from "node:test";
import { emptyWizardData, toIntake } from "../app/resume-builder/intake/wizard-data";
import { mergeResumePrefill } from "../app/resume-builder/intake/resume-upload";
import { canonicalSourceRecord, sourceFactCatalog } from "../worker/resume-quality";

const rawResume = `Kamyren Ellis
Maintenance Supervisor — RMB
Marietta, GA
Managed HVAC service, preventive maintenance, work orders, and vendor coordination.

HVAC Technician — Cooler Heating & Air
April 2017 – December 2019
Diagnosed compressors, motors, contactors, capacitors, transformers, and control boards.

EDUCATION
HVAC Technical Certificate — Atlanta Technical College

CERTIFICATIONS
EPA 608 Universal
OSHA 10`;

test("uploaded resume text is attached to the actual merged wizard state and persisted intake", () => {
  const merged = mergeResumePrefill(emptyWizardData(), {
    trade: "Facilities Maintenance",
    contact: { fullName: "Kamyren Ellis", cityState: "Marietta, GA" },
    roles: [{ employer: "RMB", jobTitle: "Maintenance Supervisor", responsibilities: "Managed HVAC service and work orders." }],
    fieldValue: { certifications: ["EPA 608 Universal"] },
  }, rawResume);

  assert.equal(merged.sourceResumeText, rawResume);
  const intake = toIntake(merged, "candidate@example.com") as Record<string, unknown>;
  assert.equal(intake.sourceResumeText, rawResume);
});

test("authoritative raw upload becomes part of canonical verification and grounding facts", () => {
  const source = canonicalSourceRecord({
    sourceResumeText: rawResume,
    meta: { source: "upload", importedResume: true },
    contact: { fullName: "Kamyren Ellis" },
    experience: [{ employer: "RMB", jobTitle: "Maintenance Supervisor", responsibilities: "Managed HVAC service and work orders." }],
    fieldValue: { certifications: ["EPA 608 Universal"] },
    education: "",
  }, "Maintenance Supervisor");

  assert.equal(source.sourceResumeText, rawResume);
  const facts = sourceFactCatalog(source);
  assert.ok(facts.some((fact) => fact.id.startsWith("upload.raw.") && fact.value.includes("HVAC Technical Certificate")));
  assert.ok(facts.some((fact) => fact.id.startsWith("upload.raw.") && fact.value.includes("Cooler Heating & Air")));
});

test("an absent raw upload cannot authorize unsupported facts", () => {
  const source = canonicalSourceRecord({
    meta: { source: "upload", importedResume: true },
    contact: { fullName: "Kamyren Ellis" },
    experience: [{ employer: "RMB", jobTitle: "Maintenance Supervisor", responsibilities: "Managed HVAC service and work orders." }],
    fieldValue: { certifications: ["EPA 608 Universal"], technicalSkills: ["HVAC diagnostics"] },
  }, "Maintenance Supervisor");

  assert.equal(source.sourceResumeText, "");
  assert.equal(sourceFactCatalog(source).some((fact) => fact.id.startsWith("upload.raw.")), false);
});
