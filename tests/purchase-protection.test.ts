import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { handleResumeBuilderRoute } from "../worker/resume-builder";
import { handleResumeBuilderRoute as baseRoute, type ResumeBuilderEnv } from "../worker/resume-builder-base";
import { CHECKOUT_AGREEMENT, INTAKE_AGREEMENT, PURCHASE_DISCLOSURE, PURCHASE_POLICY_SNAPSHOT, PURCHASE_TERMS_VERSION } from "../shared/purchase-terms";
import { sampleResume } from "../docs/pr186/sample-resume";
import { seedSession, sqliteD1, TEST_SESSION } from "./helpers/sqlite-d1";

const SECRET = "whsec_purchase_protection_test";
const agreement = { accepted: true, policyVersion: PURCHASE_TERMS_VERSION };
const now = () => Math.floor(Date.now() / 1000);

function setup() {
  const db = sqliteD1();
  seedSession(db.sqlite);
  db.sqlite.prepare("INSERT INTO resumes (resume_id, user_id, trade, title, intake_json, generated_json, status) VALUES ('resume-1', 'user-1', 'HVAC & Refrigeration', 'HVAC Technician', '{}', ?, 'ready')")
    .run(JSON.stringify(sampleResume));
  db.sqlite.prepare("INSERT INTO resume_orders (order_id, user_id, resume_id, email, plan, amount_total, currency, status) VALUES ('order-1', 'user-1', 'resume-1', 'account@example.com', 'resume_mvp_999', 999, 'usd', 'pending')").run();
  const objects = new Map<string, Uint8Array>();
  for (const format of ["pdf", "docx", "cover_pdf", "cover_docx"]) {
    const bytes = new TextEncoder().encode("purchased-file-" + format);
    const key = "test/" + format;
    objects.set(key, bytes);
    db.sqlite.prepare("INSERT INTO resume_files (file_id, user_id, resume_id, format, object_key, byte_size, sha256) VALUES (?, 'user-1', 'resume-1', ?, ?, ?, ?)")
      .run("file-" + format, format, key, bytes.length, createHash("sha256").update(bytes).digest("hex"));
  }
  const coverJson = new TextEncoder().encode(JSON.stringify({
    date: "October 11, 2026", basics: sampleResume.basics, salutation: "Dear Hiring Manager,", targetJobTitle: "HVAC Technician",
    paragraphs: ["I am applying for the HVAC Technician role.", "My background includes HVAC service and preventive maintenance."],
    closing: "Sincerely,", signature: "Marcus Reed",
    context: { companyName: "Example Employer", hiringManager: "", targetJobTitle: "HVAC Technician", jobPosting: "" },
  }));
  objects.set("test/cover_json", coverJson);
  db.sqlite.prepare("INSERT INTO resume_files (file_id, user_id, resume_id, format, object_key, byte_size, sha256) VALUES ('file-cover_json', 'user-1', 'resume-1', 'cover_json', 'test/cover_json', ?, ?)")
    .run(coverJson.length, createHash("sha256").update(coverJson).digest("hex"));
  const env = {
    DB: db.DB,
    STRIPE_RESUME_WEBHOOK_SECRET: SECRET,
    STRIPE_SECRET_KEY: "sk_test_fixture",
    STRIPE_RESUME_PRICE_ID: "price_fixture",
    BOOKS: {
      async get(key: string) {
        const bytes = objects.get(key);
        return bytes ? { body: new Response(Uint8Array.from(bytes).buffer).body, async text() { return new TextDecoder().decode(bytes); } } : null;
      },
    },
  } as unknown as ResumeBuilderEnv;
  return { ...db, env, objects };
}

async function call(db: ReturnType<typeof setup>, path: string, body?: unknown, extra: { session?: boolean; origin?: string; method?: string; base?: boolean } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json", Origin: extra.origin ?? "https://tradehustl3.com" };
  if (extra.session !== false) headers.Cookie = "tradehustl3_resume_session=" + TEST_SESSION;
  const response = await (extra.base ? baseRoute : handleResumeBuilderRoute)(new Request("https://tradehustl3.com/api/resume-builder/" + path, {
    method: extra.method ?? (body === undefined ? "GET" : "POST"),
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }), db.env);
  assert.ok(response);
  return response;
}

function paidEvent(id = "evt_paid", type = "checkout.session.completed", paymentStatus = "paid") {
  return { id, type, data: { object: {
    id: "cs_order_1", client_reference_id: "order-1", payment_status: paymentStatus,
    amount_total: 999, currency: "usd", payment_intent: "pi_order_1",
    customer_details: { email: "account@example.com" },
    metadata: { order_id: "order-1", resume_id: "resume-1", user_id: "user-1", product: "resume_builder_mvp" },
  } } };
}

function disputeEvent(id = "evt_dispute", object: Record<string, unknown> = {}, type = "charge.dispute.created") {
  return { id, type, data: { object: {
    id: "du_order_1", object: "dispute", charge: "ch_order_1", payment_intent: "pi_order_1",
    amount: 999, currency: "usd", status: "needs_response", ...object,
  } } };
}

async function webhook(db: ReturnType<typeof setup>, event: unknown, forged = false) {
  const payload = JSON.stringify(event);
  const t = String(now());
  const signature = createHmac("sha256", forged ? "incorrect-secret" : SECRET).update(t + "." + payload).digest("hex");
  const response = await handleResumeBuilderRoute(new Request("https://tradehustl3.com/api/resume-builder/stripe/webhook", {
    method: "POST", headers: { "Stripe-Signature": "t=" + t + ",v1=" + signature }, body: payload,
  }), db.env);
  assert.ok(response);
  return response;
}

function count(db: ReturnType<typeof setup>, table: string) {
  return Number((db.sqlite.prepare("SELECT count(*) AS n FROM " + table).get() as { n: number }).n);
}

async function mockStripe<T>(fn: (calls: Array<{ url: string; body: string }>) => Promise<T>, response: unknown = { id: "cs_new", url: "https://checkout.stripe.com/c/pay/cs_new" }, status = 200): Promise<T> {
  const original = globalThis.fetch;
  const calls: Array<{ url: string; body: string }> = [];
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    calls.push({ url: String(url), body: String(init?.body ?? "") });
    return new Response(JSON.stringify(response), { status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  try { return await fn(calls); } finally { globalThis.fetch = original; }
}

test("consent requires an authenticated owner, trusted origin, explicit acceptance and the current version", async () => {
  const db = setup();
  const path = "resumes/resume-1/policy-acceptance";
  assert.equal((await call(db, path, agreement, { session: false })).status, 401);
  assert.equal((await call(db, path, agreement, { origin: "https://untrusted.example" })).status, 403);
  assert.equal((await call(db, "resumes/other-resume/policy-acceptance", agreement)).status, 404);
  assert.equal((await call(db, path)).status, 405);
  for (const body of [{}, { ...agreement, accepted: false }, { ...agreement, accepted: "true" }, { ...agreement, policyVersion: "old" }]) {
    assert.equal((await call(db, path, body)).status, 400);
  }
  assert.equal(count(db, "resume_policy_acceptances"), 0);
});

test("intake acceptance saves the actual version, words and server time without accepting supplied identity or time", async () => {
  const db = setup();
  assert.equal((await call(db, "resumes/resume-1/policy-acceptance", { ...agreement, userId: "attacker", acceptedAt: "2000-01-01" })).status, 200);
  const first = db.sqlite.prepare("SELECT * FROM resume_policy_acceptances").get() as Record<string, unknown>;
  assert.equal(first.user_id, "user-1");
  assert.equal(first.resume_id, "resume-1");
  assert.equal(first.order_id, null);
  assert.equal(first.source, "intake");
  assert.equal(first.policy_version, PURCHASE_TERMS_VERSION);
  assert.equal(first.agreement_text, INTAKE_AGREEMENT);
  assert.equal(first.policy_snapshot_json, PURCHASE_POLICY_SNAPSHOT);
  assert.ok(Math.abs(Date.parse(String(first.accepted_at) + "Z") / 1000 - now()) < 10);
  assert.equal((await call(db, "resumes/resume-1/policy-acceptance", agreement)).status, 200);
  assert.equal(count(db, "resume_policy_acceptances"), 1);
  assert.deepEqual(db.sqlite.prepare("SELECT * FROM resume_policy_acceptances").get(), first);
});

test("checkout cannot call Stripe or create an order without fresh purchase consent, even after intake consent", async () => {
  const db = setup();
  await call(db, "resumes/resume-1/policy-acceptance", agreement);
  await mockStripe(async (calls) => {
    for (const body of [{}, { ...agreement, accepted: false }, { ...agreement, policyVersion: "old" }]) {
      assert.equal((await call(db, "resumes/resume-1/checkout", body, { base: true })).status, 400);
    }
    assert.equal(calls.length, 0);
    assert.equal(count(db, "resume_orders"), 1);
    assert.equal(count(db, "resume_policy_acceptances"), 1);
  });
});

test("checkout ties the saved agreement to its server-created order and repeats the disclosure in Stripe", async () => {
  const db = setup();
  await mockStripe(async (calls) => {
    assert.equal((await call(db, "resumes/resume-1/checkout", agreement, { base: true })).status, 200);
    assert.equal(calls.length, 1);
    const form = new URLSearchParams(calls[0].body);
    const orderId = form.get("client_reference_id");
    const evidence = db.sqlite.prepare("SELECT * FROM resume_policy_acceptances WHERE order_id = ?").get(orderId) as Record<string, unknown>;
    assert.equal(evidence.user_id, "user-1");
    assert.equal(evidence.source, "checkout");
    assert.equal(evidence.policy_version, PURCHASE_TERMS_VERSION);
    assert.equal(evidence.agreement_text, CHECKOUT_AGREEMENT);
    assert.equal(evidence.policy_snapshot_json, PURCHASE_POLICY_SNAPSHOT);
    assert.equal(form.get("metadata[policy_acceptance_id]"), evidence.acceptance_id);
    assert.equal(form.get("payment_intent_data[metadata][policy_acceptance_id]"), evidence.acceptance_id);
    assert.equal(form.get("custom_text[submit][message]"), PURCHASE_DISCLOSURE);
    assert.equal((db.sqlite.prepare("SELECT email FROM resume_orders WHERE order_id = ?").get(orderId) as { email: string }).email, "account@example.com");
  });
});

test("checkout never opens Stripe when the order-and-agreement transaction fails", async () => {
  const db = setup();
  db.env.DB = { ...db.DB, async batch() { throw new Error("unavailable"); } } as unknown as D1Database;
  await mockStripe(async (calls) => {
    assert.equal((await call(db, "resumes/resume-1/checkout", agreement, { base: true })).status, 500);
    assert.equal(calls.length, 0);
    assert.equal(count(db, "resume_policy_acceptances"), 0);
  });
});

test("clean resume and cover-letter PDF/Word deliveries retain the exact file version and distinguish viewing from downloading", async () => {
  const db = setup();
  await webhook(db, paidEvent());
  const paths = [
    ["files/pdf", "pdf", "attachment"], ["files/docx", "docx", "attachment"],
    ["cover-letter/files/pdf", "cover_pdf", "attachment"], ["cover-letter/files/docx", "cover_docx", "attachment"],
    ["files/pdf?view=1", "pdf", "inline"], ["cover-letter/files/pdf?view=1", "cover_pdf", "inline"],
  ];
  for (const [path, format, disposition] of paths) {
    const response = await call(db, "resumes/resume-1/" + path);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "purchased-file-" + format);
    const row = db.sqlite.prepare("SELECT * FROM resume_file_deliveries ORDER BY rowid DESC LIMIT 1").get() as Record<string, unknown>;
    assert.equal(row.user_id, "user-1");
    assert.equal(row.order_id, "order-1");
    assert.equal(row.format, format);
    assert.equal(row.disposition, disposition);
    assert.equal(row.sha256, createHash("sha256").update("purchased-file-" + format).digest("hex"));
    assert.ok(Math.abs(Date.parse(String(row.served_at) + "Z") / 1000 - now()) < 10);
  }
  assert.equal(count(db, "resume_file_deliveries"), 6);
  // A subsequent style/correction overwrite cannot rewrite historical evidence.
  db.sqlite.prepare("UPDATE resume_files SET sha256 = ? WHERE format = 'pdf'").run("f".repeat(64));
  assert.notEqual((db.sqlite.prepare("SELECT sha256 FROM resume_file_deliveries WHERE format = 'pdf' LIMIT 1").get() as { sha256: string }).sha256, "f".repeat(64));
});

test("unpaid previews, unauthorized requests and missing storage objects never become delivery evidence", async () => {
  const db = setup();
  assert.equal((await call(db, "resumes/resume-1/files/pdf")).status, 404);
  assert.equal((await call(db, "resumes/resume-1/files/preview")).status, 200);
  assert.equal((await call(db, "resumes/resume-1/cover-letter/files/pdf?view=1")).status, 200);
  assert.equal((await call(db, "resumes/resume-1/files/pdf", undefined, { session: false })).status, 401);
  await webhook(db, paidEvent());
  assert.equal((await call(db, "resumes/not-owned/files/pdf")).status, 404);
  db.objects.delete("test/pdf");
  assert.equal((await call(db, "resumes/resume-1/files/pdf")).status, 404);
  assert.equal(count(db, "resume_file_deliveries"), 0);
});

test("file delivery fails closed when its evidence cannot be persisted", async () => {
  const db = setup();
  await webhook(db, paidEvent());
  const originalPrepare = db.DB.prepare.bind(db.DB);
  db.env.DB = {
    ...db.DB,
    prepare(sql: string) {
      if (/INSERT INTO resume_file_deliveries/.test(sql)) throw new Error("evidence unavailable");
      return originalPrepare(sql);
    },
  } as unknown as D1Database;
  assert.equal((await call(db, "resumes/resume-1/files/pdf")).status, 500);
  assert.equal((await call(db, "resumes/resume-1/cover-letter/files/pdf")).status, 503);
  assert.equal(count(db, "resume_file_deliveries"), 0);
});

test("a dispute during the storage read prevents the clean response and its delivery record", async () => {
  const db = setup();
  await webhook(db, paidEvent());
  db.env.BOOKS = { async get() {
    await webhook(db, disputeEvent());
    return { body: new Response("clean-file").body };
  } } as unknown as R2Bucket;
  assert.equal((await call(db, "resumes/resume-1/files/pdf")).status, 404);
  assert.equal(count(db, "resume_file_deliveries"), 0);
});

test("an invalid dispute signature cannot save a payment block or revoke access", async () => {
  const db = setup();
  await webhook(db, paidEvent());
  assert.equal((await webhook(db, disputeEvent(), true)).status, 400);
  assert.equal(count(db, "resume_dispute_events"), 0);
  assert.equal((db.sqlite.prepare("SELECT status FROM entitlements").get() as { status: string }).status, "active");
});

test("a signed dispute revokes both documents and all corrections while preserving payment time and delivery evidence", async () => {
  const db = setup();
  await webhook(db, paidEvent());
  await call(db, "resumes/resume-1/files/docx");
  const paidAt = (db.sqlite.prepare("SELECT paid_at FROM resume_orders").get() as { paid_at: string }).paid_at;
  assert.equal((await webhook(db, disputeEvent())).status, 200);
  assert.equal((db.sqlite.prepare("SELECT status FROM resume_orders").get() as { status: string }).status, "disputed");
  assert.equal((db.sqlite.prepare("SELECT status FROM entitlements").get() as { status: string }).status, "revoked");
  assert.equal((db.sqlite.prepare("SELECT paid_at FROM resume_orders").get() as { paid_at: string }).paid_at, paidAt);
  for (const path of ["files/pdf", "files/docx", "cover-letter/files/pdf", "cover-letter/files/docx"]) {
    assert.equal((await call(db, "resumes/resume-1/" + path)).status, 404);
  }
  assert.equal((await call(db, "resumes/resume-1/generate", { correctionRequest: "Fix the title" })).status, 402);
  assert.equal((await call(db, "resumes/resume-1/cover-letter/generate", { correctionRequest: "Fix the title" })).status, 402);
  assert.equal(count(db, "resume_file_deliveries"), 1);
});

test("duplicate and concurrent dispute events are harmless and late paid replays cannot restore access", async () => {
  const db = setup();
  await webhook(db, paidEvent());
  await Promise.all([webhook(db, disputeEvent()), webhook(db, disputeEvent())]);
  await webhook(db, paidEvent("evt_paid_replay"));
  assert.equal(count(db, "resume_dispute_events"), 1);
  assert.equal(count(db, "entitlements"), 1);
  assert.equal((db.sqlite.prepare("SELECT status FROM resume_orders").get() as { status: string }).status, "disputed");
  assert.equal((db.sqlite.prepare("SELECT status FROM entitlements").get() as { status: string }).status, "revoked");
});

test("a dispute before paid checkout stays blocked when the first payment notification arrives", async () => {
  const db = setup();
  assert.equal((await webhook(db, disputeEvent())).status, 200);
  assert.equal(count(db, "entitlements"), 0);
  await webhook(db, paidEvent());
  await webhook(db, paidEvent("evt_paid_again"));
  assert.equal((db.sqlite.prepare("SELECT status FROM resume_orders").get() as { status: string }).status, "disputed");
  assert.equal(count(db, "entitlements"), 0);
  assert.equal(count(db, "review_requests"), 0);
});

test("partial disputes and expanded PaymentIntent objects revoke the related purchase", async () => {
  const db = setup();
  await webhook(db, paidEvent());
  assert.equal((await webhook(db, disputeEvent("evt_partial_dispute", { amount: 500, payment_intent: { id: "pi_order_1" } }))).status, 200);
  assert.equal((db.sqlite.prepare("SELECT status FROM entitlements").get() as { status: string }).status, "revoked");
});

test("unrelated payment disputes cannot revoke the customer's resume purchase", async () => {
  const db = setup();
  await webhook(db, paidEvent());
  await webhook(db, disputeEvent("evt_other_payment", { payment_intent: "pi_other" }));
  assert.equal((db.sqlite.prepare("SELECT status FROM resume_orders").get() as { status: string }).status, "paid");
  assert.equal((db.sqlite.prepare("SELECT status FROM entitlements").get() as { status: string }).status, "active");
});

test("charge-only disputes resolve the PaymentIntent from Stripe before revocation", async () => {
  const db = setup();
  await webhook(db, paidEvent());
  await mockStripe(async (calls) => {
    assert.equal((await webhook(db, disputeEvent("evt_charge_only", { payment_intent: null }))).status, 200);
    assert.equal(calls[0].url, "https://api.stripe.com/v1/charges/ch_order_1");
    assert.equal((db.sqlite.prepare("SELECT status FROM entitlements").get() as { status: string }).status, "revoked");
  }, { payment_intent: "pi_order_1" });
});

test("failed charge lookups remain retryable and do not mark a dispute as processed", async () => {
  const db = setup();
  await webhook(db, paidEvent());
  await mockStripe(async () => {
    assert.equal((await webhook(db, disputeEvent("evt_retry", { payment_intent: null }))).status, 503);
    assert.equal(count(db, "resume_dispute_events"), 0);
    assert.equal((db.sqlite.prepare("SELECT count(*) AS n FROM stripe_events WHERE event_id = 'evt_retry'").get() as { n: number }).n, 0);
  }, { error: "temporarily unavailable" }, 503);
});

test("funds-withdrawn events revoke access even if the dispute-created notification was missed", async () => {
  const db = setup();
  await webhook(db, paidEvent());
  assert.equal((await webhook(db, disputeEvent("evt_funds_withdrawn", {}, "charge.dispute.funds_withdrawn"))).status, 200);
  assert.equal((db.sqlite.prepare("SELECT status FROM entitlements").get() as { status: string }).status, "revoked");
});

test("a full refund followed by a dispute and a paid replay never changes refunded status", async () => {
  const db = setup();
  await webhook(db, paidEvent());
  await webhook(db, { id: "evt_refund", type: "charge.refunded", data: { object: { id: "ch_order_1", amount: 999, amount_refunded: 999, currency: "usd", payment_intent: "pi_order_1" } } });
  await webhook(db, disputeEvent());
  await webhook(db, paidEvent("evt_late_paid"));
  assert.equal((db.sqlite.prepare("SELECT status FROM resume_orders").get() as { status: string }).status, "refunded");
  assert.equal((db.sqlite.prepare("SELECT status FROM entitlements").get() as { status: string }).status, "revoked");
});

test("delayed Stripe payments grant access only after async payment success", async () => {
  const db = setup();
  await webhook(db, paidEvent("evt_unpaid", "checkout.session.completed", "unpaid"));
  assert.equal(count(db, "entitlements"), 0);
  assert.equal((await webhook(db, paidEvent("evt_async_paid", "checkout.session.async_payment_succeeded"))).status, 200);
  assert.equal((db.sqlite.prepare("SELECT status FROM entitlements").get() as { status: string }).status, "active");
});

test("the evidence migration can be applied twice without inventing historical agreements or downloads", () => {
  const db = setup();
  const migration = readFileSync(new URL("../drizzle/0010_resume_purchase_protection.sql", import.meta.url), "utf8");
  db.sqlite.exec(migration);
  db.sqlite.exec(migration);
  assert.equal(count(db, "resume_policy_acceptances"), 0);
  assert.equal(count(db, "resume_file_deliveries"), 0);
  assert.equal(count(db, "resume_dispute_events"), 0);
});
