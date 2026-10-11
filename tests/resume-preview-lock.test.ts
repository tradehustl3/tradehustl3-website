import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import JSZip from "jszip";
import { createResumeDocx, createResumePdf, type GeneratedResume } from "../worker/resume-documents";
import { createCoverLetterPdf, type GeneratedCoverLetter } from "../worker/cover-letter-documents";
import { lockedBulletCount, readableBulletKeys } from "../worker/resume-preview-lock";
import { defaultStyle, type TemplateKey } from "../worker/resume-templates";
import { handleResumeBuilderRoute } from "../worker/resume-builder";
import { sampleResume } from "../docs/pr186/sample-resume";
import { sqliteD1, seedSession, TEST_SESSION } from "./helpers/sqlite-d1";

const themes: TemplateKey[] = ["plain", "navy", "lead"];

// Distinctive words from sampleResume. Readable: the first two bullets of the
// first job. Locked: every later bullet.
const READABLE = ["rooftop units, split systems, and chillers", "preventive maintenance routes"];
const LOCKED = ["apprentices", "readings", "heat pumps, furnaces", "manufacturer specifications", "homeowners"];

async function pdfText(bytes: Uint8Array): Promise<{ text: string; pages: number }> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: Uint8Array.from(bytes), isEvalSupported: false });
  const pdf = await task.promise;
  try {
    let text = "";
    for (let n = 1; n <= pdf.numPages; n++) {
      text += " " + (await (await pdf.getPage(n)).getTextContent()).items.map((item) => ("str" in item ? item.str : "")).join(" ");
    }
    return { text: text.replace(/\s+/g, " "), pages: pdf.numPages };
  } finally {
    await task.destroy();
  }
}

/** True when every word of `phrase` appears in order in the extracted text. */
function contains(text: string, phrase: string): boolean {
  return text.replace(/\s+/g, "").includes(phrase.replace(/\s+/g, ""));
}

test("the readable budget never shows more than half of the bullets", () => {
  const jobs = (...counts: number[]) => counts.map((count) => ({ bullets: Array.from({ length: count }, (_, i) => `b${i}`) }));
  assert.deepEqual([...readableBulletKeys(jobs())], []);
  assert.deepEqual([...readableBulletKeys(jobs(1))], [], "a single bullet stays locked");
  assert.deepEqual([...readableBulletKeys(jobs(2))], ["0:0"]);
  assert.deepEqual([...readableBulletKeys(jobs(4, 3))], ["0:0", "0:1"]);
  assert.deepEqual([...readableBulletKeys(jobs(1, 3))], ["0:0", "1:0"], "budget continues into the next job in reading order");
  assert.deepEqual([...readableBulletKeys(jobs(0, 4))], ["1:0", "1:1"]);
  assert.equal(lockedBulletCount(jobs(4, 3)), 5);
  assert.equal(lockedBulletCount(jobs(1)), 1);
});

for (const version of [1, 2] as const) {
  for (const theme of themes) {
    test(`v${version} ${theme}: locked preview text never reaches the PDF, and layout matches the paid file`, async () => {
      const style = version === 2 ? defaultStyle(theme) : undefined;
      const resume: GeneratedResume = { ...sampleResume, additionalInformation: ["Bilingual English and Spanish"] };
      const [clean, preview] = await Promise.all([
        createResumePdf(resume, false, theme, theme, style),
        createResumePdf(resume, true, theme, theme, style),
      ]);
      const paid = await pdfText(clean);
      const locked = await pdfText(preview);

      for (const phrase of [...READABLE, ...LOCKED, "Bilingual"]) assert.ok(contains(paid.text, phrase), `paid file keeps "${phrase}"`);
      for (const phrase of READABLE) assert.ok(contains(locked.text, phrase), `preview shows "${phrase}"`);
      for (const word of LOCKED) assert.ok(!contains(locked.text, word), `preview must not contain locked "${word}"`);
      assert.ok(!contains(locked.text, "Bilingual"), "additional information is locked");

      // The header, summary, skills, credentials, and every job heading stay readable.
      for (const phrase of ["Ridgeway Mechanical", "Brightline Comfort Services", "HVAC Service Technician", "EPA 608 Universal", "Atlanta Technical College", "commercial and residential service experience"]) {
        assert.ok(contains(locked.text, phrase), `preview keeps "${phrase}"`);
      }
      assert.match(locked.text, /PREVIEW — PAY \$9\.99 TO REMOVE WATERMARK/);
      assert.equal(locked.pages, paid.pages, "locked bars use the same space as the paid lines");
    });
  }
}

const letter: GeneratedCoverLetter = {
  basics: { fullName: "Marcus Reed", location: "Atlanta, GA", phone: "(555) 010-0142", email: "marcus.reed@example.com" },
  date: "October 10, 2026",
  companyName: "Peachtree Facilities",
  targetJobTitle: "HVAC Lead Technician",
  salutation: "Dear Hiring Manager,",
  paragraphs: [
    "I am applying for the HVAC Lead Technician role with eight years of commercial service experience.",
    "At Ridgeway Mechanical I lead scheduled maintenance routes and train apprentices on brazing.",
    "I would welcome a conversation about supporting your facilities team.",
  ],
  closing: "Sincerely,",
};

for (const version of [1, 2] as const) {
  test(`v${version} cover-letter preview shows the opening paragraph only`, async () => {
    const style = version === 2 ? defaultStyle("navy") : undefined;
    const paid = await pdfText(await createCoverLetterPdf(letter, "navy", false, style));
    const preview = await pdfText(await createCoverLetterPdf(letter, "navy", true, style));
    assert.ok(contains(paid.text, "train apprentices on brazing"));
    assert.ok(contains(preview.text, "eight years of commercial service experience"));
    assert.ok(contains(preview.text, "Dear Hiring Manager"));
    assert.ok(contains(preview.text, "Sincerely"));
    assert.ok(!contains(preview.text, "apprentices"));
    assert.ok(!contains(preview.text, "welcome a conversation"));
    assert.equal(preview.pages, paid.pages);
  });
}

test("DOCX is never locked (it is only ever served to paid customers)", async () => {
  const zip = await JSZip.loadAsync(await createResumeDocx(sampleResume, "plain", "plain", defaultStyle("plain")));
  const xml = await zip.file("word/document.xml")!.async("string");
  for (const word of ["apprentices", "homeowners", "readings"]) assert.ok(xml.includes(word), `DOCX keeps ${word}`);
});

function setup(paid: boolean) {
  const { DB, sqlite } = sqliteD1();
  seedSession(sqlite);
  sqlite.prepare("INSERT INTO resumes (resume_id,user_id,trade,title,intake_json,generated_json,status,theme,generation_track) VALUES ('r','user-1','HVAC & Refrigeration','HVAC Lead Technician','{}',?,'ready','plain','plain')")
    .run(JSON.stringify(sampleResume));
  if (paid) sqlite.exec("INSERT INTO entitlements (entitlement_id,user_id,resume_id,credits_total,credits_used,status,kind,plan) VALUES ('e','user-1','r',4,1,'active','resume','one_time')");
  // A preview stored before the lock policy: full, unlocked text. It must never be served again.
  sqlite.exec("INSERT INTO resume_files (file_id,resume_id,user_id,format,object_key,byte_size,sha256) VALUES ('r:preview','r','user-1','preview','old/preview.pdf',1,'x')");
  const stale = new TextEncoder().encode("%PDF-1.7 stale unlocked preview apprentices homeowners");
  const BOOKS = { async get() { return { body: stale, arrayBuffer: async () => stale.buffer }; } } as unknown as R2Bucket;
  const get = (path: string) => handleResumeBuilderRoute(
    new Request(`https://tradehustl3.com/api/resume-builder/resumes/r${path}`, { headers: { Cookie: `tradehustl3_resume_session=${TEST_SESSION}` } }),
    { DB, BOOKS },
  );
  return { get };
}

test("the preview route renders the locked preview from saved content, never a stored unlocked file", async () => {
  const { get } = setup(false);
  const response = await get("/files/preview");
  assert.equal(response?.status, 200);
  assert.match(response?.headers.get("content-type") ?? "", /^application\/pdf/);
  assert.match(response?.headers.get("content-disposition") ?? "", /^inline/);
  assert.equal(response?.headers.get("cache-control"), "private, no-store");
  const bytes = new Uint8Array(await response!.arrayBuffer());
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
  const { text } = await pdfText(bytes);
  assert.ok(!text.includes("stale unlocked preview"));
  for (const word of LOCKED) assert.ok(!contains(text, word), `served preview leaks "${word}"`);
  for (const phrase of READABLE) assert.ok(contains(text, phrase));
  assert.equal((await get("/files/pdf"))?.status, 404, "unpaid customers still cannot reach the clean PDF");
  assert.equal((await get("/files/docx"))?.status, 404);
});

test("unpaid status payload withholds locked bullet wording; paid payload returns all of it", async () => {
  const unpaid = await (await setup(false).get(""))!.json() as { resume: { previewLockedBullets: number; bulletEditor: Array<{ bullets: Array<{ locked: boolean; suggestion: string; original: string }> }> } };
  const bullets = unpaid.resume.bulletEditor.flatMap((job) => job.bullets);
  assert.equal(bullets.length, 7);
  assert.equal(unpaid.resume.previewLockedBullets, 5);
  assert.deepEqual(bullets.map((bullet) => bullet.locked), [false, false, true, true, true, true, true]);
  for (const bullet of bullets.filter((item) => item.locked)) {
    assert.equal(bullet.suggestion, "");
    assert.equal(bullet.original, "", "no customer source bullet, so nothing is shown in place of the AI wording");
  }
  const serialized = JSON.stringify(unpaid);
  for (const word of LOCKED) assert.ok(!serialized.includes(word), `unpaid payload leaks "${word}"`);

  const paid = await (await setup(true).get(""))!.json() as typeof unpaid;
  const paidBullets = paid.resume.bulletEditor.flatMap((job) => job.bullets);
  assert.equal(paid.resume.previewLockedBullets, 0);
  assert.ok(paidBullets.every((bullet) => !bullet.locked && bullet.suggestion.length > 0));
  assert.ok(JSON.stringify(paid).includes("apprentices"));
});

test("review page explains locked lines and keeps checkout one tap away", () => {
  const review = readFileSync("app/resume-builder/review/resume-review.tsx", "utf8");
  const css = readFileSync("app/resume-builder/resume-builder.css", "utf8");
  assert.match(review, /className="rb-unlock-bar"[^>]*hidden=\{unpaidCardVisible \|\| working\}/);
  assert.match(review, /hasDraft && !resume\.paid \? \(\s*<div className="rb-unlock-bar"/);
  assert.equal(review.match(/onClick=\{\(\) => void startCheckout\(\)\}/g)?.length, 3, "card, lock note, fixed bar");
  assert.match(review, /new IntersectionObserver/);
  assert.match(review, /if \(bullet\.locked\)/);
  assert.match(review, /role="alert">\{checkoutError\}/);
  assert.match(css, /\.rb-unlock-bar\[hidden\] \{ display: none; \}/, "the hidden attribute must win over display:flex");
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.rb-lock-note \.rb-button \{[^}]*min-height: 44px/);
  assert.match(css, /@media print \{ \.rb-unlock-bar, \.rb-lock-note \{ display: none !important; \} \}/);
});
