import assert from "node:assert/strict";
import test from "node:test";

import { handleResumeBuilderRoute } from "../worker/resume-builder";
import { ga4DeliveryBreakdown, recordGa4DeliveryOutcome } from "../worker/resume-builder-base";
import { classifyGa4FunnelDelivery } from "../worker/ga4-measurement-protocol";
import { sqliteD1 } from "./helpers/sqlite-d1";

const API_SECRET = "mp-test-secret";
const GA_CLIENT = "_ga=GA1.1.1234567890.1700000000";
const GA_SESSION = "_ga_PHLN0C7BWF=GS2.1.s1760650000$o4$g1$t1760650100$j0$l0$h0";
const GA_COOKIES = `${GA_CLIENT}; ${GA_SESSION}`;
const AGENT1_SECRET = "agent1-test-secret-abcdefghijklmnopqrstuvwxyz-123456";

function funnelPost(body: Record<string, unknown>, headers: Record<string, string> = {}): Request {
  return new Request("https://tradehustl3.com/api/resume-builder/funnel-events", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function bare(headers: Record<string, string> = {}): Request {
  return new Request("https://tradehustl3.com/", { headers });
}

function captureFetch() {
  const calls: string[] = [];
  const fetchImpl = (async (url: string | URL | Request) => {
    calls.push(String(url));
    return new Response(null, { status: 204 });
  }) as typeof fetch;
  return { calls, fetchImpl };
}

function context() {
  const pending: Promise<unknown>[] = [];
  return { ctx: { waitUntil: (promise: Promise<unknown>) => { pending.push(promise); } }, settle: () => Promise.all(pending) };
}

type OutcomeRow = { event_name: string; outcome: string };

test("classification follows the existing forwarding rules, in order", () => {
  const config = { GA4_MEASUREMENT_PROTOCOL_API_SECRET: API_SECRET };
  const cases: Array<[string, Request, unknown, string]> = [
    ["consent missing", bare({ Cookie: GA_COOKIES }), undefined, "no_consent"],
    ["consent false", bare({ Cookie: GA_COOKIES }), false, "no_consent"],
    ["GPC wins over cookies", bare({ Cookie: GA_COOKIES, "Sec-GPC": "1" }), true, "no_consent"],
    ["no GA cookies at all", bare(), true, "no_ga_cookie"],
    ["session cookie but no client cookie", bare({ Cookie: GA_SESSION }), true, "sent"],
    ["client cookie, no session", bare({ Cookie: GA_CLIENT }), true, "no_ga_session"],
    ["client cookie, broken session", bare({ Cookie: `${GA_CLIENT}; _ga_PHLN0C7BWF=GS2.1.xbroken` }), true, "no_ga_session"],
    ["everything present", bare({ Cookie: GA_COOKIES }), true, "sent"],
  ];
  for (const [label, request, consent, expected] of cases) {
    const result = classifyGa4FunnelDelivery(request, consent, "anon-1", config);
    assert.equal(result.outcome, expected, label);
    assert.equal(result.identity !== null, expected === "sent", `${label}: identity only when sent`);
  }
});

test("a missing API secret is classified as not_configured, after the cookie checks", () => {
  const previous = process.env.GA4_MEASUREMENT_PROTOCOL_API_SECRET;
  delete process.env.GA4_MEASUREMENT_PROTOCOL_API_SECRET;
  try {
    assert.equal(classifyGa4FunnelDelivery(bare({ Cookie: GA_COOKIES }), true, "anon-1", {}).outcome, "not_configured");
    assert.equal(classifyGa4FunnelDelivery(bare(), true, "anon-1", {}).outcome, "no_ga_cookie");
  } finally {
    if (previous !== undefined) process.env.GA4_MEASUREMENT_PROTOCOL_API_SECRET = previous;
  }
});

test("each GA4-eligible funnel event records exactly one outcome and GA4 delivery is unchanged", async () => {
  const cases: Array<[Record<string, unknown>, Record<string, string>, string, number]> = [
    [{ analyticsConsent: true }, { Cookie: GA_COOKIES }, "sent", 1],
    [{ analyticsConsent: true }, {}, "no_ga_cookie", 0],
    [{ analyticsConsent: true }, { Cookie: GA_CLIENT }, "no_ga_session", 0],
    [{ analyticsConsent: false }, { Cookie: GA_COOKIES }, "no_consent", 0],
  ];
  for (const [body, headers, expected, sends] of cases) {
    const { DB, sqlite } = sqliteD1();
    const { calls, fetchImpl } = captureFetch();
    const { ctx, settle } = context();
    const response = await handleResumeBuilderRoute(
      funnelPost({ eventName: "resume_builder_start", anonymousId: "anon-1", ...body }, headers),
      { DB, GA4_MEASUREMENT_PROTOCOL_API_SECRET: API_SECRET },
      { recoveryContext: ctx, ga4Fetch: fetchImpl },
    );
    await settle();
    assert.equal(response?.status, 201, expected);
    assert.equal(calls.length, sends, `${expected}: GA4 sends`);
    const rows = sqlite.prepare("SELECT event_name, outcome FROM ga4_delivery_outcomes").all() as OutcomeRow[];
    assert.deepEqual(rows.map((row) => ({ ...row })), [{ event_name: "resume_builder_start", outcome: expected }]);
    assert.equal((sqlite.prepare("SELECT COUNT(*) AS n FROM funnel_events").get() as { n: number }).n, 1, "first-party record is kept");
  }
});

test("funnel events GA4 never receives record no delivery outcome", async () => {
  const { DB, sqlite } = sqliteD1();
  const response = await handleResumeBuilderRoute(
    funnelPost({ eventName: "resume_auth_requested", anonymousId: "anon-1", analyticsConsent: true }, { Cookie: GA_COOKIES }),
    { DB, GA4_MEASUREMENT_PROTOCOL_API_SECRET: API_SECRET },
  );
  assert.equal(response?.status, 201);
  assert.equal((sqlite.prepare("SELECT COUNT(*) AS n FROM ga4_delivery_outcomes").get() as { n: number }).n, 0);
});

test("outcome rows hold no identifiers, cookies or request data", async () => {
  const { DB, sqlite } = sqliteD1();
  const { fetchImpl } = captureFetch();
  await handleResumeBuilderRoute(
    funnelPost({ eventName: "resume_preview_generated", anonymousId: "anon-secret", resumeId: "resume-secret", analyticsConsent: true }, { Cookie: GA_COOKIES }),
    { DB, GA4_MEASUREMENT_PROTOCOL_API_SECRET: API_SECRET },
    { ga4Fetch: fetchImpl },
  );
  const columns = (sqlite.prepare("PRAGMA table_info(ga4_delivery_outcomes)").all() as Array<{ name: string }>).map((column) => column.name);
  assert.deepEqual(columns, ["id", "event_name", "outcome", "occurred_at"]);
  const dump = JSON.stringify(sqlite.prepare("SELECT * FROM ga4_delivery_outcomes").all());
  assert.doesNotMatch(dump, /anon-secret|resume-secret|1234567890|1760650000|mp-test-secret/);
});

test("funnel recording still succeeds when migration 0012 has not been applied", async (t) => {
  const warnings: unknown[] = [];
  t.mock.method(console, "warn", (...args: unknown[]) => { warnings.push(args[0]); });
  const { DB, sqlite } = sqliteD1();
  sqlite.exec("DROP TABLE ga4_delivery_outcomes");
  const { calls, fetchImpl } = captureFetch();
  const response = await handleResumeBuilderRoute(
    funnelPost({ eventName: "resume_builder_start", anonymousId: "anon-1", analyticsConsent: true }, { Cookie: GA_COOKIES }),
    { DB, GA4_MEASUREMENT_PROTOCOL_API_SECRET: API_SECRET },
    { ga4Fetch: fetchImpl },
  );
  assert.equal(response?.status, 201);
  assert.equal(calls.length, 1, "GA4 delivery is unaffected");
  assert.equal((sqlite.prepare("SELECT COUNT(*) AS n FROM funnel_events").get() as { n: number }).n, 1);
  assert.ok(warnings.some((entry) => (entry as { event?: string })?.event === "ga4_delivery_outcome_not_recorded"));
});

test("recordGa4DeliveryOutcome never throws", async () => {
  const failing = { prepare() { throw new Error("db down"); } } as unknown as D1Database;
  await assert.doesNotReject(recordGa4DeliveryOutcome(failing, "resume_builder_start", "sent"));
});

test("the database rejects outcome labels outside the fixed set", () => {
  const { sqlite } = sqliteD1();
  assert.throws(() => sqlite.prepare(
    "INSERT INTO ga4_delivery_outcomes (event_name, outcome, occurred_at) VALUES ('resume_builder_start', 'anything', '2026-11-02T00:00:00.000Z')",
  ).run());
});

test("breakdown aggregates by outcome and event within the window, and is null without the table", async () => {
  const { DB, sqlite } = sqliteD1();
  const insert = sqlite.prepare("INSERT INTO ga4_delivery_outcomes (event_name, outcome, occurred_at) VALUES (?, ?, ?)");
  insert.run("resume_builder_start", "sent", "2026-10-30T10:00:00.000Z");
  insert.run("resume_builder_start", "no_ga_cookie", "2026-10-30T11:00:00.000Z");
  insert.run("resume_builder_start", "no_ga_cookie", "2026-10-31T11:00:00.000Z");
  insert.run("begin_checkout", "no_ga_session", "2026-10-31T12:00:00.000Z");
  insert.run("resume_builder_start", "sent", "2026-11-02T00:00:00.000Z"); // end boundary
  insert.run("resume_builder_start", "sent", "2026-10-20T00:00:00.000Z"); // before window

  const start = "2026-10-26T00:00:00.000Z", end = "2026-11-02T00:00:00.000Z";
  const exclusive = await ga4DeliveryBreakdown(DB, start, end, "<");
  assert.deepEqual(exclusive, {
    total: 4,
    byOutcome: { sent: 1, no_consent: 0, no_ga_cookie: 2, no_ga_session: 1, not_configured: 0 },
    byEvent: {
      resume_builder_start: { sent: 1, no_ga_cookie: 2 },
      begin_checkout: { no_ga_session: 1 },
    },
  });
  assert.equal((await ga4DeliveryBreakdown(DB, start, end, "<="))?.total, 5);

  sqlite.exec("DROP TABLE ga4_delivery_outcomes");
  assert.equal(await ga4DeliveryBreakdown(DB, start, end, "<"), null);
});

test("Agent 1 snapshot reports ga4Delivery separately from the fixed counts", async () => {
  const { DB } = sqliteD1();
  const { fetchImpl } = captureFetch();
  for (const cookie of [GA_COOKIES, ""]) {
    await handleResumeBuilderRoute(
      funnelPost({ eventName: "resume_builder_start", anonymousId: "anon-1", analyticsConsent: true }, cookie ? { Cookie: cookie } : {}),
      { DB, GA4_MEASUREMENT_PROTOCOL_API_SECRET: API_SECRET },
      { ga4Fetch: fetchImpl },
    );
  }
  const response = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/internal/agent1/funnel-snapshot?window=24h", {
      headers: { Authorization: `Bearer ${AGENT1_SECRET}` },
    }),
    { DB, AGENT1_FUNNEL_SECRET: AGENT1_SECRET },
  );
  assert.equal(response?.status, 200);
  const payload = await response!.json() as {
    counts: Record<string, number>;
    ga4Delivery: { total: number; byOutcome: Record<string, number> } | null;
  };
  assert.equal(payload.counts.starts, 2);
  assert.equal("ga4Delivery" in payload.counts, false, "A01 bridge count keys are unchanged");
  assert.equal(payload.ga4Delivery?.total, 2);
  assert.equal(payload.ga4Delivery?.byOutcome.sent, 1);
  assert.equal(payload.ga4Delivery?.byOutcome.no_ga_cookie, 1);
});
