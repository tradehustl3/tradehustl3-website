import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { type TestContext } from "node:test";
import { handleResumeBuilderRoute } from "../worker/resume-builder-monitored";

// A thrown handler used to reach Cloudflare's raw error page: the base router
// returned handler promises without `await` inside its try, and the monitored
// wrapper rethrew. These tests pin the JSON 500 contract at each layer.

const CUSTOMER_TEXT = "member@example.com";
const SMOKE_SECRET = "s".repeat(40);

function throwingDb(): D1Database {
  const fail = () => { throw new Error(`D1 unavailable for ${CUSTOMER_TEXT}`); };
  return { prepare: fail, batch: fail, exec: fail, dump: fail } as unknown as D1Database;
}

type OperationalEvent = { type?: unknown; event?: unknown; path?: unknown; status?: unknown };

function captureErrors(t: TestContext): unknown[][] {
  const logged: unknown[][] = [];
  t.mock.method(console, "error", (...args: unknown[]) => { logged.push(args); });
  t.mock.method(console, "warn", (...args: unknown[]) => { logged.push(args); });
  return logged;
}

function operationalEvents(logged: unknown[][]): OperationalEvent[] {
  return logged.flat().filter((entry): entry is OperationalEvent =>
    Boolean(entry) && typeof entry === "object" && (entry as OperationalEvent).type === "tradehustl3_operational_event");
}

async function assertJson500(response: Response | null): Promise<void> {
  assert.ok(response, "the route must answer");
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.match(response.headers.get("Content-Type") ?? "", /application\/json/);
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  const body = await response.json() as { ok?: unknown; message?: unknown };
  assert.deepEqual(body, { ok: false, message: "Resume Builder is temporarily unavailable." });
}

test("a handler that throws inside the base router answers JSON 500 with a structured event", async (t) => {
  const logged = captureErrors(t);
  const request = new Request("https://tradehustl3.com/api/resume-builder/me", {
    headers: { Cookie: `tradehustl3_resume_session=${"a".repeat(43)}` },
  });

  await assertJson500(await handleResumeBuilderRoute(request, { DB: throwingDb() }));

  const events = operationalEvents(logged);
  assert.ok(
    events.some((event) => event.event === "resume_builder_unhandled_failure" && event.path === "/api/resume-builder/me"),
    "the unhandled-failure alert still fires",
  );
  assert.ok(!JSON.stringify(logged).includes(CUSTOMER_TEXT), "error text can carry customer data and is never logged");
});

test("a throw above the base router (smoke session) is caught by the monitored boundary", async (t) => {
  const logged = captureErrors(t);
  const request = new Request("https://tradehustl3.com/api/resume-builder/internal/smoke/session", {
    method: "POST",
    headers: { Authorization: `Bearer ${SMOKE_SECRET}`, "CF-Connecting-IP": "203.0.113.9" },
  });

  await assertJson500(await handleResumeBuilderRoute(request, { DB: throwingDb(), SMOKE_TEST_LOGIN_SECRET: SMOKE_SECRET }));

  assert.ok(operationalEvents(logged).some((event) => event.event === "resume_builder_unhandled_failure"));
  assert.ok(!JSON.stringify(logged).includes(CUSTOMER_TEXT));
});

async function signedStripeRequest(payload: string, secret: string): Promise<Request> {
  const timestamp = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`)));
  const hex = Array.from(signature, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return new Request("https://tradehustl3.com/api/resume-builder/stripe/webhook", {
    method: "POST",
    headers: { "Stripe-Signature": `t=${timestamp},v1=${hex}`, "Content-Type": "application/json" },
    body: payload,
  });
}

test("a verified Stripe webhook that fails mid-processing still returns 5xx so Stripe retries", async (t) => {
  const logged = captureErrors(t);
  const secret = "whsec_test_only_not_a_real_secret";
  const orderId = "11111111-1111-4111-8111-111111111111";
  const payload = JSON.stringify({
    id: "evt_test_error_json",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_error_json",
        client_reference_id: orderId,
        payment_status: "paid",
        amount_total: 999,
        currency: "usd",
        payment_intent: "pi_test_error_json",
        customer_details: { email: CUSTOMER_TEXT },
        metadata: {
          product: "resume_builder_mvp",
          order_id: orderId,
          resume_id: "22222222-2222-4222-8222-222222222222",
          user_id: "33333333-3333-4333-8333-333333333333",
        },
      },
    },
  });

  const response = await handleResumeBuilderRoute(
    await signedStripeRequest(payload, secret),
    { DB: throwingDb(), STRIPE_RESUME_WEBHOOK_SECRET: secret },
  );

  await assertJson500(response);
  assert.ok(
    operationalEvents(logged).some((event) => event.event === "resume_stripe_webhook_failed" && event.status === 500),
    "the Stripe webhook alert still fires",
  );
  assert.ok(!JSON.stringify(logged).includes(CUSTOMER_TEXT));
});

test("every dispatch in the base router is awaited inside its try", async () => {
  const source = await readFile(new URL("../worker/resume-builder-base.ts", import.meta.url), "utf8");
  const start = source.indexOf("export async function handleResumeBuilderRoute(");
  const tryBlock = source.slice(source.indexOf("try {", start), source.indexOf("} catch", start));
  assert.ok(tryBlock.length > 0);
  const unawaited = tryBlock.match(/return (?!await\b|json\(|null\b|request\.method)[A-Za-z_]\w*\(/g) ?? [];
  assert.deepEqual(unawaited, [], "an un-awaited return skips the catch and reaches Cloudflare's raw error page");
  assert.match(tryBlock, /\? await getResumeStatus\(/);
  assert.match(tryBlock, /: await updateResume\(/);
});

test("the Worker answers JSON for any API route that throws, and leaves page errors alone", async () => {
  const source = await readFile(new URL("../worker/index.ts", import.meta.url), "utf8");
  const fetchStart = source.indexOf("async fetch(request: Request, env: Env, ctx: ExecutionContext)");
  const fetchBody = source.slice(fetchStart, source.indexOf("async function routeRequest(", fetchStart));
  assert.match(fetchBody, /return await routeRequest\(request, env, ctx, url\)/);
  assert.match(fetchBody, /if \(!url\.pathname\.startsWith\("\/api\/"\)\) throw error;/);
  assert.match(fetchBody, /"api_unhandled_failure"/);
  assert.match(fetchBody, /jsonResponse\(\{ ok: false, message: "This service is temporarily unavailable\. Please try again\." \}, 500\)/);
  assert.match(fetchBody, /withSecurityHeaders\(/);
  assert.doesNotMatch(fetchBody, /error\.message|String\(error\)|console\.error\(error/, "error text is never logged");
  assert.doesNotMatch(source, /export function apiFailureArea/, "the Worker entry module exports only the worker");
});
