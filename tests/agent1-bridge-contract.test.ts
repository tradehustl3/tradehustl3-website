import assert from "node:assert/strict";
import test from "node:test";

import { handleResumeBuilderRoute } from "../worker/resume-builder";
import { A01_CONTRACT_SOURCE, validateA01Snapshot } from "./helpers/agent1-bridge-contract";
import { sqliteD1 } from "./helpers/sqlite-d1";

// The real 24h snapshot must pass the A01 bridge's validation rules
// (see tests/helpers/agent1-bridge-contract.ts). A failure here means the
// daily A01 run in production would fail with invalid_snapshot_fields.

const SECRET = "agent1-contract-secret-abcdefghijklmnopqrstuvwxyz-123456";
const NOW = "2026-10-28T12:00:00.000Z";

function request(window: string): Request {
  return new Request(
    `https://tradehustl3.com/api/resume-builder/internal/agent1/funnel-snapshot?window=${window}`,
    { headers: { Authorization: `Bearer ${SECRET}` } },
  );
}

/** A busy day: every funnel stage, a paid order, and a refunded order. */
function seedRealisticDay(sqlite: ReturnType<typeof sqliteD1>["sqlite"]) {
  const events: Array<[string, string]> = [
    ["resume_builder_start", "2026-10-28T01:00:00.000Z"],
    ["resume_builder_start", "2026-10-28 02:00:00"],
    ["resume_intake_started", "2026-10-28T03:00:00.000Z"],
    ["resume_intake_complete", "2026-10-28T04:00:00.000Z"],
    ["resume_preview_generated", "2026-10-28T05:00:00.000Z"],
    ["begin_checkout", "2026-10-28T06:00:00.000Z"],
  ];
  events.forEach(([name, at], index) => {
    sqlite.prepare("INSERT INTO funnel_events (event_id, event_name, occurred_at) VALUES (?, ?, ?)").run(`evt-${index}`, name, at);
  });
  const insertOrder = sqlite.prepare(`
    INSERT INTO resume_orders (order_id, user_id, resume_id, email, plan, amount_total, currency, status, paid_at,
                               stripe_payment_intent_id, stripe_charge_id, amount_refunded)
    VALUES (?, 'user-1', ?, 'buyer@example.com', 'resume_mvp_999', 999, 'usd', ?, ?, ?, ?, ?)
  `);
  insertOrder.run("order-paid", "resume-1", "paid", "2026-10-28 07:00:00", "pi_contract_paid", "ch_contract_paid", 0);
  insertOrder.run("order-refunded", "resume-2", "refunded", "2026-10-28 08:00:00", "pi_contract_refunded", "ch_contract_refunded", 999);
}

async function liveSnapshot(t: { mock: { timers: { enable(o: { apis: ["Date"]; now: number }): void } } }, seed = true) {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse(NOW) });
  const { DB, sqlite } = sqliteD1();
  if (seed) seedRealisticDay(sqlite);
  const response = await handleResumeBuilderRoute(request("24h"), { DB, AGENT1_FUNNEL_SECRET: SECRET });
  assert.ok(response);
  assert.equal(response.status, 200);
  return await response.json() as Record<string, unknown>;
}

test(`real 24h snapshot with paid and refunded orders passes the A01 bridge contract (${A01_CONTRACT_SOURCE})`, async (t) => {
  const payload = await liveSnapshot(t);
  assert.deepEqual(validateA01Snapshot(payload, Date.parse(NOW)), { ok: true });
  // The seeded day actually exercised the fields the bridge checks.
  assert.equal((payload.counts as Record<string, number>).verifiedPurchases, 1);
  assert.equal((payload.revenue as Record<string, number>).verifiedRevenueCents, 999);
});

test("real 24h snapshot with no activity passes the A01 bridge contract", async (t) => {
  const payload = await liveSnapshot(t, false);
  assert.deepEqual(validateA01Snapshot(payload, Date.parse(NOW)), { ok: true });
});

test("snapshot is still accepted when the bridge receives it up to 15 minutes later", async (t) => {
  const payload = await liveSnapshot(t);
  assert.equal(validateA01Snapshot(payload, Date.parse(NOW) + 900_000).ok, true);
  assert.equal(validateA01Snapshot(payload, Date.parse(NOW) + 901_000).ok, false);
});

test("revenue dollars equal cents / 100 exactly for every cent amount up to $2,000", () => {
  // The bridge compares verifiedRevenueUsd to cents / 100 with float equality.
  // This is the expression the snapshot uses to build verifiedRevenueUsd.
  for (let cents = 0; cents <= 200_000; cents += 1) {
    assert.equal(Number((cents / 100).toFixed(2)), cents / 100, `cents=${cents}`);
  }
});

// The contract must catch the kinds of change that broke production. These
// prove the checks are not vacuous.

test("contract rejects a snapshot whose required authority entry changed (the Oct 23 failure class)", async (t) => {
  const payload = await liveSnapshot(t);
  const authority = { ...(payload.authority as Record<string, string>), purchases: "resume_orders.status=paid" };
  const result = validateA01Snapshot({ ...payload, authority }, Date.parse(NOW));
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.code, "invalid_snapshot_fields");
});

test("contract accepts extra string authorities but rejects non-string ones", async (t) => {
  const payload = await liveSnapshot(t);
  const base = payload.authority as Record<string, unknown>;
  assert.equal(validateA01Snapshot({ ...payload, authority: { ...base, futureLedger: "described" } }, Date.parse(NOW)).ok, true);
  assert.equal(validateA01Snapshot({ ...payload, authority: { ...base, futureLedger: { rows: 1 } } }, Date.parse(NOW)).ok, false);
});

test("contract rejects renamed or non-integer counts, a wrong window and mismatched revenue", async (t) => {
  const payload = await liveSnapshot(t);
  const counts = payload.counts as Record<string, number>;
  const revenue = payload.revenue as Record<string, number>;
  const now = Date.parse(NOW);

  const { intakeStarted: _intakeStarted, ...renamed } = counts;
  void _intakeStarted;
  assert.equal(validateA01Snapshot({ ...payload, counts: { ...renamed, intakeStart: 1 } }, now).ok, false);
  assert.equal(validateA01Snapshot({ ...payload, counts: { ...counts, starts: 1.5 } }, now).ok, false);
  assert.equal(validateA01Snapshot({ ...payload, window: "7d" }, now).ok, false);
  assert.equal(validateA01Snapshot({ ...payload, revenue: { ...revenue, verifiedRevenueUsd: 10 } }, now).ok, false);
  assert.equal(validateA01Snapshot({ ...payload, windowStart: "2026-10-27T13:00:00.000Z" }, now).ok, false);
});
