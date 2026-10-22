import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { buildOrderLedger } from "../worker/resume-builder-base";
import { handleResumeBuilderRoute } from "../worker/resume-builder";
import { sqliteD1 } from "./helpers/sqlite-d1";

const WEBHOOK_SECRET = "whsec_resume_refund_ledger_test";
const AGENT1_SECRET = "agent1-test-secret-abcdefghijklmnopqrstuvwxyz-123456";
const WEBHOOK = "https://tradehustl3.com/api/resume-builder/stripe/webhook";

async function stripeSignature(payload: string, secret: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const hex = Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `t=${timestamp},v1=${hex}`;
}

async function deliver(DB: D1Database, event: Record<string, unknown>) {
  const payload = JSON.stringify(event);
  return handleResumeBuilderRoute(
    new Request(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Stripe-Signature": await stripeSignature(payload, WEBHOOK_SECRET) },
      body: payload,
    }),
    { DB, STRIPE_RESUME_WEBHOOK_SECRET: WEBHOOK_SECRET },
  );
}

function refundEvent(
  eventId: string,
  amountRefunded: number,
  options: { orderMetadata?: boolean; untagged?: boolean; paymentIntent?: string } = {},
) {
  const metadata = options.untagged
    ? {}
    : options.orderMetadata === false
      ? { product: "resume_builder_mvp" }
      : { product: "resume_builder_mvp", order_id: "order-1" };
  return {
    id: eventId,
    type: "charge.refunded",
    data: {
      object: {
        id: "ch_ledger_1",
        amount: 999,
        amount_refunded: amountRefunded,
        currency: "usd",
        payment_intent: options.paymentIntent ?? "pi_ledger_1",
        metadata,
      },
    },
  };
}

function checkoutEvent(eventId: string) {
  return {
    id: eventId,
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_ledger_1",
        client_reference_id: "order-1",
        payment_status: "paid",
        amount_total: 999,
        currency: "usd",
        payment_intent: "pi_ledger_1",
        customer: "cus_ledger_1",
        customer_details: { email: "member@example.com" },
        metadata: { product: "resume_builder_mvp", order_id: "order-1", resume_id: "resume-1", user_id: "user-1" },
      },
    },
  };
}

function setup() {
  const { DB, sqlite } = sqliteD1();
  sqlite.prepare(`
    INSERT INTO resume_orders (order_id, user_id, resume_id, email, plan, amount_total, currency, status)
    VALUES ('order-1', 'user-1', 'resume-1', 'member@example.com', 'resume_mvp_999', 999, 'usd', 'pending')
  `).run();
  const order = () => sqlite.prepare(
    "SELECT status, amount_refunded, refunded_at, stripe_payment_intent_id, stripe_charge_id FROM resume_orders WHERE order_id = 'order-1'",
  ).get() as {
    status: string;
    amount_refunded: number;
    refunded_at: string | null;
    stripe_payment_intent_id: string | null;
    stripe_charge_id: string | null;
  };
  const entitlementStatus = () => (sqlite.prepare(
    "SELECT status FROM entitlements WHERE source_order_id = 'order-1'",
  ).get() as { status: string } | undefined)?.status ?? null;
  const refundRows = () => (sqlite.prepare("SELECT COUNT(*) AS count FROM resume_refund_events").get() as { count: number }).count;
  return { DB, sqlite, order, entitlementStatus, refundRows };
}

test("partial refunds are recorded without revoking access; the full total revokes it", async () => {
  const { DB, order, entitlementStatus, refundRows } = setup();
  assert.equal((await deliver(DB, checkoutEvent("evt_checkout")))?.status, 200);
  assert.equal(entitlementStatus(), "active");

  assert.equal((await deliver(DB, refundEvent("evt_refund_500", 500)))?.status, 200);
  assert.equal(order().status, "paid");
  assert.equal(order().amount_refunded, 500);
  assert.equal(order().refunded_at, null, "refunded_at marks a full refund only");
  assert.equal(order().stripe_charge_id, "ch_ledger_1");
  assert.equal(entitlementStatus(), "active");

  assert.equal((await deliver(DB, refundEvent("evt_refund_999", 999)))?.status, 200);
  assert.equal(order().status, "refunded");
  assert.equal(order().amount_refunded, 999);
  assert.ok(order().refunded_at);
  assert.equal(entitlementStatus(), "revoked");
  assert.equal(refundRows(), 2);
});

test("out-of-order and replayed refund events never lower the recorded total", async () => {
  const { DB, order, entitlementStatus, refundRows } = setup();
  await deliver(DB, checkoutEvent("evt_checkout"));
  await deliver(DB, refundEvent("evt_refund_999", 999));
  await deliver(DB, refundEvent("evt_refund_500_late", 500));
  await deliver(DB, refundEvent("evt_refund_999", 999));
  assert.equal(order().amount_refunded, 999);
  assert.equal(order().status, "refunded");
  assert.equal(entitlementStatus(), "revoked");
  assert.equal(refundRows(), 2, "a replayed Stripe event is stored once");
});

test("a full refund delivered before checkout, without order metadata, is reconciled at checkout", async () => {
  const { DB, order, entitlementStatus, refundRows } = setup();
  await deliver(DB, refundEvent("evt_refund_first", 999, { orderMetadata: false }));
  assert.equal(order().status, "pending", "no order has this payment intent yet");
  assert.equal(order().amount_refunded, 0);
  assert.equal(refundRows(), 1, "the refund is kept for reconciliation");

  assert.equal((await deliver(DB, checkoutEvent("evt_checkout_late")))?.status, 200);
  assert.equal(order().status, "refunded");
  assert.equal(order().amount_refunded, 999);
  assert.equal(order().stripe_charge_id, "ch_ledger_1");
  assert.equal(entitlementStatus(), null, "a fully refunded order never gains access");
});

test("a partial refund delivered before checkout is reconciled and access is granted", async () => {
  const { DB, order, entitlementStatus } = setup();
  await deliver(DB, refundEvent("evt_partial_first", 300, { orderMetadata: false }));
  await deliver(DB, checkoutEvent("evt_checkout_after_partial"));
  assert.equal(order().status, "paid");
  assert.equal(order().amount_refunded, 300);
  assert.equal(entitlementStatus(), "active");
});

test("an untagged $9.99 refund with no matching order (e.g. an eBook charge) is not stored", async () => {
  const { DB, order, refundRows } = setup();
  await deliver(DB, checkoutEvent("evt_checkout"));
  const response = await deliver(DB, refundEvent("evt_ebook_refund", 999, { untagged: true, paymentIntent: "pi_ebook_1" }));
  assert.equal(response?.status, 200);
  assert.equal(refundRows(), 0);
  assert.equal(order().amount_refunded, 0);
  assert.equal(order().status, "paid");
});

test("a refund larger than the charge is rejected and not recorded", async () => {
  const { DB, order, refundRows } = setup();
  await deliver(DB, checkoutEvent("evt_checkout"));
  await deliver(DB, refundEvent("evt_refund_too_large", 1500));
  assert.equal(order().amount_refunded, 0);
  assert.equal(order().status, "paid");
  assert.equal(refundRows(), 0);
});

test("funnel snapshot reports a complete order and refund ledger with Stripe identifiers", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-22T12:00:00.000Z") });
  const { DB, sqlite } = sqliteD1();
  sqlite.exec(`
    INSERT INTO resume_orders (order_id, user_id, resume_id, email, plan, amount_total, currency, status,
      stripe_payment_intent_id, stripe_charge_id, paid_at, amount_refunded)
    VALUES
      ('o-paid', 'u1', 'r1', 'a@example.com', 'resume_mvp_999', 999, 'usd', 'paid', 'pi_b', NULL, '2026-10-20 10:00:00', 0),
      ('o-partial', 'u2', 'r2', 'b@example.com', 'resume_mvp_999', 999, 'usd', 'paid', 'pi_a', 'ch_a', '2026-10-21 10:00:00', 300),
      ('o-refunded', 'u3', 'r3', 'c@example.com', 'resume_mvp_999', 999, 'usd', 'refunded', 'pi_c', 'ch_c', '2026-10-21 11:00:00', 999),
      ('o-outside', 'u4', 'r4', 'd@example.com', 'resume_mvp_999', 999, 'usd', 'paid', 'pi_x', NULL, '2026-10-01 10:00:00', 0),
      ('o-pending', 'u5', 'r5', 'e@example.com', 'resume_mvp_999', 999, 'usd', 'pending', NULL, NULL, NULL, 0);
  `);
  const response = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/internal/agent1/funnel-snapshot?window=7d", {
      headers: { Authorization: `Bearer ${AGENT1_SECRET}` },
    }),
    { DB, AGENT1_FUNNEL_SECRET: AGENT1_SECRET },
  );
  assert.equal(response?.status, 200);
  const payload = await response!.json() as {
    counts: { verifiedPurchases: number };
    revenue: { verifiedRevenueCents: number };
    orderLedger: ReturnType<typeof buildOrderLedger>;
  };
  // Existing fields keep their meaning: paid, non-refunded orders only.
  assert.equal(payload.counts.verifiedPurchases, 2);
  assert.equal(payload.revenue.verifiedRevenueCents, 1998);
  assert.deepEqual(payload.orderLedger, {
    paidOrders: 3,
    grossCents: 2997,
    refundedOrders: 2,
    refundedCents: 1299,
    currency: "USD",
    paymentIntentIds: ["pi_a", "pi_b", "pi_c"],
    refundedChargeIds: ["ch_a", "ch_c"],
    complete: true,
  });
});

test("ledger is reported incomplete, never guessed, when an identifier is missing", () => {
  const ledger = buildOrderLedger([
    { stripe_payment_intent_id: "pi_1", stripe_charge_id: null, amount_total: 999, amount_refunded: 999, currency: "usd" },
    { stripe_payment_intent_id: "pi_2", stripe_charge_id: null, amount_total: 999, amount_refunded: 0, currency: "usd" },
  ]);
  assert.equal(ledger.complete, false);
  assert.equal(ledger.paymentIntentIds, null);
  assert.equal(ledger.refundedChargeIds, null);
  assert.equal(ledger.paidOrders, 2);
  assert.equal(ledger.refundedOrders, 1);
  assert.equal(ledger.refundedCents, 999);
});

test("migration 0011 backfills existing full refunds and its rollback preserves orders", () => {
  const dir = new URL("../drizzle/", import.meta.url);
  const run = (db: DatabaseSync, file: string) =>
    db.exec(readFileSync(new URL(file, dir), "utf8").replace(/-->\s*statement-breakpoint/g, ""));
  const db = new DatabaseSync(":memory:");
  for (const file of readdirSync(dir).filter((name) => /^\d{4}_.*\.sql$/.test(name)
    && !/_(?:down|preflight)\.sql$/.test(name) && name < "0011").sort()) {
    run(db, file);
  }
  db.exec(`
    INSERT INTO resume_orders (order_id, user_id, resume_id, email, plan, amount_total, currency, status, paid_at)
    VALUES ('refunded', 'u1', 'r1', 'a@example.com', 'resume_mvp_999', 999, 'usd', 'refunded', '2026-10-01 10:00:00'),
           ('paid', 'u2', 'r2', 'b@example.com', 'resume_mvp_999', 999, 'usd', 'paid', '2026-10-01 10:00:00');
  `);
  run(db, "0011_resume_refund_ledger.sql");
  const rows = db.prepare("SELECT order_id, status, amount_refunded, stripe_charge_id FROM resume_orders ORDER BY order_id")
    .all() as Array<{ order_id: string; status: string; amount_refunded: number; stripe_charge_id: string | null }>;
  assert.deepEqual(rows.map((row) => ({ ...row })), [
    { order_id: "paid", status: "paid", amount_refunded: 0, stripe_charge_id: null },
    { order_id: "refunded", status: "refunded", amount_refunded: 999, stripe_charge_id: null },
  ]);

  run(db, "0011_resume_refund_ledger_down.sql");
  const columns = (db.prepare("SELECT name FROM pragma_table_info('resume_orders')").all() as Array<{ name: string }>)
    .map((row) => row.name);
  assert.ok(!columns.includes("amount_refunded") && !columns.includes("stripe_charge_id") && !columns.includes("refunded_at"));
  const statuses = (db.prepare("SELECT status FROM resume_orders ORDER BY order_id").all() as Array<{ status: string }>)
    .map((row) => row.status);
  assert.deepEqual(statuses, ["paid", "refunded"]);
  const table = db.prepare("SELECT name FROM sqlite_master WHERE name = 'resume_refund_events'").get();
  assert.equal(table, undefined);
});
