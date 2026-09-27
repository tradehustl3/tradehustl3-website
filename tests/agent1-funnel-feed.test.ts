import assert from "node:assert/strict";
import test from "node:test";

import { handleResumeBuilderRoute } from "../worker/resume-builder";
import { sqliteD1 } from "./helpers/sqlite-d1";

const ENDPOINT = "https://tradehustl3.com/api/resume-builder/funnel-events";

function post(body: unknown): Request {
  return new Request(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

test("Agent #1 funnel endpoint records an allowlisted behavioral event", async () => {
  const { DB, sqlite } = sqliteD1();

  const response = await handleResumeBuilderRoute(
    post({
      eventName: "resume_builder_start",
      anonymousId: "anon-123",
      sessionId: "session-456",
      path: "/resume-builder",
      metadata: {
        utm_source: "google",
        utm_medium: "cpc",
      },
      occurredAt: "2026-09-27T13:00:00.000Z",
    }),
    { DB },
  );

  assert.ok(response);
  assert.equal(response.status, 201);

  const row = sqlite
    .prepare(`
      SELECT
        event_name,
        anonymous_id,
        session_id,
        path,
        metadata,
        occurred_at
      FROM funnel_events
    `)
    .get() as {
      event_name: string;
      anonymous_id: string | null;
      session_id: string | null;
      path: string | null;
      metadata: string | null;
      occurred_at: string;
    };

  assert.equal(row.event_name, "resume_builder_start");
  assert.equal(row.anonymous_id, "anon-123");
  assert.equal(row.session_id, "session-456");
  assert.equal(row.path, "/resume-builder");
  assert.equal(row.occurred_at, "2026-09-27T13:00:00.000Z");

  assert.deepEqual(JSON.parse(row.metadata || "{}"), {
    utm_source: "google",
    utm_medium: "cpc",
  });
});

test("Agent #1 funnel endpoint accepts resume funnel progression", async () => {
  const { DB, sqlite } = sqliteD1();

  for (const eventName of [
    "resume_intake_started",
    "resume_intake_complete",
    "resume_preview_generated",
    "begin_checkout",
  ]) {
    const response = await handleResumeBuilderRoute(
      post({
        eventName,
        anonymousId: "anon-1",
        sessionId: "session-1",
        resumeId: "resume-1",
        path: "/resume-builder/review",
      }),
      { DB },
    );

    assert.ok(response);
    assert.equal(response.status, 201);
  }

  const row = sqlite
    .prepare("SELECT COUNT(*) AS count FROM funnel_events")
    .get() as { count: number };

  assert.equal(row.count, 4);
});

test("browser purchase cannot become authoritative funnel revenue", async () => {
  const { DB, sqlite } = sqliteD1();

  const response = await handleResumeBuilderRoute(
    post({
      eventName: "purchase",
      resumeId: "resume-1",
      metadata: {
        value: "999999",
      },
    }),
    { DB },
  );

  assert.ok(response);
  assert.equal(response.status, 400);

  const row = sqlite
    .prepare("SELECT COUNT(*) AS count FROM funnel_events")
    .get() as { count: number };

  assert.equal(row.count, 0);
});

test("unknown funnel events are rejected", async () => {
  const { DB } = sqliteD1();

  const response = await handleResumeBuilderRoute(
    post({
      eventName: "made_up_conversion",
    }),
    { DB },
  );

  assert.ok(response);
  assert.equal(response.status, 400);
});

test("PII and arbitrary metadata are stripped server-side", async () => {
  const { DB, sqlite } = sqliteD1();

  const response = await handleResumeBuilderRoute(
    post({
      eventName: "resume_intake_complete",
      resumeId: "resume-123",
      metadata: {
        utm_source: "linkedin",
        trade: "HVAC",
        email: "customer@example.com",
        full_name: "Test Customer",
        phone: "555-555-5555",
        resume_text: "private resume content",
        arbitrary: "do not store",
      },
    }),
    { DB },
  );

  assert.ok(response);
  assert.equal(response.status, 201);

  const row = sqlite
    .prepare("SELECT metadata FROM funnel_events")
    .get() as { metadata: string | null };

  assert.deepEqual(JSON.parse(row.metadata || "{}"), {
    utm_source: "linkedin",
    trade: "HVAC",
  });
});

test("malformed JSON receives 400 and writes nothing", async () => {
  const { DB, sqlite } = sqliteD1();

  const response = await handleResumeBuilderRoute(
    new Request(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: "{this-is-not-json",
    }),
    { DB },
  );

  assert.ok(response);
  assert.equal(response.status, 400);

  const row = sqlite
    .prepare("SELECT COUNT(*) AS count FROM funnel_events")
    .get() as { count: number };

  assert.equal(row.count, 0);
});

test("non-POST funnel requests are rejected", async () => {
  const { DB } = sqliteD1();

  const response = await handleResumeBuilderRoute(
    new Request(ENDPOINT, {
      method: "GET",
    }),
    { DB },
  );

  assert.ok(response);
  assert.equal(response.status, 405);
});

const SNAPSHOT_ENDPOINT =
  "https://tradehustl3.com/api/resume-builder/internal/agent1/funnel-snapshot";

const AGENT1_SECRET =
  "agent1-test-secret-abcdefghijklmnopqrstuvwxyz-123456";

function snapshotRequest(window = "7d", secret = AGENT1_SECRET): Request {
  return new Request(`${SNAPSHOT_ENDPOINT}?window=${window}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  });
}

test("Agent #1 snapshot fails closed when its secret is not configured", async () => {
  const { DB } = sqliteD1();

  const response = await handleResumeBuilderRoute(
    snapshotRequest(),
    { DB },
  );

  assert.ok(response);
  assert.equal(response.status, 503);
});

test("Agent #1 snapshot rejects an invalid bearer secret", async () => {
  const { DB } = sqliteD1();

  const response = await handleResumeBuilderRoute(
    snapshotRequest("7d", "wrong-secret"),
    {
      DB,
      AGENT1_FUNNEL_SECRET: AGENT1_SECRET,
    },
  );

  assert.ok(response);
  assert.equal(response.status, 401);
});

test("Agent #1 snapshot rejects unsupported windows", async () => {
  const { DB } = sqliteD1();

  const response = await handleResumeBuilderRoute(
    snapshotRequest("30d"),
    {
      DB,
      AGENT1_FUNNEL_SECRET: AGENT1_SECRET,
    },
  );

  assert.ok(response);
  assert.equal(response.status, 400);
});

test("Agent #1 snapshot calculates funnel counts, rates, purchases, and revenue", async () => {
  const { DB, sqlite } = sqliteD1();

  const insertEvent = sqlite.prepare(`
    INSERT INTO funnel_events (
      event_id,
      event_name,
      occurred_at
    ) VALUES (?, ?, datetime('now', '-1 hour'))
  `);

  let id = 0;

  const add = (eventName: string, count: number) => {
    for (let index = 0; index < count; index += 1) {
      id += 1;
      insertEvent.run(`event-${id}`, eventName);
    }
  };

  add("resume_builder_start", 100);
  add("resume_intake_started", 80);
  add("resume_intake_complete", 50);
  add("resume_preview_generated", 40);
  add("begin_checkout", 10);

  sqlite.prepare(`
    INSERT INTO resume_orders (
      order_id,
      user_id,
      resume_id,
      email,
      plan,
      amount_total,
      currency,
      status,
      paid_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'paid', datetime('now', '-1 hour'))
  `).run(
    "order-1",
    "user-1",
    "resume-1",
    "one@example.com",
    "resume_mvp_999",
    999,
    "usd",
  );

  sqlite.prepare(`
    INSERT INTO resume_orders (
      order_id,
      user_id,
      resume_id,
      email,
      plan,
      amount_total,
      currency,
      status,
      paid_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'paid', datetime('now', '-2 hour'))
  `).run(
    "order-2",
    "user-2",
    "resume-2",
    "two@example.com",
    "resume_mvp_999",
    999,
    "usd",
  );

  const response = await handleResumeBuilderRoute(
    snapshotRequest("7d"),
    {
      DB,
      AGENT1_FUNNEL_SECRET: AGENT1_SECRET,
    },
  );

  assert.ok(response);
  assert.equal(response.status, 200);

  const payload = await response.json() as {
    counts: {
      starts: number;
      intakeStarted: number;
      intakeCompleted: number;
      previewsGenerated: number;
      checkoutStarted: number;
      verifiedPurchases: number;
    };
    conversionRates: {
      startToIntake: number | null;
      intakeToComplete: number | null;
      completeToPreview: number | null;
      previewToCheckout: number | null;
      checkoutToPurchase: number | null;
      overall: number | null;
    };
    revenue: {
      verifiedRevenueCents: number;
      verifiedRevenueUsd: number;
    };
  };

  assert.deepEqual(payload.counts, {
    starts: 100,
    intakeStarted: 80,
    intakeCompleted: 50,
    previewsGenerated: 40,
    checkoutStarted: 10,
    verifiedPurchases: 2,
  });

  assert.deepEqual(payload.conversionRates, {
    startToIntake: 80,
    intakeToComplete: 62.5,
    completeToPreview: 80,
    previewToCheckout: 25,
    checkoutToPurchase: 20,
    overall: 2,
  });

  assert.equal(payload.revenue.verifiedRevenueCents, 1998);
  assert.equal(payload.revenue.verifiedRevenueUsd, 19.98);
});

test("Agent #1 snapshot excludes data outside the requested 24h window", async () => {
  const { DB, sqlite } = sqliteD1();

  sqlite.prepare(`
    INSERT INTO funnel_events (
      event_id,
      event_name,
      occurred_at
    ) VALUES
      ('recent-start', 'resume_builder_start', datetime('now', '-1 hour')),
      ('old-start', 'resume_builder_start', datetime('now', '-2 day'))
  `).run();

  const response = await handleResumeBuilderRoute(
    snapshotRequest("24h"),
    {
      DB,
      AGENT1_FUNNEL_SECRET: AGENT1_SECRET,
    },
  );

  assert.ok(response);
  assert.equal(response.status, 200);

  const payload = await response.json() as {
    counts: { starts: number };
  };

  assert.equal(payload.counts.starts, 1);
});

test("browser funnel telemetry cannot manufacture Agent #1 purchase revenue", async () => {
  const { DB } = sqliteD1();

  const fakePurchase = await handleResumeBuilderRoute(
    post({
      eventName: "purchase",
      resumeId: "resume-fake",
      metadata: {
        value: "999999",
        currency: "USD",
      },
    }),
    { DB },
  );

  assert.ok(fakePurchase);
  assert.equal(fakePurchase.status, 400);

  const snapshot = await handleResumeBuilderRoute(
    snapshotRequest("7d"),
    {
      DB,
      AGENT1_FUNNEL_SECRET: AGENT1_SECRET,
    },
  );

  assert.ok(snapshot);
  assert.equal(snapshot.status, 200);

  const payload = await snapshot.json() as {
    counts: { verifiedPurchases: number };
    revenue: {
      verifiedRevenueCents: number;
      verifiedRevenueUsd: number;
    };
  };

  assert.equal(payload.counts.verifiedPurchases, 0);
  assert.equal(payload.revenue.verifiedRevenueCents, 0);
  assert.equal(payload.revenue.verifiedRevenueUsd, 0);
});
