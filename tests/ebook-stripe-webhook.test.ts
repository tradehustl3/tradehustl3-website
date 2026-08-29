import assert from "node:assert/strict";
import test from "node:test";
import { handleEbookStripeRoute, EBOOK_RELEASE_AT } from "../worker/ebook-stripe";

type OrderRow = {
  stripe_session_id: string;
  email: string;
  payment_link_id: string;
  stripe_payment_intent_id: string | null;
  amount_total: number;
  amount_refunded: number;
  currency: string;
  status: string;
  download_token: string;
  emailed_at: string | null;
  launch_emailed_at: string | null;
  launch_email_lease_until: number | null;
  refunded_at: string | null;
};

/**
 * A minimal in-memory stand-in for the D1 binding, dispatching on the same
 * SQL statements worker/ebook-stripe.ts actually issues so the tests below
 * exercise the real fulfillment/refund/download logic, not a re-implementation of it.
 */
function fakeEbookDb() {
  const orders: OrderRow[] = [];
  const refundEvents: Array<{ event_id: string; payment_intent_id: string; amount_refunded: number; currency: string }> = [];
  const findOrder = (sessionId: string) => orders.find((order) => order.stripe_session_id === sessionId);

  return {
    orders,
    refundEvents,
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async first<T>(): Promise<T | null> {
              if (sql.includes("SELECT MAX(amount_refunded)")) {
                const [paymentIntentId, currency] = values as [string, string];
                const matches = refundEvents.filter((event) => event.payment_intent_id === paymentIntentId && event.currency === currency);
                const amountRefunded = matches.length ? Math.max(...matches.map((event) => event.amount_refunded)) : null;
                return { amount_refunded: amountRefunded } as unknown as T;
              }
              if (sql.includes("SELECT email, download_token")) {
                const [sessionId] = values as [string];
                const order = findOrder(sessionId);
                if (!order) return null;
                return {
                  email: order.email,
                  download_token: order.download_token,
                  emailed_at: order.emailed_at,
                  launch_emailed_at: order.launch_emailed_at,
                  status: order.status,
                  stripe_payment_intent_id: order.stripe_payment_intent_id,
                } as unknown as T;
              }
              if (sql.includes("SELECT stripe_session_id FROM ebook_orders WHERE download_token")) {
                const [token] = values as [string];
                const order = orders.find((candidate) => candidate.download_token === token && candidate.status === "paid");
                return order ? ({ stripe_session_id: order.stripe_session_id } as unknown as T) : null;
              }
              if (sql.includes("FROM ebook_orders") && sql.includes("amount_total = ?") && sql.includes("download_token IS NOT NULL")) {
                const [sessionId, amountTotal, currency] = values as [string, number, string];
                const order = findOrder(sessionId);
                return order && order.status === "paid" && order.amount_total === amountTotal && order.currency === currency && order.stripe_payment_intent_id && order.download_token
                  ? ({ stripe_session_id: order.stripe_session_id } as unknown as T)
                  : null;
              }
              return null;
            },
            async run() {
              if (sql.includes("INSERT OR IGNORE INTO ebook_orders")) {
                const [sessionId, email, paymentLinkId, paymentIntentId, amountTotal, currency, downloadToken] =
                  values as [string, string, string, string, number, string, string];
                if (findOrder(sessionId)) return { meta: { changes: 0 } };
                orders.push({
                  stripe_session_id: sessionId,
                  email,
                  payment_link_id: paymentLinkId,
                  stripe_payment_intent_id: paymentIntentId,
                  amount_total: amountTotal,
                  amount_refunded: 0,
                  currency,
                  status: "paid",
                  download_token: downloadToken,
                  emailed_at: null,
                  launch_emailed_at: null,
                  launch_email_lease_until: null,
                  refunded_at: null,
                });
                return { meta: { changes: 1 } };
              }
              if (sql.includes("stripe_payment_intent_id = COALESCE")) {
                const [paymentIntentId, sessionId] = values as [string, string, string];
                const order = findOrder(sessionId);
                if (!order) return { meta: { changes: 0 } };
                order.stripe_payment_intent_id = order.stripe_payment_intent_id ?? paymentIntentId;
                return { meta: { changes: 1 } };
              }
              if (sql.includes("amount_refunded = MAX") && sql.includes("WHERE stripe_session_id = ?")) {
                const [bumpTo, , , sessionId, paymentIntentId, amountTotal, currency] =
                  values as [number, number, number, string, string, number, string];
                const order = findOrder(sessionId);
                if (order && order.stripe_payment_intent_id === paymentIntentId && order.amount_total === amountTotal && order.currency === currency) {
                  order.amount_refunded = Math.max(order.amount_refunded, bumpTo);
                  if (order.amount_refunded >= order.amount_total) {
                    order.status = "refunded";
                    order.refunded_at = order.refunded_at ?? "now";
                  }
                }
                return { meta: { changes: 1 } };
              }
              if (sql.includes("SET emailed_at = CURRENT_TIMESTAMP WHERE")) {
                const [sessionId] = values as [string];
                const order = findOrder(sessionId);
                if (order && order.status === "paid") order.emailed_at = "now";
                return { meta: { changes: 1 } };
              }
              if (sql.includes("launch_emailed_at = CURRENT_TIMESTAMP") && sql.includes("WHERE stripe_session_id = ?")) {
                const [sessionId] = values as [string];
                const order = findOrder(sessionId);
                if (order && order.status === "paid") {
                  order.emailed_at = order.emailed_at ?? "now";
                  order.launch_emailed_at = "now";
                  order.launch_email_lease_until = null;
                }
                return { meta: { changes: 1 } };
              }
              if (sql.includes("INSERT OR IGNORE INTO ebook_refund_events")) {
                const [eventId, paymentIntentId, amountRefunded, currency] = values as [string, string, number, string];
                if (refundEvents.some((event) => event.event_id === eventId)) return { meta: { changes: 0 } };
                refundEvents.push({ event_id: eventId, payment_intent_id: paymentIntentId, amount_refunded: amountRefunded, currency });
                return { meta: { changes: 1 } };
              }
              if (sql.includes("launch_email_lease_until = CASE")) {
                const [bumpTo, , , , paymentIntentId, amountTotal, currency] =
                  values as [number, number, number, number, string, number, string];
                const order = orders.find((candidate) =>
                  candidate.stripe_payment_intent_id === paymentIntentId &&
                  candidate.amount_total === amountTotal &&
                  candidate.currency === currency);
                if (order) {
                  order.amount_refunded = Math.max(order.amount_refunded, bumpTo);
                  if (order.amount_refunded >= order.amount_total) {
                    order.status = "refunded";
                    order.refunded_at = order.refunded_at ?? "now";
                    order.launch_email_lease_until = null;
                  }
                }
                return { meta: { changes: order ? 1 : 0 } };
              }
              return { meta: { changes: 0 } };
            },
          };
        },
      };
    },
  };
}

const WEBHOOK_SECRET = "whsec_test_secret";
const PAYMENT_LINK_ID = "plink_test_ebook";

async function stripeSignature(payload: string, secret: string, timestampSeconds: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestampSeconds}.${payload}`));
  const hex = Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `t=${timestampSeconds},v1=${hex}`;
}

function fakeBooks() {
  return {
    async get(key: string) {
      if (key !== "TRADE-HUSTL3-COMPLETE-EBOOK.pdf") return null;
      return { body: new TextEncoder().encode("PDF-BYTES"), httpEtag: '"etag"' };
    },
  } as unknown as R2Bucket;
}

function baseEnv(db: ReturnType<typeof fakeEbookDb>) {
  return {
    DB: db as unknown as D1Database,
    BOOKS: fakeBooks(),
    BREVO_API_KEY: "brevo-test-key",
    BREVO_SAMPLE_SENDER_EMAIL: "updates@tradehustl3.com",
    STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    STRIPE_EBOOK_PAYMENT_LINK_ID: PAYMENT_LINK_ID,
  };
}

async function postWebhook(env: ReturnType<typeof baseEnv>, event: unknown, nowSeconds: number): Promise<Response> {
  const payload = JSON.stringify(event);
  const signature = await stripeSignature(payload, WEBHOOK_SECRET, nowSeconds);
  const response = await handleEbookStripeRoute(
    new Request("https://tradehustl3.com/api/stripe/webhook", {
      method: "POST",
      headers: { "Stripe-Signature": signature },
      body: payload,
    }),
    env,
  );
  assert.ok(response, "the webhook route should handle /api/stripe/webhook");
  return response as Response;
}

function checkoutCompletedEvent(overrides: Partial<{
  id: string;
  sessionId: string;
  paymentLinkId: string;
  paymentIntentId: string;
  email: string;
  amountTotal: number;
  currency: string;
}> = {}) {
  return {
    id: overrides.id ?? "evt_checkout_1",
    type: "checkout.session.completed",
    data: {
      object: {
        id: overrides.sessionId ?? "cs_test_1",
        payment_link: overrides.paymentLinkId ?? PAYMENT_LINK_ID,
        payment_intent: overrides.paymentIntentId ?? "pi_test_1",
        payment_status: "paid",
        amount_total: overrides.amountTotal ?? 999,
        currency: overrides.currency ?? "usd",
        customer_details: { email: overrides.email ?? "buyer@example.com" },
      },
    },
  };
}

function chargeRefundedEvent(overrides: Partial<{
  id: string;
  paymentIntentId: string;
  amount: number;
  amountRefunded: number;
  currency: string;
}> = {}) {
  return {
    id: overrides.id ?? "evt_refund_1",
    type: "charge.refunded",
    data: {
      object: {
        payment_intent: overrides.paymentIntentId ?? "pi_test_1",
        amount: overrides.amount ?? 999,
        amount_refunded: overrides.amountRefunded ?? 999,
        currency: overrides.currency ?? "usd",
      },
    },
  };
}

function withMockedBrevo<T>(run: (calls: Array<{ subject: string }>) => Promise<T>): Promise<T> {
  const calls: Array<{ subject: string }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "https://api.brevo.com/v3/smtp/email") {
      const body = JSON.parse(String(init?.body)) as { subject: string };
      calls.push({ subject: body.subject });
      return new Response(null, { status: 201 });
    }
    throw new Error(`Unexpected fetch in test: ${url}`);
  }) as typeof fetch;
  return run(calls).finally(() => {
    globalThis.fetch = originalFetch;
  });
}

test("a checkout session for the wrong payment link is silently ignored, not fulfilled", async () => {
  const db = fakeEbookDb();
  const env = baseEnv(db);
  const now = Math.floor(Date.now() / 1000);
  await withMockedBrevo(async (calls) => {
    const response = await postWebhook(env, checkoutCompletedEvent({ paymentLinkId: "plink_someone_elses_product" }), now);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { received: true });
    assert.equal(calls.length, 0);
  });
  assert.equal(db.orders.length, 0, "no order should be created for a mismatched payment link");
});

test("an invalid Stripe signature is rejected", async () => {
  const db = fakeEbookDb();
  const env = baseEnv(db);
  const payload = JSON.stringify(checkoutCompletedEvent());
  const response = await handleEbookStripeRoute(
    new Request("https://tradehustl3.com/api/stripe/webhook", {
      method: "POST",
      headers: { "Stripe-Signature": "t=1,v1=deadbeef" },
      body: payload,
    }),
    env,
  );
  assert.equal(response?.status, 400);
  assert.equal(db.orders.length, 0);
});

test("pre-launch: a paid checkout records the order and sends the preorder confirmation, not the download link", async () => {
  assert.ok(Date.now() < EBOOK_RELEASE_AT, "this test assumes it runs before the Sept 15 2026 launch");
  const db = fakeEbookDb();
  const env = baseEnv(db);
  const now = Math.floor(Date.now() / 1000);

  await withMockedBrevo(async (calls) => {
    const response = await postWebhook(env, checkoutCompletedEvent({ email: "PreOrder@Example.com" }), now);
    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].subject, "Your TRADE HUSTL3 eBook preorder is confirmed");
  });

  assert.equal(db.orders.length, 1);
  const order = db.orders[0];
  assert.equal(order.status, "paid");
  assert.equal(order.email, "preorder@example.com");
  assert.ok(order.emailed_at, "the preorder confirmation should be recorded as sent");
  assert.equal(order.launch_emailed_at, null, "the download email must not go out before launch");

  const downloadResponse = await handleEbookStripeRoute(
    new Request(`https://tradehustl3.com/api/ebook-download?token=${encodeURIComponent(order.download_token)}`),
    env,
  );
  assert.equal(downloadResponse?.status, 403, "the download route must stay locked before Sept 15 even for a paid order");

  const statusResponse = await handleEbookStripeRoute(
    new Request(`https://tradehustl3.com/api/ebook-order-status?session_id=${order.stripe_session_id}`),
    env,
  );
  assert.equal(statusResponse?.status, 200);
  assert.deepEqual(await statusResponse?.json(), {
    ok: true,
    verified: true,
    transactionId: order.stripe_session_id,
    contentName: "ebook",
    value: 9.99,
    currency: "USD",
  });
});

test("post-launch: a paid checkout delivers the download link and the file actually downloads", async () => {
  const db = fakeEbookDb();
  const env = baseEnv(db);
  const postLaunch = Math.floor(EBOOK_RELEASE_AT / 1000) + 3600;
  const originalDateNow = Date.now;
  Date.now = () => postLaunch * 1000;

  try {
    await withMockedBrevo(async (calls) => {
      const response = await postWebhook(env, checkoutCompletedEvent({ sessionId: "cs_test_launch", email: "launchday@example.com" }), postLaunch);
      assert.equal(response.status, 200);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].subject, "Your TRADE HUSTL3 eBook is ready");
    });

    const order = db.orders.find((candidate) => candidate.stripe_session_id === "cs_test_launch");
    assert.ok(order);
    assert.equal(order!.status, "paid");
    assert.ok(order!.launch_emailed_at, "the download email should be recorded as sent");

    const downloadResponse = await handleEbookStripeRoute(
      new Request(`https://tradehustl3.com/api/ebook-download?token=${encodeURIComponent(order!.download_token)}`),
      env,
    );
    assert.equal(downloadResponse?.status, 200);
    assert.equal(downloadResponse?.headers.get("content-type"), "application/pdf");
    assert.equal(await downloadResponse?.text(), "PDF-BYTES");
  } finally {
    Date.now = originalDateNow;
  }
});

test("post-launch: a full refund flips the order to refunded and immediately revokes the download link", async () => {
  const db = fakeEbookDb();
  const env = baseEnv(db);
  const postLaunch = Math.floor(EBOOK_RELEASE_AT / 1000) + 7200;
  const originalDateNow = Date.now;
  Date.now = () => postLaunch * 1000;

  try {
    await withMockedBrevo(async () => {
      await postWebhook(
        env,
        checkoutCompletedEvent({ sessionId: "cs_test_refund", paymentIntentId: "pi_test_refund", email: "refundme@example.com" }),
        postLaunch,
      );
    });

    const order = db.orders.find((candidate) => candidate.stripe_session_id === "cs_test_refund");
    assert.ok(order);
    const downloadToken = order!.download_token;

    const preRefundDownload = await handleEbookStripeRoute(
      new Request(`https://tradehustl3.com/api/ebook-download?token=${encodeURIComponent(downloadToken)}`),
      env,
    );
    assert.equal(preRefundDownload?.status, 200, "the link should work before any refund");

    const refundResponse = await postWebhook(
      env,
      chargeRefundedEvent({ paymentIntentId: "pi_test_refund", amount: 999, amountRefunded: 999 }),
      postLaunch,
    );
    assert.equal(refundResponse.status, 200);

    assert.equal(order!.status, "refunded");
    assert.equal(order!.amount_refunded, 999);

    const postRefundDownload = await handleEbookStripeRoute(
      new Request(`https://tradehustl3.com/api/ebook-download?token=${encodeURIComponent(downloadToken)}`),
      env,
    );
    assert.equal(postRefundDownload?.status, 302, "a refunded order's download link must stop working immediately");
    assert.equal(postRefundDownload?.headers.get("location"), "https://tradehustl3.com/book");
  } finally {
    Date.now = originalDateNow;
  }
});

test("a refund for an amount that doesn't match the eBook's fixed price is ignored", async () => {
  const db = fakeEbookDb();
  const env = baseEnv(db);
  const now = Math.floor(Date.now() / 1000);

  await withMockedBrevo(async () => {
    await postWebhook(env, checkoutCompletedEvent({ sessionId: "cs_test_badrefund", paymentIntentId: "pi_test_badrefund" }), now);
  });

  const response = await postWebhook(
    env,
    chargeRefundedEvent({ paymentIntentId: "pi_test_badrefund", amount: 1999, amountRefunded: 999 }),
    now,
  );
  assert.equal(response.status, 200);
  const order = db.orders.find((candidate) => candidate.stripe_session_id === "cs_test_badrefund");
  assert.equal(order?.status, "paid", "a refund event for a mismatched amount must not touch the order");
});
