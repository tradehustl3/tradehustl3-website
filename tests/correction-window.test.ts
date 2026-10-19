import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test, { type TestContext } from "node:test";
import { handleResumeBuilderRoute } from "../worker/resume-builder";
import { fixtureUploadedIntake, fixtureModelDraft, FIXTURE_TRADE, FIXTURE_TARGET_TITLE } from "./helpers/production-resume-fixture";
import { sqliteD1, seedSession, TEST_SESSION } from "./helpers/sqlite-d1";
import { modelReturns } from "./helpers/resume-generation-harness";

// The seven-day correction period (Terms) against real SQLite with the repo's
// migrations: a verified Stripe webhook sets the deadline, only correction runs
// are refused after it, and downloads, status, checkout and free changes keep working.

const WEBHOOK_SECRET = "whsec_test_correction_window";
const DAY = 24 * 60 * 60;
const ENDED = "Your seven-day correction period has ended.";
const draft = fixtureModelDraft();
const coverDraft = { paragraphs: ["I am interested in the building equipment mechanic role.", "My experience includes HVAC equipment maintenance and repair.", "I welcome the opportunity to discuss the position."] } as unknown as typeof draft;

function setup(options: { failResume?: boolean } = {}) {
  const { DB, sqlite } = sqliteD1();
  seedSession(sqlite);
  // The session must outlive the simulated eight days.
  sqlite.prepare("UPDATE sessions SET expires_at = ?").run(Math.floor(Date.now() / 1000) + 30 * DAY);
  sqlite.prepare("INSERT INTO resumes (resume_id,user_id,trade,title,intake_json,generated_json,status,theme,generation_track) VALUES ('r','user-1',?,?,?,?,'ready','plain','plain')")
    .run(FIXTURE_TRADE, FIXTURE_TARGET_TITLE, JSON.stringify(fixtureUploadedIntake()), JSON.stringify(draft));
  sqlite.prepare("INSERT INTO resume_orders (order_id,user_id,resume_id,email,plan,amount_total,currency,status) VALUES ('order-1','user-1','r','account@example.com','resume_mvp_999',999,'usd','pending')").run();
  const objects = new Map<string, Uint8Array>();
  const BOOKS = {
    async put(key: string, bytes: Uint8Array) { objects.set(key, bytes); },
    async get(key: string) { return objects.has(key) ? { body: objects.get(key), arrayBuffer: async () => objects.get(key), text: async () => new TextDecoder().decode(objects.get(key)) } : null; },
    async delete(key: string) { objects.delete(key); },
  } as unknown as R2Bucket;
  const env = {
    DB, BOOKS, STRIPE_RESUME_WEBHOOK_SECRET: WEBHOOK_SECRET,
    RESUME_AI_PROVIDER: "gemini", RESUME_AI_BRIDGE_URL: "https://bridge.example.run.app", RESUME_AI_BRIDGE_SECRET: "test",
  };
  let modelCalls = 0;
  const dependencies = {
    geminiFetch: (async (url: Parameters<typeof fetch>[0], init?: RequestInit) => {
      modelCalls++;
      const isCover = String(init?.body).includes("VERIFIED_RESUME");
      if (!isCover && options.failResume) throw new Error("test model failure");
      return modelReturns(isCover ? coverDraft : draft)(url, init);
    }) as typeof fetch,
    createDocx: async () => new Uint8Array([1]),
    createPdf: async () => new Uint8Array([2]),
  };
  const call = async (method: string, suffix = "", body?: object) => {
    const response = await handleResumeBuilderRoute(new Request(`https://tradehustl3.com/api/resume-builder/resumes/r${suffix}`, {
      method,
      headers: { Cookie: `tradehustl3_resume_session=${TEST_SESSION}`, Origin: "https://tradehustl3.com", "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }), env as never, dependencies);
    assert.ok(response, "route is handled");
    return response;
  };
  const webhook = async (eventId: string) => {
    const payload = JSON.stringify({
      id: eventId,
      type: "checkout.session.completed",
      data: { object: {
        id: `cs_${eventId}`, client_reference_id: "order-1", payment_status: "paid", amount_total: 999, currency: "usd",
        payment_intent: "pi_test_1", customer_details: { email: "account@example.com" },
        metadata: { order_id: "order-1", resume_id: "r", user_id: "user-1", product: "resume_builder_mvp" },
      } },
    });
    const t = String(Math.floor(Date.now() / 1000));
    const signature = createHmac("sha256", WEBHOOK_SECRET).update(`${t}.${payload}`).digest("hex");
    const response = await handleResumeBuilderRoute(new Request("https://tradehustl3.com/api/resume-builder/stripe/webhook", {
      method: "POST", headers: { "Stripe-Signature": `t=${t},v1=${signature}`, "Content-Type": "application/json" }, body: payload,
    }), env as never, dependencies);
    assert.equal(response?.status, 200, await response?.clone().text());
  };
  const entitlement = () => sqlite.prepare("SELECT credits_used, credits_total, corrections_expire_at FROM entitlements WHERE source_order_id = 'order-1'").get() as
    { credits_used: number; credits_total: number; corrections_expire_at: number | null };
  const paidAt = () => Math.floor(Date.parse(`${(sqlite.prepare("SELECT paid_at FROM resume_orders WHERE order_id = 'order-1'").get() as { paid_at: string }).paid_at.replace(" ", "T")}Z`) / 1000);
  return { sqlite, call, webhook, entitlement, paidAt, modelCalls: () => modelCalls };
}

/** Pay through the verified webhook, then move the clock to `days` after payment. */
async function paidThenDay(t: TestContext, days: number, options?: { failResume?: boolean }) {
  const s = setup(options);
  await s.webhook("evt_paid");
  t.mock.timers.enable({ apis: ["Date"], now: (s.paidAt() + days * DAY) * 1000 });
  return s;
}

const correction = { correctionRequest: "Emphasize rooftop-unit diagnostics." };

test("the verified webhook sets the deadline seven days after paid_at, and a replay does not move it", async (t) => {
  const s = setup();
  await s.webhook("evt_paid");
  const first = s.entitlement();
  assert.equal(first.corrections_expire_at, s.paidAt() + 7 * DAY);
  assert.equal(first.credits_total - first.credits_used, 3, "three correction runs after the included first build");

  t.mock.timers.enable({ apis: ["Date"], now: (s.paidAt() + 2 * DAY) * 1000 });
  await s.webhook("evt_replayed");
  assert.equal(s.entitlement().corrections_expire_at, first.corrections_expire_at);
  assert.equal((s.sqlite.prepare("SELECT count(*) AS n FROM entitlements").get() as { n: number }).n, 1);
});

test("day 6: resume and cover-letter corrections are allowed and the status shows the deadline", async (t) => {
  const s = await paidThenDay(t, 6);
  let response = await s.call("POST", "/generate", correction);
  assert.equal(response.status, 200, await response.clone().text());
  response = await s.call("POST", "/cover-letter/generate", {});
  assert.equal(response.status, 200, await response.clone().text());
  response = await s.call("POST", "/cover-letter/generate", { correctionRequest: "Make the opening more direct." });
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal(s.entitlement().credits_used, 3, "one resume correction and one cover-letter correction");

  const status = await (await s.call("GET")).json() as { resume: { correctionsRemaining: number; correctionsExpireAt: number; correctionsExpired: boolean; coverLetter: { correctionsExpireAt: number; correctionsExpired: boolean } } };
  assert.equal(status.resume.correctionsRemaining, 1);
  assert.equal(status.resume.correctionsExpireAt, s.paidAt() + 7 * DAY);
  assert.equal(status.resume.correctionsExpired, false);
  assert.equal(status.resume.coverLetter.correctionsExpireAt, s.paidAt() + 7 * DAY);
  assert.equal(status.resume.coverLetter.correctionsExpired, false);
});

test("day 8: resume and cover-letter corrections are refused with a clear 409 and no model call", async (t) => {
  const s = await paidThenDay(t, 8);
  // The first cover letter is still free and still allowed after the period.
  let response = await s.call("POST", "/cover-letter/generate", {});
  assert.equal(response.status, 200, await response.clone().text());
  const callsBefore = s.modelCalls();

  response = await s.call("POST", "/generate", correction);
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { ok: false, code: "CORRECTION_PERIOD_ENDED", message: ENDED });

  response = await s.call("POST", "/cover-letter/generate", { correctionRequest: "Make the opening more direct." });
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { ok: false, code: "CORRECTION_PERIOD_ENDED", message: ENDED });

  assert.equal(s.modelCalls(), callsBefore, "no AI run after the period");
  assert.equal(s.entitlement().credits_used, 1, "refusals use no credit");
  assert.equal((s.sqlite.prepare("SELECT status FROM resumes WHERE resume_id = 'r'").get() as { status: string }).status, "ready", "the resume is not left generating");
});

test("day 8: downloads, paid status, checkout refusal and free changes keep working", async (t) => {
  const s = setup();
  await s.webhook("evt_paid");
  t.mock.timers.enable({ apis: ["Date"], now: (s.paidAt() + 6 * DAY) * 1000 });
  assert.equal((await s.call("POST", "/generate", correction)).status, 200, "day-6 correction stores the clean files");
  t.mock.timers.setTime((s.paidAt() + 8 * DAY) * 1000);

  for (const format of ["pdf", "docx"]) {
    const download = await s.call("GET", `/files/${format}`);
    assert.equal(download.status, 200, `${format} download after day 7`);
  }
  const status = await (await s.call("GET")).json() as { resume: { paid: boolean; downloads: unknown; correctionsRemaining: number; correctionsExpired: boolean } };
  assert.equal(status.resume.paid, true);
  assert.ok(status.resume.downloads, "download links stay on the status");
  assert.equal(status.resume.correctionsRemaining, 0);
  assert.equal(status.resume.correctionsExpired, true);

  const checkout = await s.call("POST", "/checkout", {});
  assert.equal(checkout.status, 409);
  assert.match((await checkout.json() as { message: string }).message, /already paid/);

  const before = s.entitlement().credits_used;
  const restyle = await s.call("PATCH", "", { theme: "navy" });
  assert.equal(restyle.status, 200, await restyle.clone().text());
  assert.equal(s.entitlement().credits_used, before, "template and style changes cost no correction");
});

test("two concurrent corrections cannot exceed the three correction runs", async (t) => {
  const s = await paidThenDay(t, 1);
  assert.equal((await s.call("POST", "/cover-letter/generate", {})).status, 200, "first cover letter is free");
  s.sqlite.prepare("UPDATE entitlements SET credits_used = 3").run(); // one correction left
  const results = await Promise.all([
    s.call("POST", "/generate", correction),
    s.call("POST", "/cover-letter/generate", { correctionRequest: "Make the opening more direct." }),
  ]);
  assert.equal(results.filter((response) => response.status === 200).length, 1, "only one request gets the last run");
  assert.equal(s.entitlement().credits_used, 4);
  assert.ok(s.entitlement().credits_used <= s.entitlement().credits_total);
});

test("a failed run inside the period restores its credit", async (t) => {
  const s = await paidThenDay(t, 3, { failResume: true });
  const response = await s.call("POST", "/generate", correction);
  assert.notEqual(response.status, 200);
  assert.equal(s.entitlement().credits_used, 1, "the reserved correction is returned");
});

test("the first cover letter stays free inside the period", async (t) => {
  const s = await paidThenDay(t, 2);
  assert.equal((await s.call("POST", "/cover-letter/generate", {})).status, 200);
  assert.equal(s.entitlement().credits_used, 1);
});

test("entitlements without a deadline keep their corrections (NULL means no deadline)", async (t) => {
  const s = await paidThenDay(t, 20);
  s.sqlite.prepare("UPDATE entitlements SET corrections_expire_at = NULL").run();
  assert.equal((await s.call("POST", "/generate", correction)).status, 200);
});
