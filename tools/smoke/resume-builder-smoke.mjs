#!/usr/bin/env node
/**
 * Authenticated production smoke test for the Resume Builder review flow.
 *
 * API health → smoke sign-in → open seeded resume → confirm Download/Print absent →
 * switch template (Modern Trade) → inspect heading → customize → inspect rendered
 * customization → switch template (Lead / Supervisor) → inspect heading →
 * Lead rewrite requires payment → open legacy resume → sign out
 *
 * Env:
 *   SMOKE_ORIGIN               default https://tradehustl3.com
 *   SMOKE_TEST_LOGIN_SECRET    required; bearer for the smoke session endpoint
 *   SMOKE_BYPASS_TOKEN         optional; sent as X-Smoke-Token (edge rule)
 *
 * Output never contains secrets, cookies, or response bodies beyond the
 * server's short `message` field.
 */
import { createHash } from "node:crypto";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";

const ORIGIN = (process.env.SMOKE_ORIGIN || "https://tradehustl3.com").replace(/\/+$/, "");
const LOGIN_SECRET = process.env.SMOKE_TEST_LOGIN_SECRET || "";
const BYPASS = process.env.SMOKE_BYPASS_TOKEN || "";
const SMOKE_EMAIL = "smoke-test@tradehustl3.invalid";
const CANDIDATE_NAME = "SMOKE TEST CANDIDATE";
// Fixture facts that must survive any presentation change (worker/resume-smoke-session.ts).
const CORE_CONTENT = [CANDIDATE_NAME, "HVAC SERVICE TECHNICIAN", "SMOKE TEST MECHANICAL", "MAINTENANCE TECHNICIAN", "FIXTURE PROPERTY SERVICES", "EPA 608 UNIVERSAL"];
const CUSTOMIZATION = { font: "Traditional", textSize: "Large", accent: "Forest Green" };
// Accent "Forest Green" (worker/resume-templates.ts ACCENT_HEX), as pdf.js reports fills.
const CUSTOMIZATION_ACCENT_FILL = "#24543c";

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
  expect(new TextDecoder().decode(bytes.subarray(0, 5)) === "%PDF-", `${label}: response is not a PDF document`);
  // pdfjs transfers (detaches) the buffer it is given; keep `bytes` intact for comparisons.
  const task = getDocument({ data: bytes.slice(), isEvalSupported: false, useSystemFonts: false });
  try {
    const pdf = await task.promise.catch(() => fail(`${label}: PDF could not be parsed`));
    expect(pdf.numPages >= 1, `${label}: PDF has no pages`);
    let text = "";
    const pageList = [];
    for (let page = 1; page <= pdf.numPages; page += 1) pageList.push(await pdf.getPage(page));
    for (const page of pageList) {
      const content = await page.getTextContent();
      text += ` ${content.items.map((item) => ("str" in item ? item.str : "")).join(" ")}`;
    }
    text = text.replace(/\s+/g, " ").trim().toUpperCase();
    expect(text.length > 0, `${label}: PDF has no extractable text`);
    return { bytes, text, pages: pdf.numPages, render: await renderSignature(pageList) };
  } finally {
    await task.destroy();
  }
}

const fillHex = (args) => {
  const [value] = args;
  if (typeof value === "string") return value.toLowerCase();
  if (args.length === 3 && args.every((part) => typeof part === "number")) {
    return `#${args.map((part) => Math.round(part).toString(16).padStart(2, "0")).join("")}`;
  }
  return JSON.stringify(args);
};
const dominant = (counts) => [...counts].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0]?.[0] ?? null;
const added = (after, before) => after.filter((value) => !before.includes(value));

/**
 * What the renderer actually drew, independent of PDF metadata (creation dates,
 * object numbering) that changes on every save. Body font and size are those of
 * the most characters on the page; fills are every fill color painted.
 */
async function renderSignature(pages) {
  const fontChars = new Map();
  const sizeChars = new Map();
  const fonts = new Set();
  const fills = new Set();
  for (const page of pages) {
    // The operator list loads the page's fonts into commonObjs, so it runs first.
    const operators = await page.getOperatorList();
    operators.fnArray.forEach((fn, index) => {
      if (fn === OPS.setFillRGBColor) fills.add(fillHex(operators.argsArray[index]));
    });
    const familyOf = (id) => {
      const name = page.commonObjs.has(id) ? page.commonObjs.get(id)?.name : null;
      // "ABCDEF+Gelasio-Regular-1234" → "Gelasio"
      return typeof name === "string" ? name.replace(/^[A-Z]{6}\+/, "").split("-")[0] : "unknown";
    };
    for (const item of (await page.getTextContent()).items) {
      const characters = "str" in item ? item.str.replace(/\s+/g, "").length : 0;
      if (!characters) continue;
      const family = familyOf(item.fontName);
      const size = Math.round(Math.hypot(item.transform[0], item.transform[1]) * 100) / 100;
      fonts.add(family);
      fontChars.set(family, (fontChars.get(family) || 0) + characters);
      sizeChars.set(size, (sizeChars.get(size) || 0) + characters);
    }
  }
  const facts = {
    pages: pages.length,
    bodyFont: dominant(fontChars),
    bodySize: dominant(sizeChars),
    fonts: [...fonts].sort(),
    fills: [...fills].sort(),
    sizes: [...sizeChars.keys()].sort((a, b) => a - b),
  };
  return { ...facts, fingerprint: createHash("sha256").update(JSON.stringify(facts)).digest("hex").slice(0, 16) };
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
  let beforeCustomization;

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
    const resume = await statusOf(ids.current, "status before customization");
    for (const [key, value] of Object.entries(CUSTOMIZATION)) {
      expect(resume.style?.[key] !== value, `precondition: ${key} is already ${value}, so the render comparison would prove nothing`);
    }
    // Rendered BEFORE the change, in the same template, so only customization differs.
    beforeCustomization = { resume, preview: await pdfText(await call(resume.previewUrl), "preview before customization") };

    // Same PATCH the review page's style controls send.
    const response = await call(`/api/resume-builder/resumes/${ids.current}`, { method: "PATCH", origin: true, body: CUSTOMIZATION });
    const body = await jsonOf(response, "customization");
    expect(response.status === 200, `HTTP ${response.status}: ${body.message || "no message"}`);
    expect(body.runConsumed === false, "customization consumed an AI correction");
    for (const [key, value] of Object.entries(CUSTOMIZATION)) expect(body.style?.[key] === value, `customization response ${key} is ${body.style?.[key]}, expected ${value}`);
    const style = (await statusOf(ids.current, "status")).style;
    for (const [key, value] of Object.entries(CUSTOMIZATION)) expect(style?.[key] === value, `${key} is ${style?.[key]}, expected ${value}`);
  });

  await step("inspect rendered preview after customization", async () => {
    const resume = await statusOf(ids.current, "status after customization");
    const before = beforeCustomization.resume;
    expect(resume.paid === false && resume.downloads === null, "customization changed entitlement state");
    expect(resume.runsUsed === before.runsUsed && resume.correctionsRemaining === 0, `customization changed AI usage (runsUsed ${before.runsUsed} → ${resume.runsUsed}, correctionsRemaining ${resume.correctionsRemaining})`);
    expect(resume.theme === before.theme && resume.generationTrack === before.generationTrack, "customization changed the template or career track");
    expect(resume.status === "ready" && resume.previewUrl, `resume not ready after customization (status ${resume.status})`);

    const after = await pdfText(await call(resume.previewUrl), "preview after customization");
    for (const fact of CORE_CONTENT) expect(after.text.includes(fact), `"${fact}" missing from preview after customization`);
    for (const fact of CORE_CONTENT) expect(beforeCustomization.preview.text.includes(fact), `"${fact}" missing from preview before customization`);

    const was = beforeCustomization.preview.render;
    const now = after.render;
    const changes = `font ${was.bodyFont} → ${now.bodyFont}, body size ${was.bodySize} → ${now.bodySize}pt, fills +[${added(now.fills, was.fills)}] -[${added(was.fills, now.fills)}]`;
    expect(now.fingerprint !== was.fingerprint, `rendered preview did not change after customization (render fingerprint ${now.fingerprint} unchanged; ${changes})`);
    expect(now.bodyFont !== was.bodyFont, `font change was saved but not rendered: body font stayed ${was.bodyFont}`);
    expect(now.bodySize > was.bodySize, `text size change was saved but not rendered: body size ${was.bodySize}pt → ${now.bodySize}pt, expected larger`);
    expect(now.fills.includes(CUSTOMIZATION_ACCENT_FILL), `accent change was saved but not rendered: ${CUSTOMIZATION_ACCENT_FILL} not painted (${changes})`);
    expect(added(was.fills, now.fills).length > 0, `accent change was saved but the previous accent is still painted (${changes})`);
    console.log(`     render ${was.fingerprint} → ${now.fingerprint}: ${changes}`);
  });

  // Same PATCH the review page sends when an unpaid customer picks Lead / Supervisor.
  // Track headings follow the writing track, which only a paid rewrite changes, so
  // the look switches while the Field Pro wording and headings stay.
  await step("switch template → Lead / Supervisor (free, no AI)", async () => {
    const response = await call(`/api/resume-builder/resumes/${ids.current}`, { method: "PATCH", origin: true, body: { theme: "lead" } });
    const body = await jsonOf(response, "lead switch");
    expect(response.status === 200, `HTTP ${response.status}: ${body.message || "no message"}`);
    expect(body.runConsumed === false, "Lead / Supervisor switch consumed an AI correction");
    const resume = await statusOf(ids.current, "status after lead switch");
    expect(resume.theme === "lead", `theme is ${resume.theme}, expected lead`);
    expect(resume.generationTrack === "plain", `Lead / Supervisor look switch changed the career track to ${resume.generationTrack}`);
    expect(resume.paid === false && resume.downloads === null, "Lead / Supervisor switch changed entitlement state");
    expect(resume.previewUrl, "no preview URL after Lead / Supervisor switch");
  });

  await step("inspect heading after Lead / Supervisor switch", async () => {
    const resume = await statusOf(ids.current, "status");
    const preview = await pdfText(await call(resume.previewUrl), "Lead / Supervisor preview");
    expect(preview.pages >= 1, "Lead / Supervisor preview has no pages");
    expect(preview.text.includes(CANDIDATE_NAME), "candidate name not found in Lead / Supervisor preview");
    expect(preview.text.includes("PROFESSIONAL SUMMARY") && preview.text.includes("CORE SKILLS"), "Field Pro track headings lost after Lead / Supervisor look switch");
    expect(!preview.text.includes("TECHNICAL & OPERATIONS COMPETENCIES"), "unpaid look switch leaked the Lead / Supervisor track heading TECHNICAL & OPERATIONS COMPETENCIES");
    expect(Buffer.compare(Buffer.from(preview.bytes), Buffer.from(firstPreview.bytes)) !== 0, "preview was not re-rendered");
  });

  await step("Lead / Supervisor rewrite requires payment (no AI, no correction)", async () => {
    const response = await call(`/api/resume-builder/resumes/${ids.current}/generate`, { method: "POST", origin: true, body: { generationTrack: "lead" } });
    const body = await jsonOf(response, "lead rewrite");
    expect(response.status === 402 && body.code === "PAYMENT_REQUIRED", `unpaid Lead / Supervisor rewrite returned HTTP ${response.status} ${body.code || ""}, expected 402 PAYMENT_REQUIRED`);
    expect(body.runConsumed === false, "refused Lead / Supervisor rewrite consumed an AI correction");
    const resume = await statusOf(ids.current, "status after refused rewrite");
    expect(resume.generationTrack === "plain" && resume.theme === "lead", "refused rewrite changed the resume");
    expect(resume.paid === false && resume.downloads === null, "refused rewrite changed entitlement state");
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
