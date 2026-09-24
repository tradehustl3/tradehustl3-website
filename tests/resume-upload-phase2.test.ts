import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { Document, Header, Footer, Paragraph, Table, TableRow, TableCell, Packer } from "docx";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { buildCanonicalSourceRecord, mergeCanonicalWithAiEnrichment } from "../worker/resume-source-canonical";
import { parseResumeDateRange, isCurrentDate } from "../worker/resume-dates";
import { assessResumeExtractionCoverage, repairResumeExtractionFromSource } from "../worker/resume-extraction-coverage";
import { emptyRole, emptyWizardData, fromIntake, toIntake, type WizardData } from "../app/resume-builder/intake/wizard-data";
import {
  LEGAL_CONSENT_ERROR,
  mergeResumePrefill,
  recoverImportedResume,
  RESUME_UPLOAD_MAX_BYTES,
  uploadContinueErrors,
  uploadedResumeIssues,
  uploadStepErrors,
  uploadTextOutcome,
} from "../app/resume-builder/intake/resume-upload";
import { fieldStates, recordUserCorrections } from "../app/resume-builder/intake/upload-field-state";
import { docxResumeText, pdfPageText, wordXmlText, hasUsableResumeText } from "../app/resume-builder/intake/resume-file-text";
import { createDraftSaver, UPLOAD_SAVE_DEBOUNCE_MS } from "../app/resume-builder/intake/draft-save";
import { extractContactLocation, locationInLine } from "../worker/resume-location";
import { groundResumePrefill } from "../worker/resume-extraction-grounding";
import { dedupeCredentials } from "../worker/resume-section-classifier";
import { handleResumeBuilderRoute, sanitizeImportStructure, validImportStructure } from "../worker/resume-builder";
import { PaymentErrorReturnLink } from "../app/resume-builder/payment-confirmed/payment-status";
import { generationFailureIntakeUrl, intakeReturnUrl } from "../app/resume-builder/return-urls";

const cookie = "tradehustl3_resume_session=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const resume = (dates: string) => `Jordan Taylor\nAtlanta GA\njordan@example.com\nPROFESSIONAL EXPERIENCE\nAcme Services | HVAC Technician\n${dates}\nMaintained heating and cooling equipment.\nCERTIFICATIONS\nEPA 608 Universal Certification`;
const imported = (source: string) => mergeResumePrefill(emptyWizardData(), buildCanonicalSourceRecord(source).prefill, source);
const questions = (data: WizardData) => uploadedResumeIssues(data).map((issue) => issue.message);
const report = (source: string, data = imported(source)) => ({
  contact: data.contact,
  questionsShown: questions(data),
  employers: data.roles.map((role) => role.employer),
  titles: data.roles.map((role) => role.jobTitle),
  dates: data.roles.map(({ startDate, endDate, current }) => ({ startDate, endDate, current })),
  certifications: data.fieldValue.certifications,
});

// ---------------------------------------------------------------- dates ---

for (const dates of ["2022 - 2024", "2022 – 2024", "2022 — 2024", "2022 - Present", "2022 – Present", "2022 — Present", "2022 - Current", "January 2022 - Current", "01/2022 - 03/2024"]) {
  test(`SCENARIO 5/6 date regression: ${dates}`, (t) => {
    const parsed = parseResumeDateRange(dates);
    assert.ok(parsed);
    const canonical = buildCanonicalSourceRecord(resume(dates));
    assert.equal(canonical.roles.length, 1);
    assert.equal(canonical.roles[0].employer.value, "Acme Services");
    assert.equal(canonical.roles[0].jobTitle.value, "HVAC Technician");
    assert.equal(canonical.roles[0].startDate.value, parsed.startDate);
    assert.equal(canonical.roles[0].endDate.value, parsed.endDate);
    assert.equal(canonical.roles[0].current, isCurrentDate(parsed.endDate));
    const result = report(resume(dates));
    assert.deepEqual(result.questionsShown, []);
    t.diagnostic(JSON.stringify({ fixture: `dates ${dates}`, questionsShown: result.questionsShown }));
  });
}

test("incomplete range never consumes an employer/title on the same line", () => {
  for (const line of ["Acme Services | HVAC Technician | 2019 -", "Acme Services | HVAC Technician | 2019 – unknown", "Acme Services | HVAC Technician | 2019 to ?"]) {
    const parsed = parseResumeDateRange(line);
    assert.ok(parsed, line);
    assert.equal(parsed.startDate, "2019");
    assert.equal(parsed.endDate, "");
    assert.doesNotMatch(parsed.match, /Acme|Technician/);
    const source = `Jordan Taylor\nAtlanta, GA\njordan@example.com\nWORK EXPERIENCE\n${line}\nMaintained rooftop units and split systems.`;
    const role = buildCanonicalSourceRecord(source).roles[0];
    assert.equal(role?.employer.value, "Acme Services", line);
    assert.equal(role?.jobTitle.value, "HVAC Technician", line);
    assert.equal(role?.startDate.value, "2019", line);
  }
  assert.equal(parseResumeDateRange("Acme Services 2019 Maintenance crew"), null);
});

// --------------------------------------------------------- work history ---

test("work-history evidence with zero jobs is never ready", () => {
  const result = buildCanonicalSourceRecord("Jordan Taylor\nWORK HISTORY\nEmployed by Acme as an HVAC technician; dates unavailable.");
  assert.equal(result.coverage.ready, false);
  const issue = result.coverage.issues.find((item) => item.code === "jobs");
  assert.ok(issue);
  assert.equal(issue.message, "The uploaded resume has a work-history section, but no jobs were extracted from it.");
});

test("the word 'experience' alone is not employment evidence", () => {
  for (const source of [
    "Jordan Taylor\nAtlanta, GA\njordan@example.com\nSUMMARY\nEager apprentice with hands-on experience from HVAC trade school labs.\nEDUCATION\nAtlanta Technical College — HVAC program",
    "Jordan Taylor\nAtlanta, GA\njordan@example.com\nEXPERIENCE\nNo experience yet\nEDUCATION\nAtlanta Technical College — HVAC program",
  ]) {
    const coverage = assessResumeExtractionCoverage(source, { roles: [], fieldValue: {}, education: "Atlanta Technical College — HVAC program" });
    assert.equal(coverage.issues.some((item) => item.code === "jobs"), false, source);
    assert.deepEqual(repairResumeExtractionFromSource(source, { roles: [] }).structured.roles, []);
    assert.ok(coverage.issues.every((item) => !/0 dated jobs, but only 0/.test(item.message)));
  }
});

// ------------------------------------------------------------- location ---

for (const location of ["Atlanta, GA", "Atlanta GA", "Atlanta, Georgia", "Marietta, GA", "Marietta Georgia"]) {
  test(`SCENARIO 8 source location ${location}`, (t) => {
    const source = resume("2022 - 2024").replace("Atlanta GA", location);
    assert.equal(imported(source).contact.cityState, location);
    const result = report(source);
    assert.deepEqual(result.questionsShown, []);
    assert.equal(extractContactLocation(`SKILLS\n${"Tools\n".repeat(15)}CONTACT\n${location}`), location);
    t.diagnostic(JSON.stringify({ fixture: `location ${location}`, questionsShown: result.questionsShown }));
  });
}

test("street address + city/state resolves to the city and state", () => {
  assert.equal(locationInLine("123 Main St, Atlanta, GA 30303"), "Atlanta, GA");
  assert.equal(locationInLine("Address: 55 Peachtree Rd NE, Atlanta, Georgia 30305"), "Atlanta, Georgia");
  assert.equal(extractContactLocation("Jordan Taylor\n123 Main St, Atlanta, GA 30303\n(404) 555-0100"), "Atlanta, GA");
});

test("ordinary lowercase words are never read as state codes", () => {
  for (const line of ["Available to work in", "Call or text me", "Fine by me", "Seven days, oh", "Weekends ok", "Heating and cooling or"]) {
    assert.equal(locationInLine(line), "", line);
  }
  assert.equal(extractContactLocation("Jordan Taylor\njordan@example.com\nAvailable to relocate or\nOpen to travel in"), "");
});

test("city/state is asked only when BOTH city and state are absent", () => {
  const base = imported(resume("2022 - 2024"));
  const cityOnly = { ...base, contact: { ...base.contact, cityState: "Atlanta" } };
  const stateOnly = { ...base, contact: { ...base.contact, cityState: "GA" } };
  const neither = { ...base, contact: { ...base.contact, cityState: "" } };
  assert.deepEqual(questions(cityOnly), []);
  assert.deepEqual(questions(stateOnly), []);
  assert.deepEqual(questions(neither), ["What city and state are you in?"]);
  // A resume that states only the state (or a labelled city) is not asked either.
  const stateOnlySource = resume("2022 - 2024").replace("Atlanta GA", "Georgia");
  assert.equal(imported(stateOnlySource).contact.cityState, "Georgia");
  assert.deepEqual(report(stateOnlySource).questionsShown, []);
  const cityLabelled = resume("2022 - 2024").replace("Atlanta GA", "Location: Atlanta");
  assert.equal(imported(cityLabelled).contact.cityState, "Atlanta");
  assert.deepEqual(report(cityLabelled).questionsShown, []);
});

// ----------------------------------------------------------- scenarios ---

test("SCENARIO 1: clean complete resume produces zero questions", (t) => {
  const result = report(resume("2022 - 2024"));
  assert.deepEqual(result.questionsShown, []);
  assert.deepEqual(result.employers, ["Acme Services"]);
  assert.deepEqual(result.titles, ["HVAC Technician"]);
  assert.deepEqual(result.certifications, ["EPA 608 Universal Certification"]);
  assert.deepEqual(result.dates, [{ startDate: "2022", endDate: "2024", current: false }]);
  t.diagnostic(JSON.stringify({ fixture: "1 clean", questionsShown: result.questionsShown }));
});

test("SCENARIO 2: exactly one missing start year produces exactly one question", (t) => {
  const data = imported(resume(""));
  const result = report(resume(""), data);
  assert.deepEqual(result.questionsShown, ["Job 1: What year did you start this job?"]);
  assert.deepEqual(result.employers, ["Acme Services"]);
  assert.equal(fieldStates(data)["roles.0.startDate"].status, "missing");
  assert.equal(fieldStates(data)["roles.0.startDate"].required, true);
  t.diagnostic(JSON.stringify({ fixture: "2 missing start", questionsShown: result.questionsShown }));
});

test("SCENARIO 3: real DOCX contact in Word header, body table, and footer", async (t) => {
  const doc = new Document({ sections: [{
    headers: { default: new Header({ children: ["Jordan Taylor", "Atlanta GA", "jordan@example.com"].map((text) => new Paragraph(text)) }) },
    footers: { default: new Footer({ children: [new Paragraph("Additional information"), new Paragraph("Available for local work")] }) },
    children: [new Paragraph("PROFESSIONAL EXPERIENCE"), new Table({ rows: [new TableRow({ children: [new TableCell({ children: [new Paragraph("Acme Services | HVAC Technician"), new Paragraph("2022 - Current"), new Paragraph("Maintained heating and cooling equipment.")] })] })] }),
      new Paragraph("CERTIFICATIONS"), new Paragraph("EPA 608 Universal Certification")],
  }] });
  const source = await docxResumeText(Uint8Array.from(await Packer.toBuffer(doc)).buffer);
  assert.match(source, /^Jordan Taylor/);
  assert.match(source, /Acme Services \| HVAC Technician/);
  assert.match(source, /Available for local work/);
  const result = report(source);
  assert.equal(result.contact.email, "jordan@example.com");
  assert.equal(result.contact.cityState, "Atlanta GA");
  assert.deepEqual(result.dates, [{ startDate: "2022", endDate: "Current", current: true }]);
  assert.deepEqual(result.questionsShown, []);
  t.diagnostic(JSON.stringify({ fixture: "3 docx header/table/footer", questionsShown: result.questionsShown }));
});

async function readPdf(bytes: Uint8Array): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await pdfjs.getDocument({ data: Uint8Array.from(bytes), useSystemFonts: true }).promise;
  try {
    const page = await document.getPage(1);
    const text = await page.getTextContent();
    return pdfPageText(text.items.flatMap((item) => "str" in item ? [item] : []));
  } finally { await document.destroy(); }
}

test("SCENARIO 4: real two-column PDF retains role associations", async (t) => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([720, 800]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const left = ["Jordan Taylor", "Atlanta GA", "jordan@example.com", "CERTIFICATIONS", "EPA 608 Universal Certification"];
  const right = ["PROFESSIONAL EXPERIENCE", "Acme Services | HVAC Technician", "2022 - Current", "Maintained heating and cooling equipment.", "Metro Services | Maintenance Technician", "2020 - 2021", "Repaired pumps and completed work orders."];
  for (const [x, lines] of [[40, left], [370, right]] as const) lines.forEach((text, i) => page.drawText(text, { x, y: 750 - i * 22, size: 11, font }));
  const result = report(await readPdf(await pdf.save()));
  assert.deepEqual(result.employers, ["Acme Services", "Metro Services"]);
  assert.deepEqual(result.titles, ["HVAC Technician", "Maintenance Technician"]);
  assert.deepEqual(result.dates.map((date) => date.startDate), ["2022", "2020"]);
  assert.deepEqual(result.questionsShown, []);
  t.diagnostic(JSON.stringify({ fixture: "4 two-column pdf", questionsShown: result.questionsShown }));
});

test("SCENARIO 7: image-only PDF routes to manual entry without OCR", async (t) => {
  const pdf = await PDFDocument.create();
  const png = await pdf.embedPng(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64"));
  pdf.addPage().drawImage(png, { x: 10, y: 10, width: 400, height: 600 });
  const text = await readPdf(await pdf.save());
  assert.equal(text, "");
  assert.equal(hasUsableResumeText(text), false);
  assert.deepEqual(uploadTextOutcome(text), { route: "manual", message: "We couldn't read text from this file." });
  // A handful of stray glyphs from a scan is still unusable.
  assert.equal(uploadTextOutcome("J T 404 GA").route, "manual");
  assert.equal(uploadTextOutcome(resume("2022 - 2024")).route, "extract");
  t.diagnostic(JSON.stringify({ fixture: "7 scanned pdf", outcome: "manual", questionsShown: [] }));
});

test("SCENARIO 9: grounded AI job the canonical parser missed is preserved (merge)", (t) => {
  const source = "Jordan Taylor\nAtlanta, GA\njordan@example.com\nWORK HISTORY\nAt Acme Services, HVAC Technician from 2022 until 2024. Maintained cooling equipment.";
  const canonical = buildCanonicalSourceRecord(source);
  assert.equal(canonical.roles.length, 0);
  const merged = mergeCanonicalWithAiEnrichment(source, canonical, { roles: [{ employer: "Acme Services", jobTitle: "HVAC Technician", startDate: "2022", endDate: "2024", responsibilities: "Maintained cooling equipment." }] });
  assert.equal((merged.roles as Array<{ employer: string }>)[0].employer, "Acme Services");
  // Browser merge of the server prefill keeps it too, and asks nothing.
  const data = mergeResumePrefill(emptyWizardData(), { ...merged, trade: "HVAC & Refrigeration" }, source);
  assert.deepEqual(data.roles.map((role) => role.employer), ["Acme Services"]);
  assert.deepEqual(questions(data), []);
  t.diagnostic(JSON.stringify({ fixture: "9 canonical miss / AI keep", questionsShown: questions(data) }));
});

test("SCENARIO 9: canonical finds more jobs, AI-only grounded job is still kept (browser merge)", () => {
  const source = `Jordan Taylor\nAtlanta, GA\njordan@example.com\nPROFESSIONAL EXPERIENCE\nAcme Services | HVAC Technician\n2022 - 2024\nMaintained heating and cooling equipment.\nMetro Services | Maintenance Technician\n2020 - 2021\nRepaired pumps.\nAlso worked at Peach Mechanical as Apprentice Installer in 2019, assisting installs.`;
  const aiPrefill = { roles: [{ ...emptyRole(), employer: "Peach Mechanical", jobTitle: "Apprentice Installer", startDate: "2019", responsibilities: "Assisted installs." }] };
  const data = mergeResumePrefill(emptyWizardData(), aiPrefill, source);
  assert.deepEqual(data.roles.map((role) => role.employer), ["Acme Services", "Metro Services", "Peach Mechanical"]);
});

test("SCENARIO 9: canonical-ready import appends a grounded AI job it missed (server route)", async () => {
  const source = `Jordan Taylor\nAtlanta, GA\njordan@example.com\nPROFESSIONAL EXPERIENCE\nAcme Services | HVAC Technician\n2022 - 2024\nMaintained heating and cooling equipment.\nAlso worked at Peach Mechanical as Apprentice Installer in 2019, assisting installs.`;
  assert.equal(buildCanonicalSourceRecord(source).coverage.ready, true);
  const response = await importThrough(source, {
    contact: { fullName: "Jordan Taylor" },
    roles: [
      { ...emptyRole(), employer: "Acme Services", jobTitle: "HVAC Technician", startDate: "2022", endDate: "2024", responsibilities: "Maintained heating and cooling equipment." },
      { ...emptyRole(), employer: "Peach Mechanical", jobTitle: "Apprentice Installer", startDate: "2019", responsibilities: "Assisted installs." },
      { ...emptyRole(), employer: "Invented Corp", jobTitle: "Invented Manager", startDate: "2015" },
    ],
    fieldValue: {},
  });
  const roles = response.prefill.roles.map((role) => role.employer);
  assert.deepEqual(roles, ["Acme Services", "Peach Mechanical"]);
});

test("SCENARIO 10: user corrections survive reparse, re-upload, and draft recovery", (t) => {
  const source = resume("2022 - 2024");
  const initial = imported(source);
  const corrected = recordUserCorrections(initial, { ...initial, contact: { ...initial.contact, fullName: "Jordan A. Taylor" }, roles: [{ ...initial.roles[0], employer: "Corrected Employer", jobTitle: "Corrected Title" }] });
  // Re-upload of the same file:
  const reuploaded = mergeResumePrefill(corrected, buildCanonicalSourceRecord(source).prefill, source);
  assert.equal(reuploaded.roles[0].employer, "Corrected Employer");
  assert.equal(reuploaded.roles[0].jobTitle, "Corrected Title");
  assert.equal(reuploaded.contact.fullName, "Jordan A. Taylor");
  assert.equal(reuploaded.roles.length, 1, "the corrected job is not duplicated");
  const states = fieldStates(reuploaded);
  assert.equal(states["roles.0.employer"].source, "user");
  assert.equal(states["roles.0.employer"].status, "confirmed");
  // Re-upload of a different file with a new extra job keeps the correction too.
  const newer = `${source.replace("Acme Services | HVAC Technician\n2022 - 2024", "Acme Services | HVAC Technician\n2022 - 2024\nMaintained units.\nMetro Services | Maintenance Technician\n2019 - 2021")}`;
  const second = mergeResumePrefill(reuploaded, buildCanonicalSourceRecord(newer).prefill, newer);
  assert.equal(second.roles.find((role) => role.jobTitle === "Corrected Title")?.employer, "Corrected Employer");
  // Reload + recovery (runs on every intake page load) never overwrites it.
  const hydrated = fromIntake(toIntake(second, "account@example.com"), { trade: "", title: "", posting: "", fullName: null });
  const recovered = recoverImportedResume(hydrated);
  assert.equal(recovered.roles.find((role) => role.jobTitle === "Corrected Title")?.employer, "Corrected Employer");
  assert.equal(recovered.contact.fullName, "Jordan A. Taylor");
  t.diagnostic(JSON.stringify({ fixture: "10 correction survives", questionsShown: questions(recovered) }));
});

// ------------------------------------------------ requirements / states ---

test("required fields: email substitutes for phone, target substitutes for trade, end date optional", () => {
  const data = imported(resume("2022 - 2024"));
  data.trade = "";
  data.roles[0].endDate = "";
  assert.ok(data.targetJob.title);
  assert.deepEqual(uploadedResumeIssues(data), []);
  assert.equal(fieldStates(data)["roles.0.endDate"].status, "missing");
  assert.equal(fieldStates(data)["roles.0.endDate"].required, false);
  data.roles[0].endDate = "unknown";
  assert.deepEqual(uploadedResumeIssues(data), []);
  assert.equal(fieldStates(data)["roles.0.endDate"].status, "conflicting");
  assert.deepEqual(report(resume("2022 - unknown")).questionsShown, []);
  data.targetJob.title = "";
  assert.deepEqual(questions(data), ["Choose your target trade or enter the job title you want."]);
});

test("field states distinguish confirmed, low-confidence, missing, and conflicting", () => {
  const data = imported(resume("2022 - 2024"));
  let states = fieldStates(data);
  assert.equal(states["roles.0.employer"].status, "confirmed");
  data.roles[0].employer = "Acme Svcs";
  states = fieldStates(data);
  assert.equal(states["roles.0.employer"].status, "low_confidence");
  assert.deepEqual(uploadedResumeIssues(data), [], "low confidence never blocks");
  data.roles[0].startDate = "sometime";
  const issues = uploadedResumeIssues(data);
  assert.deepEqual(issues.map((issue) => [issue.status, issue.message]), [["conflicting", "Job 1: Enter a valid start year or date."]]);
  data.contact.fullName = "";
  assert.equal(uploadedResumeIssues(data).find((issue) => issue.field === "fullName")?.status, "missing");
});

test("optional information never blocks generation", () => {
  const data = imported(resume("2022 - 2024"));
  Object.assign(data, { summaryNotes: "", education: "", additionalDetails: "", experienceLevel: "" });
  data.fieldValue = { certifications: [], licenses: "", tools: [], equipmentSystems: [], technicalSkills: [], software: [], safety: [] };
  data.roles[0] = { ...data.roles[0], endDate: "", location: "", responsibilities: "" };
  data.contact.phone = "";
  assert.deepEqual(uploadedResumeIssues(data), []);
  assert.deepEqual(uploadStepErrors(6, data, false, true), []);
});

// -------------------------------------------------------------- consent ---

test("upload path enforces 18+/policy consent", () => {
  const data = imported(resume("2022 - 2024"));
  for (const step of [0, 1, 2, 3, 4, 5]) assert.deepEqual(uploadStepErrors(step, data, false, false), []);
  assert.deepEqual(uploadStepErrors(6, data, false, false), [LEGAL_CONSENT_ERROR]);
  assert.deepEqual(uploadStepErrors(6, data, false, true), []);
  assert.deepEqual(uploadStepErrors(6, data, true, false), [], "a paid order already carries checkout consent");
  assert.deepEqual(uploadContinueErrors(data, false), { issues: [], consent: true });
  assert.deepEqual(uploadContinueErrors(data, true), { issues: [], consent: false });
  const missingName = { ...data, contact: { ...data.contact, fullName: "" } };
  assert.deepEqual(uploadStepErrors(6, missingName, false, false), ["We could not find your full name.", LEGAL_CONSENT_ERROR]);
});

// ------------------------------------------------------------ grounding ---

test("grounding discards unsupported identities, credentials, licenses, education", () => {
  const source = resume("2022 - 2024");
  const grounded = groundResumePrefill(source, { contact: {}, roles: [{ employer: "Imaginary Company", jobTitle: "Invented Manager", startDate: "1999", endDate: "2000" }], fieldValue: { certifications: ["Invented License"], licenses: "Master Plumber" }, education: "Imaginary University" });
  assert.deepEqual(grounded.roles, []);
  assert.deepEqual(grounded.fieldValue, { certifications: [], licenses: "" });
  assert.equal(grounded.education, "");
});

test("grounding keeps descriptive fields and accepts equivalent source dates", () => {
  const source = "Jordan Taylor\nWORK EXPERIENCE\nAcme Services | HVAC Technician\nJanuary 2022 - Present\nMaintained rooftop units.";
  const grounded = groundResumePrefill(source, { roles: [{
    employer: "Acme Services", jobTitle: "HVAC Technician", startDate: "Jan 2022", endDate: "Present", current: false,
    responsibilities: "Kept rooftop units running", workPerformed: "Preventive maintenance", leadership: "Trained a new hire", measurable: "Serviced 40 units",
  }] }) as { roles: Array<Record<string, unknown>> };
  const [role] = grounded.roles;
  assert.equal(role.startDate, "Jan 2022");
  assert.equal(role.endDate, "Present");
  assert.equal(role.current, true);
  assert.equal(role.responsibilities, "Kept rooftop units running");
  assert.equal(role.workPerformed, "Preventive maintenance");
  assert.equal(role.leadership, "Trained a new hire");
  assert.equal(role.measurable, "Serviced 40 units");
  const wrongMonth = groundResumePrefill(source, { roles: [{ employer: "Acme Services", jobTitle: "HVAC Technician", startDate: "Mar 2022" }] }) as { roles: Array<Record<string, unknown>> };
  assert.equal(wrongMonth.roles[0].startDate, "");
});

test("certification dedupe and no education leak", () => {
  assert.deepEqual(dedupeCredentials(["EPA 608 Universal", "EPA 608 Universal Certification", "EPA 608 universal certified", "OSHA 10", "OSHA-10 card"]), ["EPA 608 Universal Certification", "OSHA 10"]);
  const source = "Jordan Taylor\nAtlanta, GA\njordan@example.com\nPROFESSIONAL EXPERIENCE\nAcme Services | HVAC Technician\n2022 - 2024\nMaintained units.\nEDUCATION\nAtlanta Technical College — HVAC Technical Certificate\nCERTIFICATIONS\nEPA 608 Universal\nOSHA 10";
  const canonical = buildCanonicalSourceRecord(source);
  assert.deepEqual(canonical.credentials.map((item) => item.value), ["EPA 608 Universal Certification", "OSHA 10"]);
  const merged = mergeCanonicalWithAiEnrichment(source, canonical, { fieldValue: { certifications: ["EPA 608 Universal", "HVAC Technical Certificate", "OSHA 10"] }, education: "Atlanta Technical College — HVAC Technical Certificate" });
  assert.deepEqual((merged.fieldValue as { certifications: string[] }).certifications, ["EPA 608 Universal Certification", "OSHA 10"]);
  assert.match(String(merged.education), /HVAC Technical Certificate/);
  // An industry credential listed under Education is still a credential.
  const underEducation = buildCanonicalSourceRecord(source.replace("EDUCATION\n", "EDUCATION\nOSHA 30 Construction\n"));
  assert.ok(underEducation.credentials.some((item) => item.value === "OSHA 30"));
});

// ---------------------------------------------------- import contract ---

test("both providers use one explicit JSON contract; wrong types rejected, unknown keys dropped", () => {
  assert.equal(validImportStructure({ contact: {}, roles: [], fieldValue: {} }), true);
  assert.equal(validImportStructure({ basics: {}, experience: [] }), false);
  assert.equal(validImportStructure({ contact: { fullName: 23 }, roles: [], fieldValue: {} }), false);
  assert.equal(validImportStructure({ contact: {}, roles: [{ current: "false" }], fieldValue: {} }), false);
  assert.deepEqual(sanitizeImportStructure({ contact: { fullName: null, nickname: "JT" }, roles: [{ employer: "Acme", extra: 1 }], fieldValue: { certifications: null }, unknown: "value" }), {
    contact: { fullName: "" }, roles: [{ employer: "Acme" }], fieldValue: { certifications: [] },
  });
});

test("supported Word text boxes retain text and do not duplicate alternate fallbacks", () => {
  assert.equal(wordXmlText('<w:p><v:textbox><w:txbxContent><w:p><w:r><w:t>Jordan &amp; Taylor</w:t></w:r></w:p></w:txbxContent></v:textbox></w:p>'), "Jordan & Taylor");
  assert.equal(wordXmlText('<mc:AlternateContent><mc:Choice><w:p><w:r><w:t>Contact</w:t></w:r></w:p></mc:Choice><mc:Fallback><w:p><w:r><w:t>Contact</w:t></w:r></w:p></mc:Fallback></mc:AlternateContent>'), "Contact");
});

// --------------------------------------------------------------- server ---

type SessionDb = { DB: D1Database; rows: Map<string, Record<string, unknown>>; rateCount: () => number };
function sessionDb(): SessionDb {
  const rows = new Map<string, Record<string, unknown>>();
  let count = 0;
  const DB = { prepare(sql: string) { return { bind(...values: unknown[]) { return {
    async first() {
      if (/FROM sessions s/i.test(sql)) return { user_id: "user-1", email: "account@example.com", full_name: "Account Name" };
      if (/INSERT INTO rate_limits|RETURNING count/i.test(sql)) return { count: ++count };
      if (/SELECT intake_json FROM resumes/i.test(sql)) { const row = rows.get(String(values[0])); return row ? { intake_json: row.intake_json } : null; }
      if (/FROM resumes/i.test(sql)) return rows.get(String(values[0])) ?? null;
      return null;
    },
    async run() {
      if (/INSERT INTO resumes/i.test(sql)) rows.set(String(values[0]), { resume_id: values[0], user_id: values[1], trade: values[2], title: values[3], intake_json: values[4], target_job_posting: values[5], theme: values[6], status: "draft", generated_json: null });
      if (/UPDATE resumes SET trade/i.test(sql)) {
        const id = String(values[values.length - 2]);
        const row = rows.get(id) ?? [...rows.values()][0];
        rows.set(String(row.resume_id), { ...row, trade: values[0], title: values[1], intake_json: values[2], target_job_posting: values[3], theme: values[4] });
      }
      return { meta: { changes: 1 } };
    },
  }; } }; }, async batch() { return []; } } as unknown as D1Database;
  return { DB, rows, rateCount: () => count };
}

const api = (DB: D1Database, path: string, method: string, body?: string, dependencies = {}) => handleResumeBuilderRoute(new Request(`https://tradehustl3.com/api/resume-builder/${path}`, {
  method, headers: { Origin: "https://tradehustl3.com", Cookie: cookie, "Content-Type": "application/json" }, ...(body ? { body } : {}),
}), { DB, RESUME_AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "test-key" }, dependencies);

async function importThrough(source: string, aiPrefill: unknown) {
  const { DB } = sessionDb();
  const response = await api(DB, "resume-import", "POST", JSON.stringify({ fileName: "resume.pdf", fileType: "pdf", text: source }), {
    anthropicFetch: (async () => new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify(aiPrefill) }] }), { headers: { "Content-Type": "application/json" } })) as typeof fetch,
  });
  assert.equal(response?.status, 200);
  return await response!.json() as { prefill: { roles: Array<Record<string, unknown>> } };
}

for (const retry of [false, true]) {
  test(`authenticated import counts rate limit once ${retry ? "with" : "without"} reconciliation`, async () => {
    const { DB, rateCount } = sessionDb();
    let calls = 0;
    const source = "Jordan Taylor\nAtlanta GA\njordan@example.com\nWORK HISTORY\nAt Acme Services, HVAC Technician from 2022 until 2024. Maintained cooling equipment.";
    const result = await api(DB, "resume-import", "POST", JSON.stringify({ fileName: "resume.pdf", fileType: "pdf", text: source }), {
      anthropicFetch: (async (_url: string, init?: RequestInit) => {
        calls += 1;
        const body = JSON.parse(String(init?.body)) as { system: string };
        assert.match(body.system, /JSON CONTRACT/);
        assert.match(body.system, /cityState/);
        return new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify({
          contact: { fullName: "Jordan Taylor", email: "jordan@example.com", cityState: "Atlanta GA" },
          roles: retry && calls === 1 ? [] : [{ employer: "Acme Services", jobTitle: "HVAC Technician", startDate: "2022", endDate: "2024", responsibilities: "Maintained cooling equipment." }],
          fieldValue: {},
        }) }] }), { headers: { "Content-Type": "application/json" } });
      }) as typeof fetch,
    });
    assert.equal(result?.status, 200);
    const payload = await result!.json() as { prefill: { roles: Array<{ employer: string }> } };
    assert.equal(payload.prefill.roles[0].employer, "Acme Services");
    assert.equal(rateCount(), 1);
    assert.equal(calls, retry ? 2 : 1);
  });
}

const draftBody = (data: WizardData, intake = toIntake(data, "account@example.com")) => JSON.stringify({ trade: data.trade, title: data.targetJob.title, intake });

test("SCENARIO 11: import/save, correct/save, reload through the D1 API returns the latest values", async (t) => {
  const { DB } = sessionDb();
  const saver = createDraftSaver(async (body, id) => {
    const response = await api(DB, `resumes${id ? `/${id}` : ""}`, id ? "PUT" : "POST", body);
    assert.ok(response?.ok);
    return (await response.json() as { resumeId: string }).resumeId;
  });
  const initial = imported(resume("2022 - 2024"));
  initial.trade = ""; // A missing trade must not prevent immediate draft persistence.
  const id = await saver.save(draftBody(initial));
  const corrected = recordUserCorrections(initial, { ...initial, roles: [{ ...initial.roles[0], employer: "Customer Confirmed Employer" }] });
  await saver.save(draftBody(corrected));
  const response = await api(DB, `resumes/${id}`, "GET");
  assert.ok(response?.ok);
  const saved = (await response.json() as { resume: { intake: unknown } }).resume.intake;
  const hydrated = recoverImportedResume(fromIntake(saved, { trade: "", title: initial.targetJob.title, posting: "", fullName: null }));
  assert.equal(hydrated.roles[0].employer, "Customer Confirmed Employer");
  assert.equal(hydrated.sourceResumeText, initial.sourceResumeText);
  assert.equal(hydrated.confirmedFields?.["roles.0.employer"], "Customer Confirmed Employer");
  t.diagnostic(JSON.stringify({ fixture: "11 refresh", questionsShown: questions(hydrated) }));
});

test("server recomputes field states; browser-supplied states are never stored as truth", async () => {
  const { DB, rows } = sessionDb();
  const data = imported(resume(""));
  data.contact.fullName = "";
  const intake = toIntake(data, "account@example.com") as Record<string, unknown>;
  const forged = { ...intake, meta: { ...(intake.meta as object), uploadFieldStates: {
    "contact.fullName": { status: "confirmed", source: "user", required: true },
    "roles.0.startDate": { status: "confirmed", source: "user", required: true },
    "roles.0.bogus": { status: "confirmed", source: "user", required: false },
  } } };
  const created = await api(DB, "resumes", "POST", draftBody(data, forged));
  assert.equal(created?.status, 201);
  const row = [...rows.values()][0];
  const meta = (JSON.parse(String(row.intake_json)) as { meta: Record<string, unknown> }).meta;
  const states = meta.uploadFieldStates as Record<string, { status: string }>;
  assert.equal(meta.uploadFieldStatesSource, "server");
  assert.equal(states["contact.fullName"].status, "missing");
  assert.equal(states["roles.0.startDate"].status, "missing");
  assert.equal(states["roles.0.bogus"], undefined);
});

test("server blocks generation on missing required upload fields before any model call", async () => {
  const { DB, rows } = sessionDb();
  const data = imported(resume(""));
  data.contact.fullName = "";
  await api(DB, "resumes", "POST", draftBody(data));
  const id = String([...rows.values()][0].resume_id);
  let modelCalls = 0;
  const response = await api(DB, `resumes/${id}/generate`, "POST", "{}", { anthropicFetch: (async () => { modelCalls += 1; return new Response("{}"); }) as typeof fetch });
  assert.equal(response?.status, 422);
  const payload = await response!.json() as { action?: string; missing?: string[]; intakeUrl?: string; runConsumed?: boolean };
  assert.equal(payload.action, "review_exceptions");
  assert.equal(payload.runConsumed, false);
  assert.ok(payload.missing?.includes("We could not find your full name."));
  assert.ok(payload.missing?.includes("Job 1: What year did you start this job?"));
  assert.equal(payload.intakeUrl, `/resume-builder/intake?resume_id=${encodeURIComponent(id)}`);
  assert.equal(modelCalls, 0);
  // The review page routes review_exceptions back to the same draft.
  assert.equal(generationFailureIntakeUrl(payload, id), payload.intakeUrl);
});

test("save queue waits for the newest write and rejects failures even with an existing ID", async () => {
  const writes: string[] = [];
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  const saver = createDraftSaver(async (body, id) => {
    writes.push(body);
    if (body === "first") await pending;
    if (body === "failure") throw new Error("save failed");
    return id || "saved-id";
  });
  const first = saver.save("first");
  let completed = false;
  const second = saver.save("latest").then(() => { completed = true; });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(completed, false);
  release();
  await Promise.all([first, second]);
  assert.deepEqual(writes, ["first", "latest"]);
  await assert.rejects(saver.save("failure"), /save failed/);
  // An unchanged snapshot is not written twice.
  await saver.save("latest");
  assert.deepEqual(writes, ["first", "latest", "failure"]);
  assert.ok(UPLOAD_SAVE_DEBOUNCE_MS >= 300 && UPLOAD_SAVE_DEBOUNCE_MS <= 1500);
});

// -------------------------------------------------------------- returns ---

test("SCENARIO 12: payment error return and review exceptions preserve resume_id", (t) => {
  const html = renderToStaticMarkup(createElement(PaymentErrorReturnLink, { resumeId: "draft 123&x" }));
  assert.match(html, /href="\/resume-builder\/intake\?resume_id=draft%20123%26x"/);
  assert.equal(intakeReturnUrl("draft-123"), "/resume-builder/intake?resume_id=draft-123");
  assert.equal(generationFailureIntakeUrl({ action: "review_exceptions" }, "draft-123"), "/resume-builder/intake?resume_id=draft-123");
  assert.equal(generationFailureIntakeUrl({ action: "return_to_intake", intakeUrl: "https://evil.example/intake" }, "draft-123"), "/resume-builder/intake?resume_id=draft-123");
  assert.equal(generationFailureIntakeUrl({ action: "retry_generation" }, "draft-123"), null);
  assert.equal(RESUME_UPLOAD_MAX_BYTES, 5 * 1024 * 1024);
  t.diagnostic(JSON.stringify({ fixture: "12 payment error", questionsShown: [] }));
});
