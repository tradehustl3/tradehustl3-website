import assert from "node:assert/strict";
import test from "node:test";
import { Document, Header, Packer, Paragraph } from "docx";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { buildCanonicalSourceRecord } from "../worker/resume-source-canonical";
import { credentialKey } from "../worker/resume-section-classifier";
import { handleResumeBuilderRoute, runResumeBuilderRetention } from "../worker/resume-builder";
import { handleResumeBuilderRoute as handleBaseResumeRoute } from "../worker/resume-builder-base";
import { serverUploadReview } from "../worker/resume-upload-requirements";
import {
  emptyWizardData,
  fromIntake,
  INTAKE_SCHEMA_VERSION,
  intakeSchemaVersion,
  toIntake,
  type WizardData,
} from "../app/resume-builder/intake/wizard-data";
import {
  mergeResumePrefill,
  recoverImportedResume,
  sourceFirstResumePrefill,
  uploadedResumeIssues,
  uploadTextOutcome,
} from "../app/resume-builder/intake/resume-upload";
import { docxResumeText, hasUsableResumeText, pdfPageText } from "../app/resume-builder/intake/resume-file-text";
import {
  FIXTURE_CERTIFICATIONS,
  FIXTURE_CITY_STATE,
  FIXTURE_EMAIL,
  FIXTURE_NAME,
  FIXTURE_PHONE,
  FIXTURE_ROLES,
  FIXTURE_SOURCE_TEXT,
  fixtureModelDraft,
} from "./helpers/production-resume-fixture";
import { seedSession, sqliteD1, TEST_SESSION } from "./helpers/sqlite-d1";

const TITLE_QUESTION = /What was your job title\?/;
const contactHeader = "Jordan Taylor\nDallas, TX | (214) 555-0100 | jordan@example.com\n\nWORK EXPERIENCE\n";
const duty = "- Moved materials, staged tools, and cleaned active job sites daily.";
const imported = (source: string) => mergeResumePrefill(emptyWizardData(), buildCanonicalSourceRecord(source).prefill, source);
const questions = (data: WizardData) => uploadedResumeIssues(data).map((issue) => issue.message);
const jobs = (data: WizardData) => data.roles.map(({ jobTitle, employer, startDate, endDate, current }) => ({ jobTitle, employer, startDate, endDate, current }));
const fixtureJobs = FIXTURE_ROLES.map(({ jobTitle, employer, startDate, endDate }) => ({
  jobTitle, employer, startDate, endDate: endDate === "Present" ? "Present" : endDate, current: endDate === "Present",
}));

/** Field-by-field diff of employers/titles/dates/certifications against the fixture. */
function fixtureDiff(data: WizardData) {
  const got = jobs(data);
  const roles = fixtureJobs.flatMap((expected, index) => (["employer", "jobTitle", "startDate", "endDate", "current"] as const)
    .filter((key) => got[index]?.[key] !== expected[key])
    .map((key) => ({ path: `roles.${index}.${key}`, expected: expected[key], got: got[index]?.[key] })));
  const certifications = FIXTURE_CERTIFICATIONS
    .filter((cert) => !data.fieldValue.certifications.includes(cert))
    .map((cert) => ({ expected: cert, got: data.fieldValue.certifications.find((item) => credentialKey(item) === credentialKey(cert)) ?? null }));
  return { roles, certifications };
}

// ------------------------------------------------ title above employer ---

test("title directly above employer: Laborer / ABC Construction", () => {
  const data = imported(`${contactHeader}Laborer\nABC Construction\nJan 2024 - Present\n${duty}`);
  assert.deepEqual(jobs(data), [{ jobTitle: "Laborer", employer: "ABC Construction", startDate: "Jan 2024", endDate: "Present", current: true }]);
  assert.deepEqual(questions(data), []);
});

test("title directly above employer: HVAC Apprentice / Cool Air Services", () => {
  const data = imported(`${contactHeader}HVAC Apprentice\nCool Air Services\nMar 2022 - Dec 2023\n${duty}`);
  assert.deepEqual(jobs(data), [{ jobTitle: "HVAC Apprentice", employer: "Cool Air Services", startDate: "Mar 2022", endDate: "Dec 2023", current: false }]);
  assert.deepEqual(questions(data), []);
});

test("existing professional title still works: Service Supervisor / American Campus Communities", () => {
  const data = imported(`${contactHeader}Service Supervisor\nAmerican Campus Communities\nApril 2026 - July 2026\n${duty}`);
  assert.deepEqual(jobs(data), [{ jobTitle: "Service Supervisor", employer: "American Campus Communities", startDate: "April 2026", endDate: "July 2026", current: false }]);
  assert.deepEqual(questions(data), []);
});

test("title directly above an 'Employer — City, ST' line with no title keyword", () => {
  const data = imported(`${contactHeader}Laborer\nBuildRight Homes — Plano, TX\n2019 - 2021\n${duty}`);
  assert.deepEqual(jobs(data), [{ jobTitle: "Laborer", employer: "BuildRight Homes", startDate: "2019", endDate: "2021", current: false }]);
  assert.equal(data.roles[0].location, "Plano, TX");
});

for (const [name, employerLine] of [["plain", "American Campus Communities"], ["with location", "American Campus Communities — Austin, TX"]] as const) {
  test(`section heading is never read as a job title (${name})`, () => {
    const data = imported(`${contactHeader}${employerLine}\nJan 2024 - Present\n${duty}`);
    assert.equal(data.roles.length, 1);
    assert.equal(data.roles[0].employer, "American Campus Communities");
    assert.notEqual(data.roles[0].jobTitle, "WORK EXPERIENCE");
    assert.equal(data.roles[0].jobTitle, "");
    // The title is genuinely absent, so this one question is necessary.
    assert.ok(questions(data).includes("Job 1: What was your job title?"));
  });
}

test("employer names are never read as job titles", () => {
  // Employer above a keyword-free title: the acronym marks the employer.
  assert.deepEqual(jobs(imported(`${contactHeader}ABC Construction\nLaborer\nJan 2024 - Present\n${duty}`)).map(({ jobTitle, employer }) => ({ jobTitle, employer })),
    [{ jobTitle: "Laborer", employer: "ABC Construction" }]);
  // A company-name line above an "Employer — City" line is not a stacked title.
  const division = imported(`${contactHeader}Acme Services\nResidential Division — Dallas, TX\n2020 - 2022\n${duty}`);
  assert.notEqual(division.roles[0].jobTitle, "Acme Services");
  // A previous job's employer never becomes the next job's title.
  const two = imported(`${contactHeader}Lead Technician\nABC Services — Dallas, TX\n2020 - Present\n${duty}\n\nForklift Operator\nXYZ Warehouse — Dallas, TX\n2018 - 2020\n${duty}`);
  assert.deepEqual(two.roles.map((role) => role.jobTitle), ["Lead Technician", "Forklift Operator"]);
  assert.ok(!two.roles.some((role) => /Services|Warehouse/.test(role.jobTitle)));
});

test("two separate roles at the same employer stay separate", () => {
  const repeated = imported(`${contactHeader}Service Supervisor\nAmerican Campus Communities\nApril 2026 - July 2026\n${duty}\n\nMaintenance Technician\nAmerican Campus Communities\nJan 2024 - March 2026\n${duty}`);
  assert.deepEqual(jobs(repeated), [
    { jobTitle: "Service Supervisor", employer: "American Campus Communities", startDate: "April 2026", endDate: "July 2026", current: false },
    { jobTitle: "Maintenance Technician", employer: "American Campus Communities", startDate: "Jan 2024", endDate: "March 2026", current: false },
  ]);
  assert.deepEqual(questions(repeated), []);

  // Grouped layout: one employer heading, then each position with its own title and dates.
  const grouped = imported(`${contactHeader}ABC Services — Dallas, TX\nLead Technician\n2020 - Present\n${duty}\nHVAC Technician\n2017 - 2020\n${duty}`);
  assert.deepEqual(jobs(grouped), [
    { jobTitle: "Lead Technician", employer: "ABC Services", startDate: "2020", endDate: "Present", current: true },
    { jobTitle: "HVAC Technician", employer: "ABC Services", startDate: "2017", endDate: "2020", current: false },
  ]);
  assert.deepEqual(questions(grouped), []);
});

test("grouped-employer carry-over never crosses a section or a title-first layout", () => {
  const acrossSection = imported(`${contactHeader}ABC Services — Dallas, TX\nLead Technician\n2020 - Present\n${duty}\nEDUCATION\nHVAC Technician\n2015 - 2016\n${duty}`);
  assert.ok(!acrossSection.roles.slice(1).some((role) => role.employer === "ABC Services"));
  // "Title / Dates / Employer": the next job must not inherit an employer it never had.
  const titleFirst = imported(`${contactHeader}HVAC Technician\n2020 - Present\nABC Services\n${duty}\nLead Technician\n2017 - 2020\nXYZ Mechanical\n${duty}`);
  assert.ok(!titleFirst.roles.some((role) => role.employer === "ABC Services" && role.jobTitle === "Lead Technician"));
});

test("maximum job count: at most 12 jobs are imported, in source order", () => {
  const names = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliet", "Kilo", "Lima", "Mike", "November"];
  const source = contactHeader + names.map((name, index) => `Laborer ${name}\n${name} Builders — Dallas, TX\n${2000 + index} - ${2001 + index}\n${duty}`).join("\n\n");
  const data = imported(source);
  assert.equal(data.roles.length, 12);
  assert.deepEqual(data.roles.map((role) => role.jobTitle), names.slice(0, 12).map((name) => `Laborer ${name}`));
  assert.ok(!data.roles.some((role) => !role.jobTitle || !role.employer));
});

// --------------------------------------------- section H fixtures (1-6) ---

test("H1: clean production resume — zero questions, facts match the fixture", (t) => {
  const prefill = sourceFirstResumePrefill(FIXTURE_SOURCE_TEXT);
  assert.ok(prefill, "the local parser covers the clean resume, so no AI import call is needed");
  const data = mergeResumePrefill(emptyWizardData(), prefill, FIXTURE_SOURCE_TEXT);
  const diff = fixtureDiff(data);
  t.diagnostic(JSON.stringify({ fixture: "H1 clean", questionsShown: questions(data), diff }));
  assert.deepEqual(questions(data), []);
  assert.deepEqual(diff.roles, []);
  assert.deepEqual(data.contact, { fullName: FIXTURE_NAME, email: FIXTURE_EMAIL, phone: FIXTURE_PHONE, cityState: FIXTURE_CITY_STATE });
  // Every certification is present; credential names are canonicalized by design.
  assert.ok(diff.certifications.every((item) => item.got));
});

test("H2: one missing job date — exactly one question", (t) => {
  const source = FIXTURE_SOURCE_TEXT.replace("Jun 2017 - Feb 2021", "");
  const data = imported(source);
  t.diagnostic(JSON.stringify({ fixture: "H2 missing date", questionsShown: questions(data) }));
  assert.deepEqual(questions(data), ["Job 2: What year did you start this job?"]);
  // The undated job is kept as its own entry, not folded into the job above it.
  assert.deepEqual(data.roles.map((role) => role.jobTitle), FIXTURE_ROLES.map((role) => role.jobTitle));
  assert.deepEqual(data.roles.map((role) => role.employer), FIXTURE_ROLES.map((role) => role.employer));
  assert.ok(!data.roles[0].responsibilities.includes("Cascade Mechanical Services"));
});

test("H3: DOCX with contact info only in the Word header, title above employer", async (t) => {
  const doc = new Document({ sections: [{
    headers: { default: new Header({ children: ["Jordan Taylor", "Dallas, TX", "(214) 555-0100", "jordan@example.com"].map((text) => new Paragraph(text)) }) },
    children: ["WORK EXPERIENCE", "Laborer", "ABC Construction", "Jan 2024 - Present", duty, "", "HVAC Apprentice", "Cool Air Services", "Mar 2022 - Dec 2023", duty]
      .map((text) => new Paragraph(text)),
  }] });
  const source = await docxResumeText(Uint8Array.from(await Packer.toBuffer(doc)).buffer);
  const data = imported(source);
  t.diagnostic(JSON.stringify({ fixture: "H3 docx header", questionsShown: questions(data), jobs: jobs(data) }));
  assert.deepEqual(data.contact, { fullName: "Jordan Taylor", email: "jordan@example.com", phone: "(214) 555-0100", cityState: "Dallas, TX" });
  assert.deepEqual(jobs(data).map(({ jobTitle, employer, startDate }) => ({ jobTitle, employer, startDate })), [
    { jobTitle: "Laborer", employer: "ABC Construction", startDate: "Jan 2024" },
    { jobTitle: "HVAC Apprentice", employer: "Cool Air Services", startDate: "Mar 2022" },
  ]);
  assert.deepEqual(questions(data), []);
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

test("H4: two-column PDF — employers/titles/dates in reading order", async (t) => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([720, 800]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const left = ["Jordan Taylor", "Dallas, TX", "jordan@example.com", "(214) 555-0100", "CERTIFICATIONS", "EPA 608 Universal Certification"];
  const right = ["WORK EXPERIENCE", "Service Supervisor", "American Campus Communities", "April 2026 - July 2026", "Scheduled make-ready crews and closed work orders.",
    "HVAC Apprentice", "Cool Air Services", "Mar 2022 - Dec 2023", "Assisted with rooftop unit repairs and tune-ups."];
  for (const [x, lines] of [[40, left], [370, right]] as const) lines.forEach((text, i) => page.drawText(text, { x, y: 750 - i * 22, size: 11, font }));
  const data = imported(await readPdf(await pdf.save()));
  t.diagnostic(JSON.stringify({ fixture: "H4 two-column pdf", questionsShown: questions(data), jobs: jobs(data) }));
  assert.deepEqual(jobs(data), [
    { jobTitle: "Service Supervisor", employer: "American Campus Communities", startDate: "April 2026", endDate: "July 2026", current: false },
    { jobTitle: "HVAC Apprentice", employer: "Cool Air Services", startDate: "Mar 2022", endDate: "Dec 2023", current: false },
  ]);
  assert.deepEqual(data.fieldValue.certifications, ["EPA 608 Universal Certification"]);
  assert.deepEqual(questions(data), []);
});

test("H5: year-only dates — no date questions", (t) => {
  const data = imported(`${contactHeader}Laborer\nABC Construction\n2019 - 2021\n${duty}\n\nHVAC Apprentice\nCool Air Services\n2021 - Present\n${duty}`);
  t.diagnostic(JSON.stringify({ fixture: "H5 year-only", questionsShown: questions(data) }));
  assert.deepEqual(questions(data), []);
  assert.deepEqual(jobs(data).map(({ startDate, endDate, current }) => ({ startDate, endDate, current })), [
    { startDate: "2019", endDate: "2021", current: false },
    { startDate: "2021", endDate: "Present", current: true },
  ]);
});

test("H6: scanned PDF — graceful route to the manual wizard, no crash", async (t) => {
  const pdf = await PDFDocument.create();
  const png = await pdf.embedPng(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64"));
  pdf.addPage().drawImage(png, { x: 10, y: 10, width: 400, height: 600 });
  const text = await readPdf(await pdf.save());
  t.diagnostic(JSON.stringify({ fixture: "H6 scanned pdf", outcome: uploadTextOutcome(text), questionsShown: [] }));
  assert.equal(hasUsableResumeText(text), false);
  assert.deepEqual(uploadTextOutcome(text), { route: "manual", message: "We couldn't read text from this file." });
});

// ---------------------------------------------- D1 round trip + checkout ---

const env = (DB: D1Database, extra: Record<string, unknown> = {}) => ({ DB, RESUME_AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "test-key", ...extra });
const call = (DB: D1Database, path: string, method: string, body?: unknown, dependencies = {}, extraEnv = {}) =>
  handleResumeBuilderRoute(new Request(`https://tradehustl3.com/api/resume-builder/${path}`, {
    method,
    headers: { Origin: "https://tradehustl3.com", Cookie: `tradehustl3_resume_session=${TEST_SESSION}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  }), env(DB, extraEnv), dependencies);
const draftBody = (data: WizardData, intake: unknown = toIntake(data, "account@example.com")) =>
  ({ trade: data.trade, title: data.targetJob.title, targetJobPosting: data.targetJob.posting, intake });

test("E2E: clean upload -> parse -> toIntake -> D1 -> refresh -> fromIntake keeps every title and asks nothing", async (t) => {
  const { DB, sqlite } = sqliteD1();
  seedSession(sqlite);
  const parsed = mergeResumePrefill(emptyWizardData(), sourceFirstResumePrefill(FIXTURE_SOURCE_TEXT), FIXTURE_SOURCE_TEXT);
  const created = await call(DB, "resumes", "POST", draftBody(parsed));
  assert.equal(created?.status, 201);
  const { resumeId } = await created!.json() as { resumeId: string };

  // What D1 holds.
  const row = sqlite.prepare("SELECT intake_json FROM resumes WHERE resume_id = ?").get(resumeId) as { intake_json: string };
  const stored = JSON.parse(row.intake_json) as { experience: Array<Record<string, unknown>>; meta: Record<string, unknown> };
  assert.deepEqual(stored.experience.map((job) => job.jobTitle), FIXTURE_ROLES.map((role) => role.jobTitle));
  assert.equal(stored.meta.schemaVersion, INTAKE_SCHEMA_VERSION);
  assert.equal(stored.meta.wizardVersion, 4);
  assert.equal(stored.experience[0].endDate, "Present");
  assert.equal(stored.meta.uploadFieldStatesSource, "server");
  const serverStates = stored.meta.uploadFieldStates as Record<string, { status: string }>;
  FIXTURE_ROLES.forEach((_, index) => assert.equal(serverStates[`roles.${index}.jobTitle`].status, "confirmed"));

  // Refresh: the wizard reloads from the API, exactly as wizard.tsx does.
  const loaded = await call(DB, `resumes/${resumeId}`, "GET");
  assert.equal(loaded?.status, 200);
  const resume = (await loaded!.json() as { resume: { intake: unknown; trade: string; title: string; targetJobPosting: string | null } }).resume;
  const refreshed = recoverImportedResume(fromIntake(resume.intake, { trade: resume.trade, title: resume.title, posting: resume.targetJobPosting ?? "", fullName: null }));
  const diff = fixtureDiff(refreshed);
  const review = serverUploadReview(resume.intake, { trade: resume.trade, title: resume.title });
  t.diagnostic(JSON.stringify({ fixture: "E2E refresh", questionsShown: questions(refreshed), serverIssues: review.issues.map((issue) => issue.message), diff }));
  assert.deepEqual(diff.roles, [], "employers, titles, dates, and current status survive the round trip");
  assert.ok(refreshed.roles.every((role) => role.jobTitle.trim()));
  assert.deepEqual(questions(refreshed), []);
  assert.ok(!review.issues.some((issue) => TITLE_QUESTION.test(issue.message)));
  assert.deepEqual(review.issues, []);
  assert.equal(refreshed.sourceResumeText, parsed.sourceResumeText);
  // Present/current round-trips: stored "Present", hydrated as current with no end date.
  assert.equal(refreshed.roles[0].current, true);
});

test("checkout redirect keeps resume_id on both Stripe return URLs", async () => {
  const { DB, sqlite } = sqliteD1();
  seedSession(sqlite);
  const intake = toIntake(mergeResumePrefill(emptyWizardData(), sourceFirstResumePrefill(FIXTURE_SOURCE_TEXT), FIXTURE_SOURCE_TEXT), "account@example.com");
  sqlite.prepare("INSERT INTO resumes (resume_id, user_id, trade, title, intake_json, generated_json, status) VALUES (?, 'user-1', ?, ?, ?, ?, 'ready')")
    .run("draft-123", "HVAC & Refrigeration", "Building Equipment Mechanic", JSON.stringify(intake), JSON.stringify(fixtureModelDraft()));
  const originalFetch = globalThis.fetch;
  const captured: { form?: URLSearchParams } = {};
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    captured.form = new URLSearchParams(String(init?.body));
    return new Response(JSON.stringify({ id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" }), { headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  try {
    // The base route builds the Stripe session; the package quality gate in front of it is covered elsewhere.
    const response = await handleBaseResumeRoute(new Request("https://tradehustl3.com/api/resume-builder/resumes/draft-123/checkout", {
      method: "POST",
      headers: { Origin: "https://tradehustl3.com", Cookie: `tradehustl3_resume_session=${TEST_SESSION}`, "Content-Type": "application/json" },
      body: "{}",
    }), env(DB, { STRIPE_SECRET_KEY: "sk_test", STRIPE_RESUME_PRICE_ID: "price_test" }));
    assert.equal(response?.status, 200);
  } finally {
    globalThis.fetch = originalFetch;
  }
  const form = captured.form;
  assert.ok(form);
  const success = new URL(form.get("success_url")!.replace("{CHECKOUT_SESSION_ID}", "cs_test_1"));
  const cancel = new URL(form.get("cancel_url")!);
  assert.equal(success.pathname, "/resume-builder/payment-confirmed");
  assert.equal(success.searchParams.get("resume_id"), "draft-123");
  assert.equal(cancel.pathname, "/resume-builder/review");
  assert.equal(cancel.searchParams.get("resume_id"), "draft-123");
  assert.equal(form.get("metadata[resume_id]"), "draft-123");
});

// ------------------------------------------------------- schemaVersion ---

test("schemaVersion: stamped in meta, unversioned intakes read as 0 and are upgraded, unknown versions refused", async () => {
  assert.equal(INTAKE_SCHEMA_VERSION, 1);
  assert.equal(intakeSchemaVersion(toIntake(emptyWizardData(), "a@example.com")), 1);
  assert.equal(intakeSchemaVersion({ meta: { wizardVersion: 4 } }), 0);
  assert.equal(intakeSchemaVersion(null), 0);

  const { DB, sqlite } = sqliteD1();
  seedSession(sqlite);
  const data = imported(`${contactHeader}Laborer\nABC Construction\nJan 2024 - Present\n${duty}`);
  const legacy = toIntake(data, "account@example.com") as { meta: Record<string, unknown> };
  delete legacy.meta.schemaVersion;
  const created = await call(DB, "resumes", "POST", draftBody(data, legacy));
  assert.equal(created?.status, 201);
  const stored = JSON.parse((sqlite.prepare("SELECT intake_json FROM resumes").get() as { intake_json: string }).intake_json);
  assert.equal(stored.meta.schemaVersion, INTAKE_SCHEMA_VERSION);
  assert.equal(stored.meta.wizardVersion, 4);
  // A legacy intake hydrates exactly like a versioned one.
  assert.deepEqual(fromIntake(legacy, { trade: "", title: "", posting: "", fullName: null }).roles, fromIntake(stored, { trade: "", title: "", posting: "", fullName: null }).roles);

  const future = await call(DB, "resumes", "POST", draftBody(data, { ...legacy, meta: { ...legacy.meta, schemaVersion: INTAKE_SCHEMA_VERSION + 1 } }));
  assert.equal(future?.status, 400);
});

// ------------------------------------------- import payload boundary ---

test("resume-import validates the extracted-text payload and ignores browser-supplied parse fields", async () => {
  const { DB, sqlite } = sqliteD1();
  seedSession(sqlite);
  let modelCalls = 0;
  const anthropicFetch = (async () => {
    modelCalls += 1;
    return new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify({
      contact: { fullName: "Jordan Taylor" },
      roles: [
        { employer: "ABC Construction", jobTitle: "Laborer", startDate: "Jan 2024", endDate: "Present" },
        { employer: "Invented Corp", jobTitle: "Invented Title", startDate: "2010", endDate: "2012" },
      ],
      fieldValue: { certifications: ["Invented Certification"] },
    }) }] }), { headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  const text = `${contactHeader}Laborer\nABC Construction\nJan 2024 - Present\n${duty}`;
  const post = (body: unknown) => call(DB, "resume-import", "POST", body, { anthropicFetch });

  for (const [label, body] of [
    ["unsupported type", { fileName: "resume.txt", fileType: "txt", text }],
    ["type not a string", { fileName: "resume.pdf", fileType: ["pdf"], text }],
    ["text not a string", { fileName: "resume.pdf", fileType: "pdf", text: { value: text } }],
    ["missing text", { fileName: "resume.pdf", fileType: "pdf" }],
    ["empty text", { fileName: "resume.pdf", fileType: "pdf", text: "   " }],
    ["too few words", { fileName: "resume.pdf", fileType: "pdf", text: "x".repeat(200) }],
    ["NUL bytes", { fileName: "resume.pdf", fileType: "pdf", text: `${text}\u0000` }],
    ["oversized text", { fileName: "resume.pdf", fileType: "pdf", text: `${text} ${"a".repeat(100_000)}` }],
    ["missing file name", { fileType: "pdf", text }],
  ] as const) {
    const response = await post(body);
    assert.equal(response?.status, 400, label);
  }
  assert.equal((await post("not json"))?.status, 400);
  assert.equal(modelCalls, 0, "malformed payloads never reach the model");
  // Malformed payloads still count toward the upload rate limit.
  assert.equal((await post({ fileName: "resume.pdf", fileType: "pdf", text }))?.status, 429);

  const fresh = sqliteD1();
  seedSession(fresh.sqlite);
  const response = await call(fresh.DB, "resume-import", "POST", {
    fileName: "resume.docx", fileType: "docx", text,
    // Browser-provided parse/status fields have no effect on grounding.
    prefill: { roles: [{ employer: "Invented Corp", jobTitle: "Invented Title" }] },
    fieldStates: { "roles.1.employer": { status: "confirmed", source: "user" } },
    groundingSource: "Invented Corp Invented Title Invented Certification",
  }, { anthropicFetch });
  assert.equal(response?.status, 200);
  const { prefill } = await response!.json() as { prefill: { roles: Array<{ employer: string; jobTitle: string }>; fieldValue: { certifications: string[] } } };
  assert.deepEqual(prefill.roles.map((role) => [role.jobTitle, role.employer]), [["Laborer", "ABC Construction"]]);
  assert.deepEqual(prefill.fieldValue.certifications, []);
});

test("resume-import rate limit still applies (10 per user per hour)", async () => {
  const { DB, sqlite } = sqliteD1();
  seedSession(sqlite);
  const anthropicFetch = (async () => new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify({ contact: {}, roles: [], fieldValue: {} }) }] }), { headers: { "Content-Type": "application/json" } })) as typeof fetch;
  const body = { fileName: "resume.pdf", fileType: "pdf", text: `${contactHeader}Laborer\nABC Construction\nJan 2024 - Present\n${duty}` };
  const statuses = [];
  for (let index = 0; index < 11; index += 1) statuses.push((await call(DB, "resume-import", "POST", body, { anthropicFetch }))?.status);
  assert.deepEqual(statuses.slice(0, 10), Array(10).fill(200));
  assert.equal(statuses[10], 429);
});

// ------------------------------------------------------------ retention ---

test("retention: paid resumes lose only sourceResumeText after 90 idle days; unpaid drafts keep the 37-day purge", async () => {
  const { DB, sqlite } = sqliteD1();
  const intake = JSON.stringify(toIntake(mergeResumePrefill(emptyWizardData(), sourceFirstResumePrefill(FIXTURE_SOURCE_TEXT), FIXTURE_SOURCE_TEXT), "a@example.com"));
  const generated = JSON.stringify(fixtureModelDraft());
  const insert = (id: string, daysIdle: number) => sqlite.prepare(
    `INSERT INTO resumes (resume_id, user_id, trade, title, intake_json, generated_json, status, generated_at, updated_at)
     VALUES (?, 'user-1', 'HVAC & Refrigeration', 'Mechanic', ?, ?, 'ready', datetime('now', ?), datetime('now', ?))`,
  ).run(id, intake, generated, `-${daysIdle} days`, `-${daysIdle} days`);
  const paid = (id: string) => sqlite.prepare(
    "INSERT INTO resume_orders (order_id, user_id, resume_id, email, plan, amount_total, status) VALUES (?, 'user-1', ?, 'a@example.com', 'resume_builder_mvp', 1900, 'paid')",
  ).run(`order-${id}`, id);
  insert("paid-stale", 91); paid("paid-stale");
  insert("paid-recent", 30); paid("paid-recent");
  insert("unpaid-stale", 38);
  insert("unpaid-recent", 10);
  const before = sqlite.prepare("SELECT resume_id, updated_at FROM resumes WHERE resume_id = 'paid-stale'").get() as { updated_at: string };

  await runResumeBuilderRetention({ DB });

  const rows = new Map((sqlite.prepare("SELECT resume_id, intake_json, generated_json, updated_at FROM resumes").all() as Array<{ resume_id: string; intake_json: string; generated_json: string; updated_at: string }>)
    .map((row) => [row.resume_id, row]));
  assert.deepEqual([...rows.keys()].sort(), ["paid-recent", "paid-stale", "unpaid-recent"]);

  const purged = rows.get("paid-stale")!;
  const purgedIntake = JSON.parse(purged.intake_json);
  assert.equal(purgedIntake.sourceResumeText, undefined);
  assert.equal(purgedIntake.meta.sourceResumePreserved, false);
  assert.ok(purgedIntake.meta.sourceResumeTextPurgedAt);
  assert.deepEqual(purgedIntake.experience, JSON.parse(intake).experience, "structured job history is kept");
  assert.deepEqual(purgedIntake.contact, JSON.parse(intake).contact);
  assert.deepEqual(purgedIntake.fieldValue, JSON.parse(intake).fieldValue);
  assert.equal(purged.generated_json, generated, "the purchased resume is kept");
  assert.equal(purged.updated_at, before.updated_at, "cleanup is not customer activity");
  // Hydration still works without the raw text and asks nothing new.
  const hydrated = recoverImportedResume(fromIntake(purgedIntake, { trade: "HVAC & Refrigeration", title: "Mechanic", posting: "", fullName: null }));
  assert.deepEqual(hydrated.roles.map((role) => role.jobTitle), FIXTURE_ROLES.map((role) => role.jobTitle));
  assert.deepEqual(questions(hydrated), []);

  assert.equal(JSON.parse(rows.get("paid-recent")!.intake_json).sourceResumeText, FIXTURE_SOURCE_TEXT.trim());

  // Idempotent: a second sweep changes nothing further.
  await runResumeBuilderRetention({ DB });
  assert.equal((sqlite.prepare("SELECT intake_json FROM resumes WHERE resume_id = 'paid-stale'").get() as { intake_json: string }).intake_json, purged.intake_json);
});
