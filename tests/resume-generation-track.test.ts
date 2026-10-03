import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createResumeDocx, createResumePdf } from "../worker/resume-documents";
import { handleResumeBuilderRoute } from "../worker/resume-builder";
import { fixtureUploadedIntake, fixtureModelDraft, FIXTURE_TRADE, FIXTURE_TARGET_TITLE } from "./helpers/production-resume-fixture";
import { sqliteD1, seedSession, TEST_SESSION } from "./helpers/sqlite-d1";
import { modelReturns } from "./helpers/resume-generation-harness";

const draft = fixtureModelDraft();
function setup(fail = false) {
  const { DB, sqlite } = sqliteD1();
  seedSession(sqlite);
  sqlite.prepare("INSERT INTO resumes (resume_id,user_id,trade,title,intake_json,generated_json,status,theme,generation_track) VALUES ('r','user-1',?,?,?,?, 'ready','plain','plain')").run(FIXTURE_TRADE,FIXTURE_TARGET_TITLE,JSON.stringify(fixtureUploadedIntake()),JSON.stringify(draft));
  sqlite.exec("INSERT INTO entitlements (entitlement_id,user_id,resume_id,credits_total,credits_used,status,kind,plan) VALUES ('e','user-1','r',4,1,'active','resume','one_time')");
  const objects = new Map<string, Uint8Array>();
  const BOOKS = { async put(key: string, bytes: Uint8Array) { objects.set(key,bytes); }, async get(key: string) { return objects.has(key) ? { body: objects.get(key), arrayBuffer: async () => objects.get(key), text: async () => new TextDecoder().decode(objects.get(key)) } : null; }, async delete(key: string) { objects.delete(key); } } as unknown as R2Bucket;
  const env = { DB, BOOKS, RESUME_AI_PROVIDER: "gemini", RESUME_AI_BRIDGE_URL: "https://bridge.example.run.app", RESUME_AI_BRIDGE_SECRET: "test" };
  let prompt = "";
  const dependencies = { geminiFetch: (async (url: Parameters<typeof fetch>[0], init?: RequestInit) => { prompt = String(init?.body); if (fail) throw new Error("test model failure"); return modelReturns(prompt.includes("VERIFIED_RESUME") ? { paragraphs: ["I am interested in the building equipment mechanic role.", "My experience includes HVAC equipment maintenance and repair.", "I welcome the opportunity to discuss the position."] } as unknown as typeof draft : draft)(url,init); }) as typeof fetch, createDocx: async () => new Uint8Array([1]), createPdf: async () => new Uint8Array([2]) };
  const call = (method: string, body: object, suffix = "") => handleResumeBuilderRoute(new Request(`https://tradehustl3.com/api/resume-builder/resumes/r${suffix}`, { method, headers: { Cookie: `tradehustl3_resume_session=${TEST_SESSION}`, Origin: "https://tradehustl3.com", "Content-Type": "application/json" }, body: JSON.stringify(body) }),env,dependencies);
  return { sqlite, call, prompt: () => prompt };
}

test("Field Pro headings survive a lead appearance in DOCX and PDF", async () => {
  const zip = await JSZip.loadAsync(await createResumeDocx(draft,"lead","plain"));
  const xml = await zip.file("word/document.xml")!.async("string");
  assert.match(xml,/PROFESSIONAL SUMMARY/); assert.match(xml,/CORE SKILLS/); assert.doesNotMatch(xml,/LEADERSHIP PROFILE|LEADERSHIP &amp; OPERATIONS/);
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await getDocument({ data: await createResumePdf(draft,false,"lead","plain"), useSystemFonts: true }).promise;
  let text = "";
  for (let n=1;n<=pdf.numPages;n++) text += (await (await pdf.getPage(n)).getTextContent()).items.map(item => "str" in item ? item.str : "").join(" ");
  assert.match(text,/PROFESSIONAL SUMMARY/); assert.doesNotMatch(text,/LEADERSHIP PROFILE/);
});

test("appearance changes are free and retain generation track", async () => {
  const { sqlite, call } = setup();
  const response = await call("PATCH",{theme:"lead"});
  assert.equal(response?.status,200,await response?.clone().text());
  assert.equal(sqlite.prepare("SELECT credits_used FROM entitlements").get()!.credits_used,1);
  assert.equal(sqlite.prepare("SELECT generation_track FROM resumes").get()!.generation_track,"plain");
});

test("track rewrite consumes exactly one correction and is blocked after three", async () => {
  const { sqlite, call, prompt } = setup();
  const response = await call("POST",{generationTrack:"lead"},"/generate");
  assert.equal(response?.status,200,await response?.clone().text());
  assert.match(prompt(),/LEAD \/ SUPERVISOR/);
  assert.equal(sqlite.prepare("SELECT credits_used FROM entitlements").get()!.credits_used,2);
  assert.equal(sqlite.prepare("SELECT generation_track FROM resumes").get()!.generation_track,"lead");
  sqlite.exec("UPDATE entitlements SET credits_used=4");
  const blocked = await call("POST",{generationTrack:"navy"},"/generate");
  assert.equal(blocked?.status,409); assert.equal(sqlite.prepare("SELECT credits_used FROM entitlements").get()!.credits_used,4);
});

test("migration backfills every existing theme and rollback preserves theme", async () => {
  const db = new DatabaseSync(":memory:"); db.exec("CREATE TABLE resumes (theme TEXT); INSERT INTO resumes VALUES ('plain'),('navy'),('lead')");
  db.exec(readFileSync(new URL("../drizzle/0008_resume_generation_track.sql",import.meta.url),"utf8"));
  for (const row of db.prepare("SELECT * FROM resumes").all()) assert.equal(row.theme,row.generation_track);
  db.exec(readFileSync(new URL("../drizzle/0008_resume_generation_track_down.sql",import.meta.url),"utf8"));
  assert.deepEqual(db.prepare("SELECT theme FROM resumes").all().map(row=>row.theme),["plain","navy","lead"]);
});

test("backfilled headings match the previous rendering defaults for all tracks", async () => {
  for (const track of ["plain","navy","lead"] as const) {
    const before = await JSZip.loadAsync(await createResumeDocx(draft,track));
    const after = await JSZip.loadAsync(await createResumeDocx(draft,track,track));
    assert.equal(await before.file("word/document.xml")!.async("string"),await after.file("word/document.xml")!.async("string"));
  }
});


test("failed track rewrites restore the correction and preserve the old track", async () => {
  const { sqlite, call } = setup(true);
  const response = await call("POST",{generationTrack:"lead"},"/generate");
  assert.equal(response?.status,502);
  assert.equal(sqlite.prepare("SELECT credits_used FROM entitlements").get()!.credits_used,1);
  assert.equal(sqlite.prepare("SELECT generation_track FROM resumes").get()!.generation_track,"plain");
});


test("cover letters keep their writing track across free appearance changes and use one correction for a rewrite", async () => {
  const { sqlite, call, prompt } = setup();
  let response = await call("POST",{},"/cover-letter/generate");
  assert.equal(response?.status,200,await response?.clone().text());
  assert.match(prompt(),/FIELD PRO/);
  response = await call("PATCH",{theme:"lead"});
  assert.equal(response?.status,200,await response?.clone().text());
  assert.equal(sqlite.prepare("SELECT credits_used FROM entitlements").get()!.credits_used,1);
  response = await call("POST",{correctionRequest:"Make the introduction more concise."},"/cover-letter/generate");
  assert.equal(response?.status,200,await response?.clone().text());
  assert.match(prompt(),/FIELD PRO/);
  response = await call("POST",{generationTrack:"lead"},"/cover-letter/generate");
  assert.equal(response?.status,200,await response?.clone().text());
  assert.match(prompt(),/LEAD \/ SUPERVISOR/);
  assert.equal(sqlite.prepare("SELECT credits_used FROM entitlements").get()!.credits_used,3);
  sqlite.exec("UPDATE entitlements SET credits_used=4");
  response = await call("POST",{generationTrack:"navy"},"/cover-letter/generate");
  assert.equal(response?.status,409);
  assert.equal(sqlite.prepare("SELECT credits_used FROM entitlements").get()!.credits_used,4);
});
