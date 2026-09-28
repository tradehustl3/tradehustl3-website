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

test("Agent #1 funnel endpoint records an allowlisted behavioral event", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-09-28T12:00:00.000Z") });
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
  // Server receive time is authoritative; the client occurredAt is ignored.
  assert.equal(row.occurred_at, "2026-09-28T12:00:00.000Z");

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

// ---------------------------------------------------------------------------
// Snapshot window boundaries. The clock is frozen so every boundary is exact:
// windowEnd = NOW, windowStart = NOW - 24h. Both bounds are inclusive.
// ---------------------------------------------------------------------------

const NOW = "2026-09-28T12:00:00.000Z";
const WINDOW_START_ISO = "2026-09-27T12:00:00.000Z";
const WINDOW_START_SQLITE = "2026-09-27 12:00:00";

type SnapshotPayload = {
  generatedAt: string;
  windowStart: string;
  windowEnd: string;
  counts: {
    starts: number;
    intakeStarted: number;
    intakeCompleted: number;
    previewsGenerated: number;
    checkoutStarted: number;
    verifiedPurchases: number;
  };
  revenue: { verifiedRevenueCents: number; verifiedRevenueUsd: number };
};

function insertStart(sqlite: ReturnType<typeof sqliteD1>["sqlite"], id: string, occurredAt: string) {
  sqlite.prepare(
    "INSERT INTO funnel_events (event_id, event_name, occurred_at) VALUES (?, 'resume_builder_start', ?)",
  ).run(id, occurredAt);
}

function insertPaidOrder(sqlite: ReturnType<typeof sqliteD1>["sqlite"], id: string, paidAt: string) {
  sqlite.prepare(`
    INSERT INTO resume_orders (order_id, user_id, resume_id, email, plan, amount_total, currency, status, paid_at)
    VALUES (?, 'user-1', 'resume-1', 'buyer@example.com', 'resume_mvp_999', 999, 'usd', 'paid', ?)
  `).run(id, paidAt);
}

async function frozenSnapshot(
  t: { mock: { timers: { enable(options: { apis: ["Date"]; now: number }): void } } },
  DB: D1Database,
): Promise<SnapshotPayload> {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse(NOW) });
  const response = await handleResumeBuilderRoute(snapshotRequest("24h"), {
    DB,
    AGENT1_FUNNEL_SECRET: AGENT1_SECRET,
  });
  assert.ok(response);
  assert.equal(response.status, 200);
  return await response.json() as SnapshotPayload;
}

test("snapshot reports one server-side window used for every query", async (t) => {
  const { DB } = sqliteD1();
  const payload = await frozenSnapshot(t, DB);
  assert.equal(payload.windowEnd, NOW);
  assert.equal(payload.generatedAt, NOW);
  assert.equal(payload.windowStart, WINDOW_START_ISO);
});

test("ISO event exactly at the lower boundary is included", async (t) => {
  const { DB, sqlite } = sqliteD1();
  insertStart(sqlite, "iso-lower", WINDOW_START_ISO);
  assert.equal((await frozenSnapshot(t, DB)).counts.starts, 1);
});

test("SQLite-format event exactly at the lower boundary is included", async (t) => {
  const { DB, sqlite } = sqliteD1();
  insertStart(sqlite, "sqlite-lower", WINDOW_START_SQLITE);
  assert.equal((await frozenSnapshot(t, DB)).counts.starts, 1);
});

test("ISO event one millisecond before the lower boundary is excluded", async (t) => {
  const { DB, sqlite } = sqliteD1();
  insertStart(sqlite, "iso-before", "2026-09-27T11:59:59.999Z");
  insertStart(sqlite, "sqlite-before", "2026-09-27 11:59:59");
  assert.equal((await frozenSnapshot(t, DB)).counts.starts, 0);
});

test("valid ISO event inside the window is included", async (t) => {
  const { DB, sqlite } = sqliteD1();
  insertStart(sqlite, "iso-inside", "2026-09-28T06:00:00.000Z");
  assert.equal((await frozenSnapshot(t, DB)).counts.starts, 1);
});

test("valid SQLite-format event inside the window is included", async (t) => {
  const { DB, sqlite } = sqliteD1();
  insertStart(sqlite, "sqlite-inside", "2026-09-28 06:00:00");
  assert.equal((await frozenSnapshot(t, DB)).counts.starts, 1);
});

test("ISO event exactly at the upper boundary is included", async (t) => {
  const { DB, sqlite } = sqliteD1();
  insertStart(sqlite, "iso-upper", NOW);
  assert.equal((await frozenSnapshot(t, DB)).counts.starts, 1);
});

test("future-dated events after the upper boundary are excluded", async (t) => {
  const { DB, sqlite } = sqliteD1();
  insertStart(sqlite, "iso-future-1ms", "2026-09-28T12:00:00.001Z");
  insertStart(sqlite, "iso-future-5d", "2026-10-03T12:00:00.000Z");
  insertStart(sqlite, "sqlite-future", "2026-09-28 12:00:01");
  assert.equal((await frozenSnapshot(t, DB)).counts.starts, 0);
});

test("unparseable stored timestamps are excluded rather than counted", async (t) => {
  const { DB, sqlite } = sqliteD1();
  insertStart(sqlite, "garbage", "not-a-timestamp");
  assert.equal((await frozenSnapshot(t, DB)).counts.starts, 0);
});

test("mixed ISO and SQLite timestamp formats produce correct totals", async (t) => {
  const { DB, sqlite } = sqliteD1();
  // Included: 5
  insertStart(sqlite, "in-1", WINDOW_START_ISO);
  insertStart(sqlite, "in-2", WINDOW_START_SQLITE);
  insertStart(sqlite, "in-3", "2026-09-28T01:30:00.000Z");
  insertStart(sqlite, "in-4", "2026-09-28 01:30:00");
  insertStart(sqlite, "in-5", NOW);
  // Excluded: 5
  insertStart(sqlite, "out-1", "2026-09-27T06:00:00.000Z");
  insertStart(sqlite, "out-2", "2026-09-27 06:00:00");
  insertStart(sqlite, "out-3", "2026-09-26T12:00:00.000Z");
  insertStart(sqlite, "out-4", "2026-09-28T12:00:00.001Z");
  insertStart(sqlite, "out-5", "2026-09-29 00:00:00");
  sqlite.prepare(
    "INSERT INTO funnel_events (event_id, event_name, occurred_at) VALUES ('in-checkout', 'begin_checkout', '2026-09-28 10:00:00'), ('out-checkout', 'begin_checkout', '2026-09-27T11:00:00.000Z')",
  ).run();

  const payload = await frozenSnapshot(t, DB);
  assert.equal(payload.counts.starts, 5);
  assert.equal(payload.counts.checkoutStarted, 1);
});

test("paid_at uses the identical bounded window as funnel events", async (t) => {
  const { DB, sqlite } = sqliteD1();
  // Included: lower boundary (both formats), inside, upper boundary.
  insertPaidOrder(sqlite, "paid-lower-sqlite", WINDOW_START_SQLITE);
  insertPaidOrder(sqlite, "paid-lower-iso", WINDOW_START_ISO);
  insertPaidOrder(sqlite, "paid-inside", "2026-09-28 08:00:00");
  insertPaidOrder(sqlite, "paid-upper", "2026-09-28 12:00:00");
  // Excluded: before the window, after the window.
  insertPaidOrder(sqlite, "paid-before", "2026-09-27 11:59:59");
  insertPaidOrder(sqlite, "paid-after", "2026-09-28 12:00:01");
  insertPaidOrder(sqlite, "paid-old-iso", "2026-09-27T06:00:00.000Z");

  const payload = await frozenSnapshot(t, DB);
  assert.equal(payload.counts.verifiedPurchases, 4);
  assert.equal(payload.revenue.verifiedRevenueCents, 3996);
  assert.equal(payload.revenue.verifiedRevenueUsd, 39.96);
});

test("regression: a 30-hour-old ISO event passed the old text comparison and is now excluded", async (t) => {
  const { DB, sqlite } = sqliteD1();
  const thirtyHoursOld = "2026-09-27T06:00:00.000Z";
  insertStart(sqlite, "thirty-hours-old", thirtyHoursOld);

  // The previous query compared text: occurred_at >= datetime('now', '-24 hours'),
  // whose result at NOW is "2026-09-27 12:00:00". Prove that comparison wrongly
  // included the 30-hour-old ISO row ('T' sorts after ' ').
  const legacy = sqlite.prepare(
    "SELECT COUNT(*) AS count FROM funnel_events WHERE occurred_at >= ?",
  ).get(WINDOW_START_SQLITE) as { count: number };
  assert.equal(legacy.count, 1);

  assert.equal((await frozenSnapshot(t, DB)).counts.starts, 0);
});

// ---------------------------------------------------------------------------
// Public event writes: the server clock, not the client, decides occurred_at.
// ---------------------------------------------------------------------------

test("client occurredAt cannot backdate or future-date a funnel event", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse(NOW) });
  const { DB, sqlite } = sqliteD1();

  for (const occurredAt of ["2026-09-21T12:00:00.000Z", "2099-01-01T00:00:00.000Z", "not-a-date"]) {
    const response = await handleResumeBuilderRoute(
      post({ eventName: "resume_builder_start", occurredAt }),
      { DB },
    );
    assert.ok(response);
    assert.equal(response.status, 201);
  }

  const rows = sqlite
    .prepare("SELECT occurred_at FROM funnel_events")
    .all() as Array<{ occurred_at: string }>;
  assert.deepEqual(rows.map((row) => row.occurred_at), [NOW, NOW, NOW]);
});
