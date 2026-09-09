import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { emptyWizardData, fromIntake, toIntake } from "../app/resume-builder/intake/wizard-data";
import { mergeResumePrefill } from "../app/resume-builder/intake/resume-upload";

const sourceText = `Kamyren Ellis\nMarietta, GA | 14705612963 | example@gmail.com\n\nMaintenance Supervisor — Campus Housing Company\nJune 2026 – July 2026\nSupervised technicians, coordinated HVAC vendors, and managed Salesforce work orders.\nEquipment: rooftop units, split systems, multimeter\n\nFacility Maintenance Technician — Industrial Warehouse\nJanuary 2023 – May 2026\nCompleted HVAC, electrical, plumbing, mechanical troubleshooting and preventive maintenance.\nSystems: Maximo CMMS\n\nHVAC Technician — Cooler Heating & Air\nApril 2017 – December 2019\nDiagnosed compressors, motors, contactors, capacitors, transformers, and control boards.\n\nEDUCATION\nHVAC Technical Certificate — Community College\n\nCERTIFICATIONS\nEPA 608 Universal\nOSHA 10\n\nSKILLS & TOOLS\nHVAC diagnostics, electrical troubleshooting, plumbing repair, manifold gauges, multimeter, Salesforce, Maximo`;

const importedPrefill = {
  trade: "Facilities Maintenance",
  experienceLevel: "6–10 years",
  targetJobTitle: "Maintenance Supervisor",
  contact: {
    fullName: "Kamyren Ellis",
    phone: "14705612963",
    cityState: "Marietta, GA",
  },
  summaryNotes: "Facilities maintenance professional with HVAC and building-systems experience.",
  roles: [
    {
      employer: "Campus Housing Company",
      jobTitle: "Maintenance Supervisor",
      location: "Marietta, GA",
      employmentType: "Full-time",
      startDate: "June 2026",
      endDate: "July 2026",
      current: false,
      responsibilities: "Supervised technicians and coordinated HVAC vendors.",
      equipment: "Rooftop units, split systems, multimeter",
      systems: "Salesforce",
      workPerformed: "HVAC diagnostics and preventive maintenance",
      leadership: "Supervised technicians and coordinated vendors",
      workOrders: "Managed Salesforce work orders",
      measurable: "",
    },
    {
      employer: "Industrial Warehouse",
      jobTitle: "Facility Maintenance Technician",
      location: "",
      employmentType: "Full-time",
      startDate: "January 2023",
      endDate: "May 2026",
      current: false,
      responsibilities: "Completed HVAC, electrical, plumbing, and mechanical troubleshooting.",
      equipment: "",
      systems: "Maximo CMMS",
      workPerformed: "Preventive maintenance and repairs",
      leadership: "",
      workOrders: "Maximo CMMS",
      measurable: "",
    },
    {
      employer: "Cooler Heating & Air",
      jobTitle: "HVAC Technician",
      location: "",
      employmentType: "Contract",
      startDate: "April 2017",
      endDate: "December 2019",
      current: false,
      responsibilities: "Diagnosed HVAC equipment and controls.",
      equipment: "Compressors, motors, contactors, capacitors, transformers, control boards",
      systems: "",
      workPerformed: "HVAC service and diagnostics",
      leadership: "",
      workOrders: "",
      measurable: "",
    },
  ],
  fieldValue: {
    certifications: ["EPA 608 Universal", "OSHA 10"],
    licenses: "",
    tools: ["Manifold gauges", "Multimeter"],
    equipmentSystems: ["Rooftop units", "Split systems"],
    technicalSkills: ["HVAC diagnostics", "Electrical troubleshooting", "Plumbing repair"],
    software: ["Salesforce", "Maximo"],
    safety: ["OSHA 10"],
  },
  education: "HVAC Technical Certificate — Community College",
  additionalDetails: "",
};

test("uploaded resume source text and full extracted facts survive the persisted intake round trip", () => {
  const current = emptyWizardData();
  const merged = mergeResumePrefill(current, importedPrefill, sourceText);
  const intake = toIntake(merged, "account@example.com") as Record<string, unknown>;

  assert.equal(merged.sourceProvenance, "upload");
  assert.equal(merged.sourceResumeText, sourceText);
  assert.equal(intake.sourceResumeText, sourceText);
  assert.equal((intake.meta as Record<string, unknown>).sourceResumePreserved, true);

  const experience = intake.experience as Array<Record<string, unknown>>;
  assert.equal(experience.length, 3);
  assert.deepEqual(experience.map((role) => role.employer), [
    "Campus Housing Company",
    "Industrial Warehouse",
    "Cooler Heating & Air",
  ]);
  assert.equal(experience[0].equipment, "Rooftop units, split systems, multimeter");
  assert.equal(experience[0].workOrders, "Managed Salesforce work orders");
  assert.equal(experience[1].systems, "Maximo CMMS");
  assert.equal(experience[2].workPerformed, "HVAC service and diagnostics");

  const fieldValue = intake.fieldValue as Record<string, unknown>;
  assert.deepEqual(fieldValue.certifications, ["EPA 608 Universal", "OSHA 10"]);
  assert.deepEqual(fieldValue.tools, ["Manifold gauges", "Multimeter"]);
  assert.deepEqual(fieldValue.technicalSkills, ["HVAC diagnostics", "Electrical troubleshooting", "Plumbing repair"]);
  assert.deepEqual(fieldValue.software, ["Salesforce", "Maximo"]);
  assert.equal(intake.education, "HVAC Technical Certificate — Community College");

  const hydrated = fromIntake(intake, {
    trade: "Facilities Maintenance",
    title: "Maintenance Supervisor",
    posting: "",
    fullName: null,
  });
  assert.equal(hydrated.sourceResumeText, sourceText);
  assert.equal(hydrated.roles.length, 3);
  assert.equal(hydrated.roles[0].leadership, "Supervised technicians and coordinated vendors");
  assert.equal(hydrated.education, "HVAC Technical Certificate — Community College");
});

test("Gemini import schema exposes every structured role field used by the wizard", async () => {
  const source = await readFile(new URL("../worker/resume-builder-base.ts", import.meta.url), "utf8");
  const schemaStart = source.indexOf("const GEMINI_IMPORT_RESPONSE_SCHEMA");
  const schemaEnd = source.indexOf("export class ResumeGenerationError", schemaStart);
  assert.ok(schemaStart >= 0 && schemaEnd > schemaStart, "import response schema should be present");
  const schema = source.slice(schemaStart, schemaEnd);

  for (const field of [
    "employer",
    "jobTitle",
    "location",
    "employmentType",
    "startDate",
    "endDate",
    "current",
    "responsibilities",
    "equipment",
    "systems",
    "workPerformed",
    "leadership",
    "workOrders",
    "measurable",
  ]) {
    assert.match(schema, new RegExp(`${field}:`), `Gemini import schema must include role field ${field}`);
  }

  assert.match(schema, /required:\s*\[\s*"employer",\s*"jobTitle",\s*"location",\s*"employmentType",\s*"startDate",\s*"endDate",\s*"current",\s*"responsibilities",\s*"equipment",\s*"systems",\s*"workPerformed",\s*"leadership",\s*"workOrders",\s*"measurable"\s*\]/s);
});
