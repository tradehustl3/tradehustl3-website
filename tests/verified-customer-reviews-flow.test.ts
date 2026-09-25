import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { handleResumeBuilderRoute, runReviewRequestEmails } from "../worker/resume-builder";
import { seedSession, sqliteD1, TEST_SESSION } from "./helpers/sqlite-d1";

// End-to-end verified-review trust chain against real SQLite with the repo's
// migrations applied: paid order -> delayed invitation -> private token ->
// pending review -> consent-gated moderation -> public feed that drops refunds.

const WEBHOOK_SECRET = "whsec_test_reviews";
const ADMIN_SESSION = "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC";
const DAY = 24 * 60 * 60;
const now = () => Math.floor(Date.now() / 1000);

type Db = ReturnType<typeof sqliteD1>;

function setup(): Db & { env: Record<string, unknown> } {
  const db = sqliteD1();
  seedSession(db.sqlite);
  db.sqlite.prepare("INSERT INTO users (user_id, email, full_name) VALUES ('admin-1', 'founder@tradehustl3.com', 'Founder')").run();
  db.sqlite.prepare("INSERT INTO sessions (session_hash, user_id, expires_at) VALUES (?, 'admin-1', ?)")
    .run(createHash("sha256").update(ADMIN_SESSION).digest("hex"), now() + 3600);
  db.sqlite.prepare("INSERT INTO resumes (resume_id, user_id, trade, title, intake_json, status) VALUES ('resume-1', 'user-1', 'HVAC & Refrigeration', 'HVAC Technician', '{}', 'ready')").run();
  db.sqlite.prepare("INSERT INTO resume_orders (order_id, user_id, resume_id, email, plan, amount_total, currency, status) VALUES ('order-1', 'user-1', 'resume-1', 'account@example.com', 'resume_mvp_999', 999, 'usd', 'pending')").run();
  return { ...db, env: { DB: db.DB, STRIPE_RESUME_WEBHOOK_SECRET: WEBHOOK_SECRET, BREVO_API_KEY: "brevo-test" } };
}

function checkoutEvent(eventId: string) {
  return JSON.stringify({
    id: eventId,
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_${eventId}`,
        client_reference_id: "order-1",
        payment_status: "paid",
        amount_total: 999,
        currency: "usd",
        payment_intent: "pi_test_1",
        customer_details: { email: "account@example.com" },
        metadata: { order_id: "order-1", resume_id: "resume-1", user_id: "user-1", product: "resume_builder_mvp" },
      },
    },
  });
}

function handled(response: Response | null): Response {
  assert.ok(response, "route is handled");
  return response;
}

async function webhook(env: Record<string, unknown>, payload: string): Promise<Response> {
  const t = String(now());
  const signature = createHmac("sha256", WEBHOOK_SECRET).update(`${t}.${payload}`).digest("hex");
  return handled(await handleResumeBuilderRoute(new Request("https://tradehustl3.com/api/resume-builder/stripe/webhook", {
    method: "POST",
    headers: { "Stripe-Signature": `t=${t},v1=${signature}`, "Content-Type": "application/json" },
    body: payload,
  }), env as never));
}

async function call(env: Record<string, unknown>, path: string, init: { method?: string; body?: unknown; session?: string | null; origin?: string | null } = {}): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (init.origin !== null) headers.Origin = init.origin ?? "https://tradehustl3.com";
  if (init.session !== null && init.session !== undefined) headers.Cookie = `tradehustl3_resume_session=${init.session}`;
  return handled(await handleResumeBuilderRoute(new Request(`https://tradehustl3.com/api/resume-builder/${path}`, {
    method: init.method ?? "GET",
    headers,
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  }), env as never));
}

async function withBrevo<T>(fn: (sent: string[]) => Promise<T>, ok = true): Promise<T> {
  const originalFetch = globalThis.fetch;
  const sent: string[] = [];
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    sent.push(String(init?.body));
    return new Response("{}", { status: ok ? 201 : 500 });
  }) as typeof fetch;
  try {
    return await fn(sent);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function tokenFrom(emailBody: string): string {
  const match = emailBody.match(/\/reviews\?token=([A-Za-z0-9_-]{43})/);
  assert.ok(match, "review email contains a private token link");
  return match[1];
}

async function paidAndInvited(db: ReturnType<typeof setup>): Promise<string> {
  assert.equal((await webhook(db.env, checkoutEvent("evt_1"))).status, 200);
  db.sqlite.prepare("UPDATE review_requests SET scheduled_at = ?").run(now() - 1);
  return withBrevo(async (sent) => {
    await runReviewRequestEmails(db.env as never);
    assert.equal(sent.length, 1);
    return tokenFrom(sent[0]);
  });
}

const review = (token: string, extra: Record<string, unknown> = {}) => ({
  token,
  name: "Jordan Alvarez",
  rating: 4,
  reviewText: "I got a few calls after updating my resume with the builder.",
  resultText: "A few callbacks so far.",
  recommend: true,
  consentPublish: true,
  consentResumeExample: false,
  ...extra,
});

test("paid checkout queues exactly one review invitation, scheduled three days out", async () => {
  const db = setup();
  assert.equal((await webhook(db.env, checkoutEvent("evt_1"))).status, 200);
  assert.equal((await webhook(db.env, checkoutEvent("evt_2"))).status, 200);

  const order = db.sqlite.prepare("SELECT status FROM resume_orders WHERE order_id = 'order-1'").get() as { status: string };
  assert.equal(order.status, "paid");
  const entitlements = db.sqlite.prepare("SELECT count(*) AS n FROM entitlements WHERE source_order_id = 'order-1'").get() as { n: number };
  assert.equal(entitlements.n, 1);

  const rows = db.sqlite.prepare("SELECT scheduled_at, sent_at, token_hash FROM review_requests WHERE order_id = 'order-1'").all() as Array<{ scheduled_at: number; sent_at: string | null; token_hash: string | null }>;
  assert.equal(rows.length, 1);
  assert.ok(Math.abs(rows[0].scheduled_at - (now() + 3 * DAY)) < 60);
  assert.equal(rows[0].sent_at, null);
  assert.equal(rows[0].token_hash, null);

  // Not due yet: nothing is emailed.
  await withBrevo(async (sent) => {
    await runReviewRequestEmails(db.env as never);
    assert.equal(sent.length, 0);
  });
});

test("scheduler skips refunded orders, sends once, and never re-sends", async () => {
  const db = setup();
  await webhook(db.env, checkoutEvent("evt_1"));
  db.sqlite.prepare("UPDATE review_requests SET scheduled_at = ?").run(now() - 1);

  db.sqlite.prepare("UPDATE resume_orders SET status = 'refunded'").run();
  await withBrevo(async (sent) => {
    await runReviewRequestEmails(db.env as never);
    assert.equal(sent.length, 0);
  });

  db.sqlite.prepare("UPDATE resume_orders SET status = 'paid'").run();
  await withBrevo(async (sent) => {
    await runReviewRequestEmails(db.env as never);
    await runReviewRequestEmails(db.env as never);
    assert.equal(sent.length, 1);
    assert.match(sent[0], /Positive, negative, and mixed feedback are all welcome/);
    assert.match(sent[0], /No discount, payment, reward, or other incentive/);
  });

  const row = db.sqlite.prepare("SELECT sent_at, token_hash FROM review_requests").get() as { sent_at: string | null; token_hash: string | null };
  assert.ok(row.sent_at);
  assert.match(String(row.token_hash), /^[0-9a-f]{64}$/);
});

test("failed Brevo delivery releases the invitation for a later retry", async () => {
  const db = setup();
  await webhook(db.env, checkoutEvent("evt_1"));
  db.sqlite.prepare("UPDATE review_requests SET scheduled_at = ?").run(now() - 1);
  await withBrevo(async (sent) => {
    await runReviewRequestEmails(db.env as never);
    assert.equal(sent.length, 1);
  }, false);
  const row = db.sqlite.prepare("SELECT sent_at, token_hash FROM review_requests").get() as { sent_at: string | null; token_hash: string | null };
  assert.equal(row.sent_at, null);
  assert.equal(row.token_hash, null);
});

test("review tokens are hashed, single use, expiring, and require a paid order", async () => {
  const db = setup();
  const token = await paidAndInvited(db);
  const stored = db.sqlite.prepare("SELECT token_hash FROM review_requests").get() as { token_hash: string };
  assert.notEqual(stored.token_hash, token);
  assert.equal(stored.token_hash, createHash("sha256").update(token).digest("hex"));

  const valid = await call(db.env, `reviews/request?token=${token}`);
  assert.equal(valid.status, 200);
  assert.deepEqual(((await valid.json()) as { reviewRequest: unknown }).reviewRequest, { trade: "HVAC & Refrigeration", defaultName: "Account Name", verifiedPurchase: true });
  assert.equal((await call(db.env, "reviews/request")).status, 404);
  const modified = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
  const rejected = await call(db.env, `reviews/request?token=${modified}`);
  assert.equal(rejected.status, 404);
  assert.equal(((await rejected.json()) as { reviewRequest?: unknown }).reviewRequest, undefined, "no review data exposed");

  db.sqlite.prepare("UPDATE resume_orders SET status = 'refunded'").run();
  assert.equal((await call(db.env, `reviews/request?token=${token}`)).status, 404);
  db.sqlite.prepare("UPDATE resume_orders SET status = 'paid'").run();

  db.sqlite.prepare("UPDATE review_requests SET sent_at = datetime('now', '-31 days')").run();
  assert.equal((await call(db.env, `reviews/request?token=${token}`)).status, 404);
  db.sqlite.prepare("UPDATE review_requests SET sent_at = datetime('now', '-29 days')").run();
  assert.equal((await call(db.env, `reviews/request?token=${token}`)).status, 200);

  assert.equal((await call(db.env, "reviews/submit", { method: "POST", body: review(token) })).status, 200);
  assert.equal((await call(db.env, `reviews/request?token=${token}`)).status, 404);
  assert.equal((await call(db.env, "reviews/submit", { method: "POST", body: review(token) })).status, 404);
});

test("submission validates input and requires a same-origin request", async () => {
  const db = setup();
  const token = await paidAndInvited(db);
  const submit = (body: unknown, origin?: string | null) => call(db.env, "reviews/submit", { method: "POST", body, origin });

  for (const rating of [0, 6, 2.5, "five"]) assert.equal((await submit(review(token, { rating }))).status, 400);
  assert.equal((await submit(review(token, { reviewText: "x".repeat(19) }))).status, 400);
  assert.equal((await submit(review(token, { reviewText: "x".repeat(1201) }))).status, 400);
  assert.equal((await submit(review(token, { resultText: "x".repeat(501) }))).status, 400);
  assert.equal((await submit(review(token, { name: "x".repeat(121) }))).status, 400);
  assert.equal((await submit(review(token), "https://evil.example")).status, 403);
  assert.equal((await submit(review(token), null)).status, 403);

  assert.equal((await submit(review(token, { reviewText: "x".repeat(1200) }))).status, 200);
});

test("private feedback is saved as pending and can never be approved", async () => {
  const db = setup();
  const token = await paidAndInvited(db);
  const response = await call(db.env, "reviews/submit", { method: "POST", body: review(token, { consentPublish: false, consentResumeExample: true }) });
  assert.equal(response.status, 200);
  const row = db.sqlite.prepare("SELECT review_id, status, consent_publish, consent_resume_example FROM customer_reviews").get() as Record<string, unknown>;
  assert.equal(row.status, "pending");
  assert.equal(row.consent_publish, 0);
  assert.equal(row.consent_resume_example, 1);

  const approve = await call(db.env, "reviews/admin", { method: "PATCH", session: ADMIN_SESSION, body: { reviewId: row.review_id, status: "approved" } });
  assert.equal(approve.status, 409);
  assert.match(((await approve.json()) as { message: string }).message, /did not give permission to publish/);
  assert.equal((db.sqlite.prepare("SELECT status FROM customer_reviews").get() as { status: string }).status, "pending");
});

test("moderation requires an authenticated review admin", async () => {
  const db = setup();
  assert.equal((await call(db.env, "reviews/admin")).status, 401);
  assert.equal((await call(db.env, "reviews/admin", { session: TEST_SESSION })).status, 403);
  assert.equal((await call(db.env, "reviews/admin", { method: "PATCH", session: TEST_SESSION, body: { reviewId: "x", status: "approved" } })).status, 403);
  assert.equal((await call(db.env, "reviews/admin", { session: ADMIN_SESSION })).status, 200);

  const configured = { ...db.env, REVIEW_ADMIN_EMAILS: "ops@example.com, account@example.com" };
  assert.equal((await call(configured, "reviews/admin", { session: TEST_SESSION })).status, 200);
});

test("approved consented reviews appear publicly with safe fields and disappear after refund", async () => {
  const db = setup();
  const token = await paidAndInvited(db);
  await call(db.env, "reviews/submit", { method: "POST", body: review(token) });

  const publicReviews = async () => (await (await call(db.env, "reviews/public")).json()) as { reviews: Array<Record<string, unknown>> };
  assert.equal((await publicReviews()).reviews.length, 0, "pending reviews are not public");

  const { review_id: reviewId } = db.sqlite.prepare("SELECT review_id FROM customer_reviews").get() as { review_id: string };
  assert.equal((await call(db.env, "reviews/admin", { method: "PATCH", session: ADMIN_SESSION, body: { reviewId, status: "approved" } })).status, 200);

  const response = await call(db.env, "reviews/public");
  const text = await response.text();
  for (const secret of ["email", "user_id", "resume_id", "order_id", "token", "stripe", "account@example.com"]) {
    assert.doesNotMatch(text, new RegExp(secret, "i"));
  }
  const { reviews } = JSON.parse(text) as { reviews: Array<Record<string, unknown>> };
  assert.equal(reviews.length, 1);
  assert.deepEqual(Object.keys(reviews[0]).sort(), ["id", "name", "rating", "result", "review", "trade", "verifiedCustomer"]);
  assert.equal(reviews[0].name, "Jordan A.");
  assert.equal(reviews[0].review, "I got a few calls after updating my resume with the builder.", "wording is shown as submitted");
  assert.equal(reviews[0].verifiedCustomer, true);

  db.sqlite.prepare("UPDATE resume_orders SET status = 'refunded'").run();
  assert.equal((await publicReviews()).reviews.length, 0);
  assert.equal((db.sqlite.prepare("SELECT status FROM customer_reviews").get() as { status: string }).status, "approved", "the review record is kept, just no longer public");
});

const countRequests = (db: Db, orderId?: string) => (orderId
  ? db.sqlite.prepare("SELECT count(*) AS n FROM review_requests WHERE order_id = ?").get(orderId)
  : db.sqlite.prepare("SELECT count(*) AS n FROM review_requests").get()) as { n: number };

function insertOrder(db: Db, orderId: string, status: string, paidAgo: string | null) {
  db.sqlite.prepare(`INSERT INTO resume_orders (order_id, user_id, resume_id, email, plan, amount_total, currency, status, paid_at)
    VALUES (?, 'user-1', 'resume-1', 'account@example.com', 'resume_mvp_999', 999, 'usd', ?, ${paidAgo ? "datetime('now', ?)" : "NULL"})`)
    .run(...(paidAgo ? [orderId, status, paidAgo] : [orderId, status]));
}

test("0006 migration seeds paid orders at paid_at + 3 days, skips refunds, and is harmless to re-run", () => {
  const db = setup();
  insertOrder(db, "ORDER_OLD", "paid", "-7 days");
  insertOrder(db, "ORDER_RECENT", "paid", "-1 days");
  insertOrder(db, "ORDER_REFUNDED", "refunded", "-7 days");

  const migration = readFileSync(new URL("../drizzle/0006_verified_customer_reviews.sql", import.meta.url), "utf8");
  db.sqlite.exec(migration);
  const afterFirst = countRequests(db).n;
  db.sqlite.exec(migration);
  assert.equal(countRequests(db).n, afterFirst, "second run adds nothing");

  assert.equal(countRequests(db, "ORDER_OLD").n, 1);
  assert.equal(countRequests(db, "ORDER_RECENT").n, 1);
  assert.equal(countRequests(db, "ORDER_REFUNDED").n, 0);
  assert.equal(countRequests(db, "order-1").n, 0, "unpaid orders are not seeded");

  const scheduled = (orderId: string) => (db.sqlite.prepare("SELECT scheduled_at FROM review_requests WHERE order_id = ?").get(orderId) as { scheduled_at: number }).scheduled_at;
  assert.ok(scheduled("ORDER_OLD") <= now() + 5, "orders paid more than 3 days ago are eligible now");
  const recentPaidAt = now() - DAY;
  assert.ok(Math.abs(scheduled("ORDER_RECENT") - (recentPaidAt + 3 * DAY)) < 60, "recent orders wait until paid_at + 3 days");
  assert.ok(scheduled("ORDER_RECENT") > now() + DAY, "recent orders are not immediately eligible");
});

test("public review reads never seed review invitations", async () => {
  const db = setup();
  db.sqlite.prepare("UPDATE resume_orders SET status = 'paid', paid_at = datetime('now', '-10 days')").run();
  assert.equal(countRequests(db, "order-1").n, 0, "no review_request exists for the paid order");

  for (let i = 0; i < 10; i += 1) {
    const response = await call(db.env, "reviews/public");
    assert.equal(response.status, 200);
    assert.equal(countRequests(db, "order-1").n, 0, `public read ${i + 1} created no invitation`);
  }
  // Other read paths that run the schema bootstrap must not seed either.
  await call(db.env, "reviews/request?token=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
  await call(db.env, "reviews/admin", { session: ADMIN_SESSION });
  await withBrevo(async (sent) => {
    await runReviewRequestEmails(db.env as never);
    assert.equal(sent.length, 0, "the scheduler never emails an order that has no invitation");
  });
  assert.equal(countRequests(db).n, 0);

  // Only the verified paid-checkout path creates the invitation, three days out.
  db.sqlite.prepare("UPDATE resume_orders SET status = 'pending', paid_at = NULL").run();
  const paymentTime = now();
  assert.equal((await webhook(db.env, checkoutEvent("evt_paid"))).status, 200);
  assert.equal(countRequests(db, "order-1").n, 1);
  const { scheduled_at: scheduledAt } = db.sqlite.prepare("SELECT scheduled_at FROM review_requests WHERE order_id = 'order-1'").get() as { scheduled_at: number };
  assert.ok(scheduledAt >= paymentTime + 3 * DAY - 5, "scheduled no sooner than payment + 259200 seconds");
  assert.ok(scheduledAt <= now() + 3 * DAY + 5);
  for (let i = 0; i < 10; i += 1) await call(db.env, "reviews/public");
  assert.equal(countRequests(db, "order-1").n, 1, "further reads never add a second invitation");
});

test("schema bootstrap on a database without the review tables creates them and seeds nothing", async () => {
  const db = setup();
  db.sqlite.prepare("UPDATE resume_orders SET status = 'paid', paid_at = datetime('now', '-10 days')").run();
  // Simulate the Worker deploying before migration 0006 has been applied.
  db.sqlite.exec("DROP TABLE customer_reviews; DROP TABLE review_requests;");

  for (let i = 0; i < 3; i += 1) assert.equal((await call(db.env, "reviews/public")).status, 200);
  const tables = db.sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('review_requests', 'customer_reviews') ORDER BY name").all() as Array<{ name: string }>;
  assert.deepEqual(tables.map((row) => row.name), ["customer_reviews", "review_requests"]);
  assert.equal(countRequests(db).n, 0);

  // The bootstrap DDL matches the migration: re-applying 0006 on top is harmless.
  const migration = readFileSync(new URL("../drizzle/0006_verified_customer_reviews.sql", import.meta.url), "utf8");
  db.sqlite.exec(migration);
  assert.equal(countRequests(db, "order-1").n, 1, "only the migration seeds the existing paid order");
});

test("overlapping scheduler runs send one email", async () => {
  const db = setup();
  await webhook(db.env, checkoutEvent("evt_1"));
  db.sqlite.prepare("UPDATE review_requests SET scheduled_at = ?").run(now() - 1);
  await withBrevo(async (sent) => {
    await Promise.all([runReviewRequestEmails(db.env as never), runReviewRequestEmails(db.env as never)]);
    assert.equal(sent.length, 1);
  });
});

test("review email goes to the order email with the right subject, link, and honest-feedback copy", async () => {
  const db = setup();
  await webhook(db.env, checkoutEvent("evt_1"));
  db.sqlite.prepare("UPDATE review_requests SET scheduled_at = ?").run(now() - 1);
  await withBrevo(async (sent) => {
    await runReviewRequestEmails(db.env as never);
    assert.equal(sent.length, 1);
    const message = JSON.parse(sent[0]) as { to: Array<{ email: string }>; subject: string; htmlContent: string };
    assert.deepEqual(message.to, [{ email: "account@example.com" }]);
    assert.equal(message.subject, "How did TRADE HUSTL3 work for you?");
    assert.match(message.htmlContent, /href="https:\/\/tradehustl3\.com\/reviews\?token=[A-Za-z0-9_-]{43}"/);
    assert.match(message.htmlContent, /honest feedback/);
    assert.doesNotMatch(message.htmlContent, /5-star|five-star/i);
  });
});

test("a failing review queue never breaks payment fulfillment", async () => {
  const db = setup();
  const failingDB = {
    prepare(sql: string) {
      if (/review_requests|customer_reviews/i.test(sql)) throw new Error("review storage unavailable");
      return db.DB.prepare(sql);
    },
    batch: (statements: unknown[]) => db.DB.batch(statements as never),
  } as unknown as D1Database;
  const response = await webhook({ ...db.env, DB: failingDB }, checkoutEvent("evt_1"));
  assert.equal(response.status, 200);
  assert.equal((db.sqlite.prepare("SELECT status FROM resume_orders WHERE order_id = 'order-1'").get() as { status: string }).status, "paid");
  assert.equal((db.sqlite.prepare("SELECT count(*) AS n FROM entitlements WHERE source_order_id = 'order-1' AND status = 'active'").get() as { n: number }).n, 1);
  assert.equal(countRequests(db).n, 0);
});

test("valid boundary submissions are accepted", async () => {
  for (const rating of [1, 2, 3, 4, 5]) {
    const db = setup();
    const token = await paidAndInvited(db);
    const reviewText = rating === 1 ? "x".repeat(20) : "Honest feedback about the builder.";
    const response = await call(db.env, "reviews/submit", { method: "POST", body: review(token, { rating, reviewText, name: "n".repeat(120), resultText: "r".repeat(500) }) });
    assert.equal(response.status, 200, `rating ${rating}`);
    assert.equal((db.sqlite.prepare("SELECT status FROM customer_reviews").get() as { status: string }).status, "pending");
  }
});
