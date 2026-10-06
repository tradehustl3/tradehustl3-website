#!/usr/bin/env node
/**
 * Authenticated production smoke test for the Resume Builder review flow.
 *
 * API health → smoke sign-in → open seeded resume → switch template → customize →
 * inspect heading → confirm Download/Print absent → open legacy resume → sign out
 *
 * Env:
 *   SMOKE_ORIGIN               default https://tradehustl3.com
 *   SMOKE_TEST_LOGIN_SECRET    required; bearer for the smoke session endpoint
 *   SMOKE_BYPASS_TOKEN         optional; sent as X-Smoke-Token (edge rule)
 *
 * Output never contains secrets, cookies, or response bodies beyond the
 * server's short `message` field.
 */
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const ORIGIN = (process.env.SMOKE_ORIGIN || "https://tradehustl3.com").replace(/\/+$/, "");
const LOGIN_SECRET = process.env.SMOKE_TEST_LOGIN_SECRET || "";
const BYPASS = process.env.SMOKE_BYPASS_TOKEN || "";
const SMOKE_EMAIL = "smoke-test@tradehustl3.invalid";
const CANDIDATE_NAME = "SMOKE TEST CANDIDATE";

let cookie = "";
let failures = 0;

class SmokeFailure extends Error {}
const fail = (message) => { throw new SmokeFailure(message); };
const expect = (condition, message) => { if (!condition) fail(message); };

async function call(path, { method = "GET", body, origin = false, auth } = {}) {
  const headers = { "User-Agent": "Mozilla/5.0 (compatible; TRADE-HUSTL3-Production-Smoke/1.0)", "Cache-Control": "no-cache" };
  if (BYPASS) headers["X-Smoke-Token"] = BYPASS;
  if (cookie) headers.Cookie = cookie;
  if (auth) headers.Authorization = `Bearer ${auth}`;
  if (origin) headers.Origin = ORIGIN;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${ORIGIN}${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual",
  });
  if (response.headers.get("cf-mitigated") === "challenge") {
    fail(`${method} ${path}: Cloudflare challenge (cf-mitigated) — the edge skip rule for smoke traffic is missing or not matching.`);
  }
  return response;
}

async function jsonOf(response, label) {
  const type = response.headers.get("content-type") || "";
  expect(type.includes("application/json"), `${label}: expected JSON, got ${type || "no content-type"} (HTTP ${response.status})`);
  return response.json();
}

async function pdfText(response, label) {
  expect(response.status === 200, `${label}: HTTP ${response.status}`);
  expect((response.headers.get("content-type") || "").includes("application/pdf"), `${label}: not a PDF`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  expect(bytes.byteLength > 1000, `${label}: PDF suspiciously small (${bytes.byteLength} bytes)`);
  // pdfjs transfers (detaches) the buffer it is given; keep `bytes` intact for comparisons.
  const task = getDocument({ data: bytes.slice(), isEvalSupported: false, useSystemFonts: false });
  const pdf = await task.promise;
  let text = "";
  for (let page = 1; page <= pdf.numPages; page += 1) {
    const content = await (await pdf.getPage(page)).getTextContent();
    text += ` ${content.items.map((item) => ("str" in item ? item.str : "")).join(" ")}`;
  }
  const pages = pdf.numPages;
  await task.destroy();
  return { bytes, text: text.replace(/\s+/g, " ").toUpperCase(), pages };
}

const statusOf = async (id, label) => (await jsonOf(await call(`/api/resume-builder/resumes/${id}`), label)).resume;

async function step(name, run) {
  try {
    await run();
    console.log(`ok   ${name}`);
  } catch (error) {
    failures += 1;
    const message = error instanceof SmokeFailure ? error.message : `unexpected ${error?.name || "error"}`;
    console.log(`FAIL ${name}`);
    console.log(`::error::Resume Builder smoke — ${name}: ${message}`);
    if (process.env.SMOKE_DEBUG === "1" && !(error instanceof SmokeFailure)) console.log(error?.stack);
    throw error;
  }
}

async function main() {
  if (LOGIN_SECRET.length < 32) {
    console.log("::error::SMOKE_TEST_LOGIN_SECRET is missing or shorter than 32 characters.");
    process.exit(2);
  }
  let ids;
  let firstPreview;

  // Deliberately not /api/health: that endpoint reports the lead-delivery email
  // queue (503 on dead letters), which must not gate deploys. This read proves
  // the Worker and the Resume Builder database are serving.
  await step("Resume Builder API health", async () => {
    const response = await call("/api/resume-builder/reviews/public");
    expect(response.status === 200, `HTTP ${response.status}`);
    const body = await jsonOf(response, "public reviews");
    expect(Array.isArray(body.reviews), "database-backed read did not return a reviews array");
  });

  await step("smoke sign-in", async () => {
    const response = await call("/api/resume-builder/internal/smoke/session", { method: "POST", auth: LOGIN_SECRET });
    const body = await jsonOf(response, "smoke sign-in");
    expect(response.status === 200, `HTTP ${response.status}: ${body.message || "no message"}`);
    const session = (response.headers.getSetCookie?.() || []).find((value) => value.startsWith("tradehustl3_resume_session="));
    expect(session, "no session cookie issued");
    cookie = session.split(";")[0];
    ids = body.resumes;
    expect(ids?.current && ids?.legacy, "fixture ids missing from response");
    const me = await jsonOf(await call("/api/resume-builder/me"), "me");
    expect(me.user?.email === SMOKE_EMAIL, "session is not the synthetic smoke account");
  });

  await step("open seeded current-format resume (unpaid)", async () => {
    const resume = await statusOf(ids.current, "current status");
    expect(resume.style?.templateVersion === 2, `templateVersion ${resume.style?.templateVersion}, expected 2`);
    expect(resume.theme === "plain" && resume.generationTrack === "plain", "fixture did not reset to Field Pro / plain track");
    expect(resume.paid === false, "fixture unexpectedly paid");
    expect(resume.previewUrl, "no preview URL");
    firstPreview = await pdfText(await call(resume.previewUrl), "current preview");
    expect(firstPreview.text.includes(CANDIDATE_NAME), "candidate name not found in preview");
    expect(firstPreview.text.includes("PROFESSIONAL SUMMARY"), "Field Pro track heading missing from preview");
  });

  await step("confirm Download/Print absent before payment", async () => {
    const resume = await statusOf(ids.current, "current status");
    expect(resume.downloads === null, "downloads offered on an unpaid resume");
    expect(resume.correctionsRemaining === 0, "unpaid resume reports corrections");
    for (const format of ["pdf", "docx"]) {
      const response = await call(`/api/resume-builder/resumes/${ids.current}/files/${format}`);
      expect(response.status === 404, `clean ${format} returned HTTP ${response.status} without payment`);
    }
    const view = await call(`/api/resume-builder/resumes/${ids.current}/files/pdf?view=1`);
    expect(view.status === 404, `print view returned HTTP ${view.status} without payment`);
  });

  await step("switch template Field Pro → Modern Trade (free, no AI)", async () => {
    const response = await call(`/api/resume-builder/resumes/${ids.current}`, { method: "PATCH", origin: true, body: { theme: "navy" } });
    const body = await jsonOf(response, "template switch");
    expect(response.status === 200, `HTTP ${response.status}: ${body.message || "no message"}`);
    expect(body.runConsumed === false, "template switch consumed an AI correction");
    const resume = await statusOf(ids.current, "status after switch");
    expect(resume.theme === "navy", `theme is ${resume.theme}`);
    expect(resume.generationTrack === "plain", "template switch changed the career track");
    expect(resume.paid === false && resume.downloads === null, "template switch changed entitlement state");
  });

  await step("inspect heading after template switch", async () => {
    const resume = await statusOf(ids.current, "status");
    const preview = await pdfText(await call(resume.previewUrl), "switched preview");
    expect(preview.text.includes("PROFESSIONAL SUMMARY"), "track heading lost after template switch");
    expect(!preview.text.includes("PROFESSIONAL PROFILE"), "template switch leaked Modern Trade track heading");
    expect(Buffer.compare(Buffer.from(preview.bytes), Buffer.from(firstPreview.bytes)) !== 0, "preview was not re-rendered");
  });

  await step("change customization (font, size, accent)", async () => {
    const change = { font: "Traditional", textSize: "Large", accent: "Forest Green" };
    const response = await call(`/api/resume-builder/resumes/${ids.current}`, { method: "PATCH", origin: true, body: change });
    const body = await jsonOf(response, "customization");
    expect(response.status === 200, `HTTP ${response.status}: ${body.message || "no message"}`);
    expect(body.runConsumed === false, "customization consumed an AI correction");
    const style = (await statusOf(ids.current, "status")).style;
    for (const [key, value] of Object.entries(change)) expect(style?.[key] === value, `${key} is ${style?.[key]}, expected ${value}`);
  });

  await step("open legacy resume", async () => {
    const resume = await statusOf(ids.legacy, "legacy status");
    expect(resume.style?.templateVersion === 1, `legacy templateVersion ${resume.style?.templateVersion}, expected 1`);
    expect(resume.theme === "navy", `legacy theme ${resume.theme}`);
    expect(resume.downloads === null, "downloads offered on unpaid legacy resume");
    const preview = await pdfText(await call(resume.previewUrl), "legacy preview");
    expect(preview.text.includes(CANDIDATE_NAME), "candidate name not found in legacy preview");
    expect(preview.text.includes("PROFESSIONAL PROFILE"), "legacy track heading missing");
  });

  await step("sign out", async () => {
    const response = await call("/api/resume-builder/auth/logout", { method: "POST", origin: true });
    expect(response.status === 200, `HTTP ${response.status}`);
    expect((await call("/api/resume-builder/me")).status === 401, "session still valid after logout");
  });
}

main().then(
  () => { console.log("Resume Builder authenticated smoke passed."); },
  async () => {
    // Best effort: never leave a live smoke session behind after a failure.
    if (cookie) await call("/api/resume-builder/auth/logout", { method: "POST", origin: true }).catch(() => {});
    console.log(`Resume Builder authenticated smoke failed (${failures} step).`);
    process.exit(1);
  },
);
