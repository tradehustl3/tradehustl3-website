import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { handleResumeBuilderRoute } from "../worker/resume-builder";
import { handleResumeBuilderRoute as handleBaseResumeBuilderRoute } from "../worker/resume-builder-base";
import {
  ga4ConsentGranted,
  ga4IdentityFromRequest,
  parseGaClientId,
  parseGaSessionId,
  sendGa4Event,
  ga4FunnelEvent,
} from "../worker/ga4-measurement-protocol";
import { seedSession, sqliteD1, TEST_SESSION } from "./helpers/sqlite-d1";

const API_SECRET = "mp-test-secret";
const GA_COOKIES = "_ga=GA1.1.1234567890.1700000000; _ga_PHLN0C7BWF=GS2.1.s1760650000$o4$g1$t1760650100$j0$l0$h0";
const WEBHOOK_SECRET = "whsec_test_ga4";

type Captured = { url: string; body: { client_id: string; events: Array<{ name: string; params: Record<string, unknown> }> } };

function captureFetch(): { calls: Captured[]; fetchImpl: typeof fetch } {
  const calls: Captured[] = [];
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    return new Response(null, { status: 204 });
  }) as typeof fetch;
  return { calls, fetchImpl };
}

/** Runs waitUntil work synchronously enough for assertions. */
function context() {
  const pending: Promise<unknown>[] = [];
  return { ctx: { waitUntil: (promise: Promise<unknown>) => { pending.push(promise); } }, settle: () => Promise.all(pending) };
}

test("GA cookie parsing supports both _ga and both stream-cookie formats", () => {
  assert.equal(parseGaClientId("GA1.1.1234567890.1700000000"), "1234567890.1700000000");
  assert.equal(parseGaClientId("GA1.2.99.88"), "99.88");
  assert.equal(parseGaClientId("not-a-ga-cookie"), null);
  assert.equal(parseGaSessionId("GS1.1.1760650000.3.1.1760650100.0.0.0"), "1760650000");
  assert.equal(parseGaSessionId("GS2.1.s1760650000$o4$g1$t1760650100$j0$l0$h0"), "1760650000");
  assert.equal(parseGaSessionId("GS2.1.x"), null);
});

test("identity prefers the GA cookie and falls back to a well-formed anonymous id", () => {
  const withCookie = new Request("https://tradehustl3.com/", { headers: { Cookie: GA_COOKIES } });
  assert.deepEqual(ga4IdentityFromRequest(withCookie, "anon-1"), { clientId: "1234567890.1700000000", sessionId: "1760650000" });
  const noCookie = new Request("https://tradehustl3.com/");
  assert.deepEqual(ga4IdentityFromRequest(noCookie, "anon-1"), { clientId: "anon-1", sessionId: null });
  assert.equal(ga4IdentityFromRequest(noCookie, "bad id <script>"), null);
});

test("consent requires an explicit true and no Global Privacy Control signal", () => {
  const plain = new Request("https://tradehustl3.com/");
  const gpc = new Request("https://tradehustl3.com/", { headers: { "Sec-GPC": "1" } });
  assert.equal(ga4ConsentGranted(plain, true), true);
  assert.equal(ga4ConsentGranted(plain, undefined), false);
  assert.equal(ga4ConsentGranted(plain, "true"), false);
  assert.equal(ga4ConsentGranted(gpc, true), false);
});

test("delivery fails closed without the Measurement Protocol API secret", () => {
  const { calls, fetchImpl } = captureFetch();
  const event = ga4FunnelEvent("resume_builder_start");
  assert.ok(event);
  assert.equal(sendGa4Event({ clientId: "1.2", sessionId: null }, event, { config: {}, fetchImpl }), false);
  assert.equal(calls.length, 0);
});

function funnelPost(body: Record<string, unknown>, headers: Record<string, string> = {}): Request {
  return new Request("https://tradehustl3.com/api/resume-builder/funnel-events", {
    method: "POST",
    headers: { "content-type": "application/json", Cookie: GA_COOKIES, ...headers },
    body: JSON.stringify(body),
  });
}

test("a consented funnel event is stored and forwarded to GA4 without identifiers", async () => {
  const { DB, sqlite } = sqliteD1();
  const { calls, fetchImpl } = captureFetch();
  const { ctx, settle } = context();

  const response = await handleResumeBuilderRoute(
    funnelPost({
      eventName: "resume_preview_generated",
      anonymousId: "anon-1",
      resumeId: "resume-secret-id",
      analyticsConsent: true,
      metadata: { utm_source: "google", trade: "HVAC" },
    }),
    { DB, GA4_MEASUREMENT_PROTOCOL_API_SECRET: API_SECRET },
    { recoveryContext: ctx, ga4Fetch: fetchImpl },
  );
  await settle();

  assert.equal(response?.status, 201);
  assert.equal((sqlite.prepare("SELECT COUNT(*) AS n FROM funnel_events").get() as { n: number }).n, 1);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /measurement_id=G-PHLN0C7BWF/);
  assert.equal(calls[0].body.client_id, "1234567890.1700000000");
  const [event] = calls[0].body.events;
  assert.equal(event.name, "resume_preview_generated");
  assert.equal(event.params.session_id, "1760650000");
  assert.equal(event.params.utm_source, "google");
  assert.equal(event.params.trade, undefined, "only campaign keys are forwarded");
  assert.doesNotMatch(JSON.stringify(calls[0].body), /resume-secret-id|anon-1/);
});

test("opted-out, GPC, and missing-consent funnel events are stored but never sent to GA4", async () => {
  for (const [body, headers] of [
    [{ analyticsConsent: false }, {}],
    [{}, {}],
    [{ analyticsConsent: true }, { "Sec-GPC": "1" }],
  ] as const) {
    const { DB, sqlite } = sqliteD1();
    const { calls, fetchImpl } = captureFetch();
    const response = await handleResumeBuilderRoute(
      funnelPost({ eventName: "resume_builder_start", anonymousId: "anon-1", ...body }, headers),
      { DB, GA4_MEASUREMENT_PROTOCOL_API_SECRET: API_SECRET },
      { ga4Fetch: fetchImpl },
    );
    assert.equal(response?.status, 201);
    assert.equal((sqlite.prepare("SELECT COUNT(*) AS n FROM funnel_events").get() as { n: number }).n, 1);
    assert.equal(calls.length, 0);
  }
});

test("sign_up is forwarded to GA4 but never written to the Agent #1 funnel table", async () => {
  const { DB, sqlite } = sqliteD1();
  const { calls, fetchImpl } = captureFetch();
  const { ctx, settle } = context();
  const response = await handleResumeBuilderRoute(
    funnelPost({ eventName: "sign_up", anonymousId: "anon-1", analyticsConsent: true }),
    { DB, GA4_MEASUREMENT_PROTOCOL_API_SECRET: API_SECRET },
    { recoveryContext: ctx, ga4Fetch: fetchImpl },
  );
  await settle();
  assert.equal(response?.status, 202);
  assert.equal((sqlite.prepare("SELECT COUNT(*) AS n FROM funnel_events").get() as { n: number }).n, 0);
  assert.equal(calls[0].body.events[0].name, "sign_up");
  assert.equal(calls[0].body.events[0].params.method, "magic_link");
});

test("purchase cannot be submitted through the public funnel endpoint", async () => {
  const { DB } = sqliteD1();
  const { calls, fetchImpl } = captureFetch();
  const response = await handleResumeBuilderRoute(
    funnelPost({ eventName: "purchase", anonymousId: "anon-1", analyticsConsent: true }),
    { DB, GA4_MEASUREMENT_PROTOCOL_API_SECRET: API_SECRET },
    { ga4Fetch: fetchImpl },
  );
  assert.equal(response?.status, 400);
  assert.equal(calls.length, 0);
});

function seedPreviewedResume(sqlite: ReturnType<typeof sqliteD1>["sqlite"]): void {
  seedSession(sqlite);
  sqlite.prepare("INSERT INTO resumes (resume_id, user_id, trade, title, intake_json, generated_json, status) VALUES ('resume-1', 'user-1', 'HVAC & Refrigeration', 'HVAC Technician', '{}', '{}', 'ready')").run();
}

async function withStripe<T>(fn: (forms: URLSearchParams[]) => Promise<T>): Promise<T> {
  const originalFetch = globalThis.fetch;
  const forms: URLSearchParams[] = [];
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    forms.push(new URLSearchParams(String(init?.body)));
    return new Response(JSON.stringify({ id: `cs_test_${forms.length}`, url: "https://checkout.stripe.com/c/pay/test" }), { status: 200 });
  }) as typeof fetch;
  try {
    return await fn(forms);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function checkoutRequest(body: string, cookies = GA_COOKIES): Request {
  return new Request("https://tradehustl3.com/api/resume-builder/resumes/resume-1/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://tradehustl3.com",
      Cookie: `tradehustl3_resume_session=${TEST_SESSION}; ${cookies}`,
    },
    body,
  });
}

const checkoutEnv = (DB: unknown) => ({ DB, STRIPE_SECRET_KEY: "sk_test", STRIPE_RESUME_PRICE_ID: "price_test" }) as never;

test("consented checkout carries only GA ids in Stripe metadata", async () => {
  const { DB, sqlite } = sqliteD1();
  seedPreviewedResume(sqlite);
  await withStripe(async (forms) => {
    const response = await handleBaseResumeBuilderRoute(
      checkoutRequest(JSON.stringify({ analyticsConsent: true, anonymousId: "anon-1" })),
      checkoutEnv(DB),
    );
    assert.equal(response?.status, 200);
    assert.equal(forms[0].get("metadata[ga_client_id]"), "1234567890.1700000000");
    assert.equal(forms[0].get("metadata[ga_session_id]"), "1760650000");
  });
});

test("checkout without consent, with legacy '{}' body, or with GPC adds no GA metadata", async () => {
  for (const [body, extraHeaders] of [
    ["{}", {}],
    ["", {}],
    [JSON.stringify({ analyticsConsent: false }), {}],
    [JSON.stringify({ analyticsConsent: true }), { "Sec-GPC": "1" }],
  ] as const) {
    const { DB, sqlite } = sqliteD1();
    seedPreviewedResume(sqlite);
    await withStripe(async (forms) => {
      const request = checkoutRequest(body);
      for (const [key, value] of Object.entries(extraHeaders)) request.headers.set(key, value);
      const response = await handleBaseResumeBuilderRoute(request, checkoutEnv(DB));
      assert.equal(response?.status, 200, `checkout must still succeed for body ${JSON.stringify(body)}`);
      assert.equal(forms[0].get("metadata[ga_client_id]"), null);
      assert.equal(forms[0].get("metadata[ga_session_id]"), null);
    });
  }
});

function paidEvent(eventId: string, metadata: Record<string, string>): string {
  return JSON.stringify({
    id: eventId,
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_order_1",
        client_reference_id: "order-1",
        payment_status: "paid",
        amount_total: 999,
        currency: "usd",
        payment_intent: "pi_test_1",
        customer_details: { email: "account@example.com" },
        metadata: { order_id: "order-1", resume_id: "resume-1", user_id: "user-1", product: "resume_builder_mvp", ...metadata },
      },
    },
  });
}

async function deliverWebhook(env: Record<string, unknown>, payload: string, dependencies: Record<string, unknown>): Promise<Response | null> {
  const t = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", WEBHOOK_SECRET).update(`${t}.${payload}`).digest("hex");
  return handleResumeBuilderRoute(new Request("https://tradehustl3.com/api/resume-builder/stripe/webhook", {
    method: "POST",
    headers: { "Stripe-Signature": `t=${t},v1=${signature}`, "Content-Type": "application/json" },
    body: payload,
  }), env as never, dependencies as never);
}

function seedPendingOrder(): ReturnType<typeof sqliteD1> {
  const db = sqliteD1();
  seedSession(db.sqlite);
  db.sqlite.prepare("INSERT INTO resumes (resume_id, user_id, trade, title, intake_json, status) VALUES ('resume-1', 'user-1', 'HVAC & Refrigeration', 'HVAC Technician', '{}', 'ready')").run();
  db.sqlite.prepare("INSERT INTO resume_orders (order_id, user_id, resume_id, email, plan, amount_total, currency, status) VALUES ('order-1', 'user-1', 'resume-1', 'account@example.com', 'resume_mvp_999', 999, 'usd', 'pending')").run();
  return db;
}

test("verified Stripe payment sends one GA4 purchase, and replays do not double-count", async () => {
  const { DB, sqlite } = seedPendingOrder();
  const { calls, fetchImpl } = captureFetch();
  const { ctx, settle } = context();
  const env = { DB, STRIPE_RESUME_WEBHOOK_SECRET: WEBHOOK_SECRET, GA4_MEASUREMENT_PROTOCOL_API_SECRET: API_SECRET };
  const metadata = { ga_client_id: "1234567890.1700000000", ga_session_id: "1760650000" };

  assert.equal((await deliverWebhook(env, paidEvent("evt_1", metadata), { recoveryContext: ctx, ga4Fetch: fetchImpl }))?.status, 200);
  assert.equal((await deliverWebhook(env, paidEvent("evt_1", metadata), { recoveryContext: ctx, ga4Fetch: fetchImpl }))?.status, 200);
  await settle();

  assert.equal((sqlite.prepare("SELECT status FROM resume_orders WHERE order_id = 'order-1'").get() as { status: string }).status, "paid");
  assert.equal(calls.length, 1);
  const [event] = calls[0].body.events;
  assert.equal(event.name, "purchase");
  assert.equal(event.params.transaction_id, "order-1");
  assert.equal(event.params.value, 9.99);
  assert.equal(event.params.currency, "USD");
  assert.equal(event.params.session_id, "1760650000");
  assert.doesNotMatch(JSON.stringify(calls[0].body), /account@example\.com|resume-1|user-1/);
});

test("verified payment without consented GA ids still fulfills but sends nothing to GA4", async () => {
  const { DB, sqlite } = seedPendingOrder();
  const { calls, fetchImpl } = captureFetch();
  const env = { DB, STRIPE_RESUME_WEBHOOK_SECRET: WEBHOOK_SECRET, GA4_MEASUREMENT_PROTOCOL_API_SECRET: API_SECRET };
  assert.equal((await deliverWebhook(env, paidEvent("evt_2", {}), { ga4Fetch: fetchImpl }))?.status, 200);
  assert.equal((sqlite.prepare("SELECT COUNT(*) AS n FROM entitlements WHERE source_order_id = 'order-1'").get() as { n: number }).n, 1);
  assert.equal(calls.length, 0);
});
