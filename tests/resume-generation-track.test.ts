import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createResumeDocx, createResumePdf } from "../worker/resume-documents";
import { handleResumeBuilderRoute } from "../worker/resume-builder";
import { hardenGeneratedResumePackage } from "../worker/resume-package-hardener";
import { fixtureUploadedIntake, fixtureModelDraft, FIXTURE_TRADE, FIXTURE_TARGET_TITLE } from "./helpers/production-resume-fixture";
import { sqliteD1, seedSession, TEST_SESSION } from "./helpers/sqlite-d1";
import { modelReturns } from "./helpers/resume-generation-harness";

const draft = fixtureModelDraft();
const coverDraft = { paragraphs: ["I am interested in the building equipment mechanic role.", "My experience includes HVAC equipment maintenance and repair.", "I welcome the opportunity to discuss the position."] } as unknown as typeof draft;

type SetupOptions = {
  /** Every resume model call fails (the resume rewrite step). */
  failResume?: boolean;
  /** Cover-letter calls that rewrite an existing letter fail; the first build succeeds. */
  failCoverRewrite?: boolean;
  /** Use the real PDF/DOCX renderers instead of byte stubs. */
  realRender?: boolean;
  theme?: "plain" | "navy" | "lead";
  generationTrack?: "plain" | "navy" | "lead" | null;
  generated?: typeof draft;
};

function setup(options: SetupOptions = {}) {
  const { DB, sqlite } = sqliteD1();
  seedSession(sqlite);
  sqlite.prepare("INSERT INTO resumes (resume_id,user_id,trade,title,intake_json,generated_json,status,theme,generation_track) VALUES ('r','user-1',?,?,?,?, 'ready',?,?)")
    .run(FIXTURE_TRADE, FIXTURE_TARGET_TITLE, JSON.stringify(fixtureUploadedIntake()), JSON.stringify(options.generated ?? draft), options.theme ?? "plain", options.generationTrack === undefined ? "plain" : options.generationTrack);
  sqlite.exec("INSERT INTO entitlements (entitlement_id,user_id,resume_id,credits_total,credits_used,status,kind,plan) VALUES ('e','user-1','r',4,1,'active','resume','one_time')");
  const objects = new Map<string, Uint8Array>();
  const BOOKS = { async put(key: string, bytes: Uint8Array) { objects.set(key, bytes); }, async get(key: string) { return objects.has(key) ? { body: objects.get(key), arrayBuffer: async () => objects.get(key), text: async () => new TextDecoder().decode(objects.get(key)) } : null; }, async delete(key: string) { objects.delete(key); } } as unknown as R2Bucket;
  const env = { DB, BOOKS, RESUME_AI_PROVIDER: "gemini", RESUME_AI_BRIDGE_URL: "https://bridge.example.run.app", RESUME_AI_BRIDGE_SECRET: "test" };
  const prompts: string[] = [];
  const dependencies = {
    geminiFetch: (async (url: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const prompt = String(init?.body);
      prompts.push(prompt);
      const isCover = prompt.includes("VERIFIED_RESUME");
      if (isCover && options.failCoverRewrite && prompt.includes("EXISTING_COVER_LETTER")) throw new Error("test cover failure");
      if (!isCover && options.failResume) throw new Error("test model failure");
      return modelReturns(isCover ? coverDraft : draft)(url, init);
    }) as typeof fetch,
    ...(options.realRender ? {} : { createDocx: async () => new Uint8Array([1]), createPdf: async () => new Uint8Array([2]) }),
  };
  const call = (method: string, body: object, suffix = "") => handleResumeBuilderRoute(new Request(`https://tradehustl3.com/api/resume-builder/resumes/r${suffix}`, { method, headers: { Cookie: `tradehustl3_resume_session=${TEST_SESSION}`, Origin: "https://tradehustl3.com", "Content-Type": "application/json" }, body: JSON.stringify(body) }), env, dependencies);
  const creditsUsed = () => Number(sqlite.prepare("SELECT credits_used FROM entitlements").get()!.credits_used);
  const resumeTrack = () => sqlite.prepare("SELECT generation_track FROM resumes").get()!.generation_track;
  const generatedJson = () => String(sqlite.prepare("SELECT generated_json FROM resumes").get()!.generated_json);
  const storedFile = (format: string) => {
    const row = sqlite.prepare("SELECT object_key FROM resume_files WHERE resume_id = 'r' AND format = ? ORDER BY created_at DESC LIMIT 1").get(format) as { object_key: string } | undefined;
    return row ? objects.get(row.object_key) ?? null : null;
  };
  const coverTrack = () => {
    const bytes = storedFile("cover_json");
    return bytes ? (JSON.parse(new TextDecoder().decode(bytes)) as { generationTrack?: string }).generationTrack : undefined;
  };
  const lastCoverPrompt = () => [...prompts].reverse().find((prompt) => prompt.includes("VERIFIED_RESUME")) ?? "";
  return { sqlite, env, dependencies, call, prompts, creditsUsed, resumeTrack, generatedJson, storedFile, coverTrack, lastCoverPrompt };
}

async function docxText(bytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  return zip.file("word/document.xml")!.async("string");
}

async function pdfText(bytes: Uint8Array): Promise<string> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await getDocument({ data: Uint8Array.from(bytes), useSystemFonts: true }).promise;
  let text = "";
  for (let n = 1; n <= pdf.numPages; n++) text += (await (await pdf.getPage(n)).getTextContent()).items.map((item) => "str" in item ? item.str : "").join(" ");
  return text;
}

test("Field Pro headings survive a lead appearance in DOCX and PDF", async () => {
  const xml = await docxText(await createResumeDocx(draft, "lead", "plain"));
  assert.match(xml, /PROFESSIONAL SUMMARY/); assert.match(xml, /CORE SKILLS/); assert.doesNotMatch(xml, /LEADERSHIP PROFILE|LEADERSHIP &amp; OPERATIONS/);
  const text = await pdfText(await createResumePdf(draft, false, "lead", "plain"));
  assert.match(text, /PROFESSIONAL SUMMARY/); assert.doesNotMatch(text, /LEADERSHIP PROFILE/);
});

test("appearance changes are free and retain generation track", async () => {
  const { call, creditsUsed, resumeTrack } = setup();
  const response = await call("PATCH", { theme: "lead" });
  assert.equal(response?.status, 200, await response?.clone().text());
  assert.equal(creditsUsed(), 1);
  assert.equal(resumeTrack(), "plain");
});

test("resume-only track rewrite (no cover letter) consumes exactly one correction and is blocked after three", async () => {
  const { sqlite, call, prompts, creditsUsed, resumeTrack } = setup();
  const response = await call("POST", { generationTrack: "lead" }, "/generate");
  assert.equal(response?.status, 200, await response?.clone().text());
  assert.match(prompts[prompts.length - 1] ?? "", /LEAD \/ SUPERVISOR/);
  assert.equal(creditsUsed(), 2);
  assert.equal(resumeTrack(), "lead");
  sqlite.exec("UPDATE entitlements SET credits_used=4");
  const blocked = await call("POST", { generationTrack: "navy" }, "/generate");
  assert.equal(blocked?.status, 409); assert.equal(creditsUsed(), 4);
  assert.equal(resumeTrack(), "lead");
});

test("migration backfills every existing theme and rollback preserves theme", async () => {
  const db = new DatabaseSync(":memory:"); db.exec("CREATE TABLE resumes (theme TEXT); INSERT INTO resumes VALUES ('plain'),('navy'),('lead')");
  db.exec(readFileSync(new URL("../drizzle/0008_resume_generation_track.sql", import.meta.url), "utf8"));
  for (const row of db.prepare("SELECT * FROM resumes").all()) assert.equal(row.theme, row.generation_track);
  db.exec(readFileSync(new URL("../drizzle/0008_resume_generation_track_down.sql", import.meta.url), "utf8"));
  assert.deepEqual(db.prepare("SELECT theme FROM resumes").all().map((row) => row.theme), ["plain", "navy", "lead"]);
});

test("backfilled headings match the previous rendering defaults for all tracks", async () => {
  for (const track of ["plain", "navy", "lead"] as const) {
    const before = await docxText(await createResumeDocx(draft, track));
    const after = await docxText(await createResumeDocx(draft, track, track));
    assert.equal(before, after);
  }
});

test("failed track rewrites restore the correction and preserve the old track", async () => {
  const { call, creditsUsed, resumeTrack } = setup({ failResume: true });
  const response = await call("POST", { generationTrack: "lead" }, "/generate");
  assert.equal(response?.status, 502);
  assert.equal(creditsUsed(), 1);
  assert.equal(resumeTrack(), "plain");
});

test("hardener keeps writing-track headings when it changes content under a different appearance", async () => {
  const placeholder = { ...draft, basics: { ...draft.basics, fullName: "Placeholder Person" } };
  const { env, generatedJson, storedFile } = setup({ realRender: true, theme: "lead", generationTrack: "plain", generated: placeholder });
  const result = await hardenGeneratedResumePackage(env as never, {}, "r");
  assert.equal(result.changed, true, "fixture must force the hardener to change and redraw the package");
  assert.doesNotMatch(generatedJson(), /Placeholder Person/);
  const xml = await docxText(storedFile("docx")!);
  // Field Pro labels experience "WORK EXPERIENCE"; Lead / Supervisor labels it "PROFESSIONAL EXPERIENCE".
  assert.match(xml, /PROFESSIONAL SUMMARY/); assert.match(xml, /WORK EXPERIENCE/);
  assert.doesNotMatch(xml, /LEADERSHIP PROFILE|LEADERSHIP &amp; OPERATIONS|PROFESSIONAL EXPERIENCE/);
  for (const format of ["pdf", "preview"]) {
    const text = await pdfText(storedFile(format)!);
    assert.match(text, /PROFESSIONAL SUMMARY/); assert.match(text, /WORK EXPERIENCE/);
    assert.doesNotMatch(text, /LEADERSHIP PROFILE|PROFESSIONAL EXPERIENCE/);
  }
});

test("hardener falls back to the appearance for legacy rows without a writing track", async () => {
  const placeholder = { ...draft, basics: { ...draft.basics, fullName: "Placeholder Person" } };
  const { env, storedFile } = setup({ realRender: true, theme: "lead", generationTrack: null, generated: placeholder });
  const result = await hardenGeneratedResumePackage(env as never, {}, "r");
  assert.equal(result.changed, true);
  const xml = await docxText(storedFile("docx")!);
  assert.match(xml, /LEADERSHIP PROFILE/); assert.match(xml, /PROFESSIONAL EXPERIENCE/);
});

test("package rewrite moves the resume and existing cover letter to the new track for exactly one correction", async () => {
  const { call, creditsUsed, resumeTrack, coverTrack, lastCoverPrompt } = setup();
  let response = await call("POST", {}, "/cover-letter/generate");
  assert.equal(response?.status, 200, await response?.clone().text());
  assert.equal(creditsUsed(), 1, "the first cover-letter build is included");
  assert.equal(coverTrack(), "plain");

  response = await call("POST", { generationTrack: "lead" }, "/generate");
  assert.equal(response?.status, 200, await response?.clone().text());
  const payload = await response!.json() as { coverLetterRewritten?: boolean };
  assert.equal(payload.coverLetterRewritten, true);
  assert.equal(creditsUsed(), 2, "one package correction, not two");
  assert.equal(resumeTrack(), "lead");
  assert.equal(coverTrack(), "lead");
  assert.match(lastCoverPrompt(), /LEAD \/ SUPERVISOR/);
  assert.match(lastCoverPrompt(), /Never invent leadership duties, accomplishments, metrics, certifications, tools, employers, titles, or dates/);

  // A later free appearance change keeps both writing tracks.
  response = await call("PATCH", { theme: "navy" });
  assert.equal(response?.status, 200, await response?.clone().text());
  assert.equal(creditsUsed(), 2);
  assert.equal(resumeTrack(), "lead");
  assert.equal(coverTrack(), "lead");
});

test("failed cover-letter step rolls the whole package back and returns the correction", async () => {
  const { sqlite, call, creditsUsed, resumeTrack, coverTrack, generatedJson, storedFile } = setup({ failCoverRewrite: true });
  let response = await call("POST", {}, "/cover-letter/generate");
  assert.equal(response?.status, 200, await response?.clone().text());
  const resumeBefore = generatedJson();

  response = await call("POST", { generationTrack: "lead" }, "/generate");
  assert.equal(response?.status, 502, await response?.clone().text());
  const payload = await response!.json() as { runConsumed?: boolean; code?: string };
  assert.equal(payload.runConsumed, false);
  assert.equal(payload.code, "PACKAGE_REWRITE_FAILED");
  assert.equal(creditsUsed(), 1, "the single package correction is returned");
  assert.equal(resumeTrack(), "plain", "resume track is not left converted");
  assert.equal(coverTrack(), "plain", "cover letter track is unchanged");
  assert.equal(generatedJson(), resumeBefore, "resume wording is restored");
  for (const format of ["docx", "pdf", "preview", "cover_json", "cover_pdf", "cover_docx"]) {
    assert.ok(storedFile(format), `${format} file is still available`);
  }
  assert.equal(Number(sqlite.prepare("SELECT COUNT(*) AS n FROM resume_generations WHERE model = 'package_rollback'").get()!.n), 1);
});

test("package rewrite is blocked once all corrections are used and changes nothing", async () => {
  const { sqlite, call, creditsUsed, resumeTrack, coverTrack } = setup();
  const response = await call("POST", {}, "/cover-letter/generate");
  assert.equal(response?.status, 200, await response?.clone().text());
  sqlite.exec("UPDATE entitlements SET credits_used=4");
  const blocked = await call("POST", { generationTrack: "lead" }, "/generate");
  assert.equal(blocked?.status, 409);
  assert.equal(creditsUsed(), 4);
  assert.equal(resumeTrack(), "plain");
  assert.equal(coverTrack(), "plain");
});

test("cover-letter endpoint refuses a cover-only track rewrite without using a correction", async () => {
  const { call, creditsUsed, coverTrack } = setup();
  let response = await call("POST", {}, "/cover-letter/generate");
  assert.equal(response?.status, 200, await response?.clone().text());
  response = await call("POST", { generationTrack: "lead" }, "/cover-letter/generate");
  assert.equal(response?.status, 400);
  assert.equal(creditsUsed(), 1);
  assert.equal(coverTrack(), "plain");
});

test("cover letters keep their writing track across free appearance changes and normal corrections", async () => {
  const { call, creditsUsed, coverTrack, lastCoverPrompt } = setup();
  let response = await call("POST", {}, "/cover-letter/generate");
  assert.equal(response?.status, 200, await response?.clone().text());
  assert.match(lastCoverPrompt(), /FIELD PRO/);
  response = await call("PATCH", { theme: "lead" });
  assert.equal(response?.status, 200, await response?.clone().text());
  assert.equal(creditsUsed(), 1);
  response = await call("POST", { correctionRequest: "Make the introduction more concise." }, "/cover-letter/generate");
  assert.equal(response?.status, 200, await response?.clone().text());
  assert.match(lastCoverPrompt(), /FIELD PRO/);
  assert.equal(creditsUsed(), 2);
  assert.equal(coverTrack(), "plain");
});
