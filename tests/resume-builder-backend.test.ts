import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { handleResumeBuilderRoute, runResumeBuilderRetention } from "../worker/resume-builder";
import { createResumeDocx, createResumePdf, GeneratedResume } from "../worker/resume-documents";

const sampleResume: GeneratedResume = {
  basics: {
    fullName: "Marcus Reed",
    targetTitle: "HVAC Technician",
    location: "Columbus, OH",
    phone: "614-555-0142",
    email: "marcus.reed@example.com",
  },
  summary: "HVAC service professional with hands-on residential preventive maintenance and control wiring experience.",
  skills: ["Preventive maintenance", "Leak detection", "Control wiring", "Multimeter"],
  certifications: [{ name: "EPA Section 608 Universal", issuer: "ESCO Institute", year: "2024" }],
  experience: [{
    jobTitle: "HVAC Service Helper",
    employer: "Buckeye Comfort Systems",
    location: "Columbus, OH",
    startDate: "June 2023",
    endDate: "Present",
    bullets: [
      "Supported split-system tune-ups alongside lead technicians on residential service routes",
      "Replaced filters and cleaned condenser coils during preventive maintenance visits",
    ],
  }],
  education: [{
    credential: "HVAC Certificate",
    institution: "Columbus State Community College",
    location: "Columbus, OH",
    year: "2023",
  }],
  additionalInformation: ["Valid driver's license and reliable transportation"],
};

function fakeDb(options: {
  generated?: boolean;
  entitlement?: { used: number; total: number } | null;
  rateLimitCount?: number | ((sql: string, values: unknown[]) => number);
} = {}) {
  const writes: Array<{ sql: string; values: unknown[] }> = [];
  return {
    writes,
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async first() {
              if (/RETURNING count/i.test(sql)) {
                const count = typeof options.rateLimitCount === "function"
                  ? options.rateLimitCount(sql, values)
                  : options.rateLimitCount ?? 1;
                return { count };
              }
              if (/FROM sessions s/i.test(sql)) {
                return { user_id: "user-1", email: "member@example.com", full_name: "Member" };
              }
              if (/FROM resumes WHERE/i.test(sql)) {
                return {
                  resume_id: "resume-1",
                  user_id: "user-1",
                  trade: "HVAC & Refrigeration",
                  title: "HVAC Resume",
                  intake_json: JSON.stringify({
                    fullName: "Marcus Reed",
                    email: "member@example.com",
                    experience: [{ employer: "Buckeye Comfort Systems" }],
                  }),
                  generated_json: options.generated ? JSON.stringify(sampleResume) : null,
                  target_job_posting: null,
                  status: options.generated ? "ready" : "draft",
                };
              }
              if (/FROM entitlements/i.test(sql)) {
                if (!options.entitlement) return null;
                return {
                  entitlement_id: "entitlement-1",
                  credits_total: options.entitlement.total,
                  credits_used: options.entitlement.used,
                  status: "active",
                };
              }
              return null;
            },
            async run() {
              writes.push({ sql, values });
              if (/UPDATE entitlements SET credits_used = credits_used \+ 1/i.test(sql)) {
                const allowed = Boolean(options.entitlement && options.entitlement.used < options.entitlement.total);
                return { meta: { changes: allowed ? 1 : 0 } };
              }
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
    async batch() {
      return [];
    },
  };
}

const sessionCookie = "tradehustl3_resume_session=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const context = { waitUntil() {}, passThroughOnException() {} };

async function stripeSignature(payload: string, secret: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  const hex = Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `t=${timestamp},v1=${hex}`;
}

test("magic-link confirmation cannot be consumed by an email scanner GET", async () => {
  const response = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/auth/confirm?token=unused"),
    { DB: fakeDb() as unknown as D1Database },
  );
  assert.equal(response?.status, 405);
  assert.equal(response?.headers.get("allow"), "POST");
});

test("magic-link confirmation revokes older sessions before issuing a new one", async () => {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const DB = {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          const statement = {
            sql,
            values,
            async first() {
              if (/FROM auth_tokens/i.test(sql)) return { user_id: "user-1" };
              if (/SELECT email, full_name FROM users/i.test(sql)) {
                return { email: "member@example.com", full_name: "Member" };
              }
              return null;
            },
            async run() { return { meta: { changes: 1 } }; },
          };
          statements.push(statement);
          return statement;
        },
      };
    },
    async batch() { return []; },
  };
  const rawToken = "B".repeat(43);
  const response = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/auth/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://tradehustl3.com" },
      body: JSON.stringify({ token: rawToken }),
    }),
    { DB: DB as unknown as D1Database },
  );
  assert.equal(response?.status, 200);
  assert.equal(statements.some(({ sql }) => /UPDATE sessions SET revoked_at.*WHERE user_id/i.test(sql)), true);
  assert.equal(statements.some(({ sql }) => /INSERT INTO sessions/i.test(sql)), true);
});

test("magic-link email keeps a Cloudflare preview tester on the preview deployment", async () => {
  const batches: unknown[][] = [];
  const preparedSql: string[] = [];
  const DB = {
    prepare(sql: string) {
      preparedSql.push(sql);
      return {
        bind(...values: unknown[]) {
          return {
            sql,
            values,
            async first() {
              if (/RETURNING count/i.test(sql)) return { count: 1 };
              if (/SELECT user_id FROM users/i.test(sql)) return { user_id: "user-1" };
              return null;
            },
            async run() { return { meta: { changes: 1 } }; },
          };
        },
      };
    },
    async batch(statements: unknown[]) {
      batches.push(statements);
      return [];
    },
  };
  const emailCalls: Array<{ url: string; body: { htmlContent: string } }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    emailCalls.push({ url: String(input), body: JSON.parse(String(init?.body)) as { htmlContent: string } });
    return new Response(null, { status: 201 });
  };
  let response;
  try {
    response = await handleResumeBuilderRoute(
      new Request("https://feature-resume-upload-prefill-v2-tradehustl3-website.tradehustl3.workers.dev/api/resume-builder/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "MEMBER@example.com", fullName: "Marcus Reed" }),
      }),
      { DB: DB as unknown as D1Database, BREVO_API_KEY: "brevo-test" },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(response?.status, 200);
  assert.equal(batches.length, 1);
  assert.equal(emailCalls.length, 1);
  assert.equal(emailCalls[0].url, "https://api.brevo.com/v3/smtp/email");
  assert.match(emailCalls[0].body.htmlContent, /feature-resume-upload-prefill-v2-tradehustl3-website\.tradehustl3\.workers\.dev/i);
  assert.match(emailCalls[0].body.htmlContent, /\/resume-builder\/confirm\?token=/i);
  assert.doesNotMatch(emailCalls[0].body.htmlContent, /\/api\/resume-builder\/auth\/confirm\?token=/i);
  const userInsert = preparedSql.find((sql) => /INSERT INTO users/i.test(sql));
  assert.ok(userInsert);
  assert.match(userInsert, /ON CONFLICT\(email\) DO NOTHING/i);
  assert.doesNotMatch(userInsert, /DO UPDATE SET full_name/i);
});

test("resume intake stays behind an authenticated account", async () => {
  const response = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/resumes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trade: "HVAC & Refrigeration", intake: { fullName: "Marcus Reed" } }),
    }),
    { DB: fakeDb() as unknown as D1Database },
  );
  assert.equal(response?.status, 401);
});

test("the MVP intake records the locked $9.99 price", async () => {
  const DB = fakeDb();
  const response = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/resumes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        trade: "HVAC & Refrigeration",
        title: "HVAC Resume",
        intake: { fullName: "Marcus Reed", experience: [{ employer: "Buckeye Comfort Systems" }] },
      }),
    }),
    { DB: DB as unknown as D1Database },
  );
  assert.equal(response?.status, 201);
  const result = await response?.json() as { price: { amount: number; currency: string } };
  assert.deepEqual(result.price, { amount: 999, currency: "usd" });
  assert.equal(DB.writes.some((write) => /INSERT INTO resumes/i.test(write.sql)), true);
});

test("one watermarked preview generation is allowed before payment", async () => {
  const objects = new Map<string, Uint8Array>();
  const previewResume: GeneratedResume = {
    basics: { fullName: "Marcus Reed", targetTitle: "HVAC Technician", email: "member@example.com" },
    summary: "HVAC service professional with hands-on preventive maintenance experience.",
    skills: ["Preventive maintenance", "Leak detection", "Control wiring", "Multimeter"],
    certifications: [],
    experience: [{
      jobTitle: "HVAC Service Helper",
      employer: "Buckeye Comfort Systems",
      bullets: ["Supported split-system tune-ups alongside lead technicians"],
    }],
    education: [],
    additionalInformation: [],
  };
  const response = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/resumes/resume-1/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: "{}",
    }),
    {
      DB: fakeDb({ entitlement: null }) as unknown as D1Database,
      BOOKS: {
        async put(key: string, bytes: Uint8Array) { objects.set(key, bytes); },
        async delete(key: string) { objects.delete(key); },
      } as unknown as R2Bucket,
      ANTHROPIC_API_KEY: "test-key",
    },
    {
      anthropicFetch: async () => new Response(JSON.stringify({
        content: [{ type: "text", text: JSON.stringify(previewResume) }],
        usage: { input_tokens: 10, output_tokens: 20 },
      }), { status: 200, headers: { "Content-Type": "application/json" } }),
      createDocx: async () => new TextEncoder().encode("DOCX"),
      createPdf: async (_resume, watermarked) => new TextEncoder().encode(watermarked ? "PREVIEW" : "PDF"),
    },
  );
  assert.equal(response?.status, 200);
  const result = await response?.json() as { previewUrl?: string; downloads?: unknown; runNumber?: number };
  assert.match(result.previewUrl ?? "", /\/files\/preview/i);
  assert.equal(result.downloads, null);
  assert.equal(result.runNumber, 1);
  assert.equal(objects.size, 3);
});

test("unpaid AI generation is blocked by the daily attempt quota before the model is called", async () => {
  let modelCalled = false;
  const response = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/resumes/resume-1/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: "{}",
    }),
    {
      DB: fakeDb({
        entitlement: null,
        rateLimitCount: (_sql, values) => String(values[0]).includes("resume-ai-unpaid-user") ? 4 : 1,
      }) as unknown as D1Database,
    },
    {
      anthropicFetch: async () => {
        modelCalled = true;
        return new Response("{}");
      },
    },
  );
  assert.equal(response?.status, 429);
  assert.equal(response?.headers.get("retry-after"), "86400");
  assert.equal(modelCalled, false);
});

test("oversized Resume Builder webhook payloads are rejected before signature work", async () => {
  const response = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/stripe/webhook", {
      method: "POST",
      headers: { "Content-Length": String(300 * 1024), "Stripe-Signature": "invalid" },
      body: "{}",
    }),
    { DB: fakeDb() as unknown as D1Database, STRIPE_RESUME_WEBHOOK_SECRET: "whsec_test" },
  );
  assert.equal(response?.status, 413);
});

test("retention removes stale unpaid resume records and R2 files while preserving paid records", async () => {
  const sqlSeen: string[] = [];
  const batchSql: string[] = [];
  const deletedKeys: string[] = [];
  const DB = {
    prepare(sql: string) {
      sqlSeen.push(sql);
      return {
        bind() {
          return {
            sql,
            async all() {
              return { results: [{ resume_id: "stale-unpaid", object_key: "resume-builder/stale/preview.pdf" }] };
            },
            async run() { return { meta: { changes: 1 } }; },
          };
        },
      };
    },
    async batch(statements: Array<{ sql?: string }>) {
      batchSql.push(...statements.flatMap((statement) => statement.sql ? [statement.sql] : []));
      return [];
    },
  };
  await runResumeBuilderRetention({
    DB: DB as unknown as D1Database,
    BOOKS: { async delete(key: string) { deletedKeys.push(key); } } as unknown as R2Bucket,
  });
  assert.equal(sqlSeen.some((sql) => /NOT EXISTS[\s\S]*entitlements[\s\S]*NOT EXISTS[\s\S]*resume_orders/i.test(sql)), true);
  assert.equal(batchSql.some((sql) => /DELETE FROM resume_files/i.test(sql)), true);
  assert.equal(batchSql.some((sql) => /DELETE FROM resume_generations/i.test(sql)), true);
  assert.deepEqual(deletedKeys, ["resume-builder/stale/preview.pdf"]);
});

test("checkout is unavailable until the watermarked preview exists", async () => {
  const response = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/resumes/resume-1/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: "{}",
    }),
    { DB: fakeDb({ generated: false, entitlement: null }) as unknown as D1Database },
  );
  assert.equal(response?.status, 409);
  assert.match(JSON.stringify(await response?.json()), /watermarked preview before checkout/i);
});

test("an unpaid owner can view only the protected preview file", async () => {
  const DB = {
    prepare(sql: string) {
      return {
        bind() {
          return {
            async first() {
              if (/FROM sessions s/i.test(sql)) return { user_id: "user-1", email: "member@example.com", full_name: "Member" };
              if (/FROM resumes WHERE/i.test(sql)) return {
                resume_id: "resume-1",
                user_id: "user-1",
                trade: "HVAC & Refrigeration",
                title: "HVAC Resume",
                intake_json: "{}",
                generated_json: JSON.stringify(sampleResume),
                target_job_posting: null,
                status: "ready",
              };
              if (/FROM entitlements/i.test(sql)) return null;
              if (/SELECT object_key FROM resume_files/i.test(sql)) return { object_key: "preview.pdf" };
              return null;
            },
          };
        },
      };
    },
  };
  const BOOKS = { async get() { return { body: new TextEncoder().encode("protected preview") }; } };
  const preview = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/resumes/resume-1/files/preview", { headers: { Cookie: sessionCookie } }),
    { DB: DB as unknown as D1Database, BOOKS: BOOKS as unknown as R2Bucket },
  );
  const cleanPdf = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/resumes/resume-1/files/pdf", { headers: { Cookie: sessionCookie } }),
    { DB: DB as unknown as D1Database, BOOKS: BOOKS as unknown as R2Bucket },
  );
  assert.equal(preview?.status, 200);
  assert.match(preview?.headers.get("content-disposition") ?? "", /^inline/i);
  assert.equal(cleanPdf?.status, 404);
});

test("the initial generation plus three corrections is capped at four runs", async () => {
  const response = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/resumes/resume-1/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: "{}",
    }),
    { DB: fakeDb({ entitlement: { used: 4, total: 4 } }) as unknown as D1Database },
  );
  assert.equal(response?.status, 409);
  assert.match(JSON.stringify(await response?.json()), /all permitted AI runs/i);
});

test("a verified $9.99 Stripe event grants exactly four AI runs", async () => {
  const webhookSecret = "whsec_resume_builder_test";
  const event = JSON.stringify({
    id: "evt_resume_builder_paid",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_resume_builder_paid",
        client_reference_id: "order-1",
        payment_status: "paid",
        amount_total: 999,
        currency: "usd",
        payment_intent: "pi_resume_builder_paid",
        customer: "cus_resume_builder",
        customer_details: { email: "member@example.com" },
        metadata: {
          product: "resume_builder_mvp",
          order_id: "order-1",
          resume_id: "resume-1",
          user_id: "user-1",
        },
      },
    },
  });
  const signature = await stripeSignature(event, webhookSecret);
  const batches: Array<Array<{ sql: string; values: unknown[] }>> = [];
  const DB = {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            sql,
            values,
            async first() {
              if (/FROM resume_orders WHERE order_id/i.test(sql)) {
                return {
                  order_id: "order-1",
                  user_id: "user-1",
                  resume_id: "resume-1",
                  email: "member@example.com",
                  amount_total: 999,
                  currency: "usd",
                  status: "pending",
                };
              }
              return null;
            },
            async run() { return { meta: { changes: 1 } }; },
          };
        },
      };
    },
    async batch(statements: Array<{ sql: string; values: unknown[] }>) {
      batches.push(statements);
      return [];
    },
  };
  const response = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/stripe/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Stripe-Signature": signature },
      body: event,
    }),
    { DB: DB as unknown as D1Database, STRIPE_RESUME_WEBHOOK_SECRET: webhookSecret },
  );
  assert.equal(response?.status, 200);
  assert.equal(batches.length, 1);
  const entitlement = batches[0].find((statement) => /INSERT INTO entitlements/i.test(statement.sql));
  assert.ok(entitlement);
  assert.equal(entitlement.values.includes(4), true);
  assert.equal(entitlement.values.includes(1), true);
  assert.equal(entitlement.values.includes("resume_mvp_999"), true);
});

type RefundHarnessOptions = {
  orderStatus?: string;
  paymentIntent?: string | null;
  entitlementStatus?: string | null;
};

function refundHarness(options: RefundHarnessOptions = {}) {
  const state = {
    orderStatus: options.orderStatus ?? "paid",
    paymentIntent: options.paymentIntent === undefined ? "pi_resume_builder_paid" : options.paymentIntent,
    entitlementStatus: options.entitlementStatus === undefined ? "active" : options.entitlementStatus,
    events: new Set<string>(),
  };
  const batches: Array<Array<{ sql: string; values: unknown[] }>> = [];
  const runs: Array<{ sql: string; values: unknown[] }> = [];

  function apply(statement: { sql: string; values: unknown[] }) {
    if (/INSERT OR IGNORE INTO stripe_events/i.test(statement.sql)) {
      state.events.add(String(statement.values[0]));
    }
    if (/UPDATE resume_orders SET status = 'refunded'/i.test(statement.sql)) {
      state.orderStatus = "refunded";
      state.paymentIntent = String(statement.values[0]);
    }
    if (/status = CASE WHEN status = 'refunded'/i.test(statement.sql)) {
      if (state.orderStatus !== "refunded") state.orderStatus = "paid";
      state.paymentIntent = String(statement.values[1]);
    }
    if (/INSERT INTO entitlements/i.test(statement.sql) && state.orderStatus === "paid") {
      state.entitlementStatus = "active";
    }
    if (/UPDATE entitlements SET status = 'revoked'/i.test(statement.sql) && state.entitlementStatus === "active") {
      state.entitlementStatus = "revoked";
    }
  }

  const DB = {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          const statement = {
            sql,
            values,
            async first() {
              if (/FROM sessions s/i.test(sql)) {
                return { user_id: "user-1", email: "member@example.com", full_name: "Member" };
              }
              if (/FROM resumes WHERE/i.test(sql)) {
                return {
                  resume_id: "resume-1",
                  user_id: "user-1",
                  trade: "HVAC & Refrigeration",
                  title: "HVAC Resume",
                  intake_json: JSON.stringify({ fullName: "Marcus Reed" }),
                  generated_json: JSON.stringify(sampleResume),
                  target_job_posting: null,
                  status: "ready",
                };
              }
              if (/FROM entitlements/i.test(sql)) {
                return state.entitlementStatus === "active"
                  ? { entitlement_id: "entitlement-1", credits_total: 4, credits_used: 1, status: "active" }
                  : null;
              }
              if (/FROM resume_orders[\s\S]*stripe_payment_intent_id = \?/i.test(sql)) {
                const paymentIntent = String(values[0]);
                const metadataOrderId = String(values[1]);
                const matches = state.paymentIntent === paymentIntent
                  || (state.paymentIntent === null && metadataOrderId === "order-1");
                return matches ? {
                  order_id: "order-1",
                  amount_total: 999,
                  currency: "usd",
                  status: state.orderStatus,
                  stripe_payment_intent_id: state.paymentIntent,
                } : null;
              }
              if (/FROM resume_orders WHERE order_id/i.test(sql)) {
                return {
                  order_id: "order-1",
                  user_id: "user-1",
                  resume_id: "resume-1",
                  email: "member@example.com",
                  amount_total: 999,
                  currency: "usd",
                  status: state.orderStatus,
                };
              }
              return null;
            },
            async run() {
              runs.push({ sql, values });
              apply({ sql, values });
              return { meta: { changes: 1 } };
            },
          };
          return statement;
        },
      };
    },
    async batch(statements: Array<{ sql: string; values: unknown[] }>) {
      batches.push(statements);
      for (const statement of statements) apply(statement);
      return [];
    },
  };
  return { state, batches, runs, DB };
}

async function sendRefundEvent(
  DB: ReturnType<typeof refundHarness>["DB"],
  options: {
    eventId: string;
    amountRefunded: number;
    latestRefundAmount?: number;
    paymentIntent?: string;
    signature?: string;
  },
) {
  const webhookSecret = "whsec_resume_builder_test";
  const payload = JSON.stringify({
    id: options.eventId,
    type: "charge.refunded",
    data: {
      object: {
        id: "ch_resume_builder_paid",
        amount: 999,
        amount_refunded: options.amountRefunded,
        currency: "usd",
        payment_intent: options.paymentIntent ?? "pi_resume_builder_paid",
        metadata: { product: "resume_builder_mvp", order_id: "order-1" },
        refunds: { data: [{ amount: options.latestRefundAmount ?? options.amountRefunded }] },
      },
    },
  });
  const signature = options.signature ?? await stripeSignature(payload, webhookSecret);
  return handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/stripe/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Stripe-Signature": signature },
      body: payload,
    }),
    { DB: DB as unknown as D1Database, STRIPE_RESUME_WEBHOOK_SECRET: webhookSecret },
  );
}

test("a partial refund keeps generation and download entitlement active", async () => {
  const harness = refundHarness();
  const response = await sendRefundEvent(harness.DB, {
    eventId: "evt_refund_partial",
    amountRefunded: 500,
  });
  assert.equal(response?.status, 200);
  assert.equal(harness.state.orderStatus, "paid");
  assert.equal(harness.state.entitlementStatus, "active");
  assert.deepEqual([...harness.state.events], ["evt_refund_partial"]);
  assert.equal(harness.batches.length, 0, "partial refunds must not revoke access");
});

test("sequential partial refunds revoke only when the cumulative charge total reaches $9.99", async () => {
  const harness = refundHarness();
  await sendRefundEvent(harness.DB, {
    eventId: "evt_refund_first_500",
    amountRefunded: 500,
    latestRefundAmount: 500,
  });
  assert.equal(harness.state.orderStatus, "paid");
  assert.equal(harness.state.entitlementStatus, "active");

  const response = await sendRefundEvent(harness.DB, {
    eventId: "evt_refund_remaining_499",
    amountRefunded: 999,
    latestRefundAmount: 499,
  });
  assert.equal(response?.status, 200);
  assert.equal(harness.state.orderStatus, "refunded");
  assert.equal(harness.state.entitlementStatus, "revoked");
  assert.equal(harness.state.events.size, 2);
  assert.equal(harness.batches.length, 1);
  assert.ok(harness.batches[0].some((statement) => /UPDATE resume_orders SET status = 'refunded'/i.test(statement.sql)));
  assert.ok(harness.batches[0].some((statement) => /UPDATE entitlements SET status = 'revoked'/i.test(statement.sql)));
});

test("a fully refunded order cannot generate or download resume files", async () => {
  const harness = refundHarness();
  await sendRefundEvent(harness.DB, {
    eventId: "evt_full_refund_access_check",
    amountRefunded: 999,
  });

  const statusResponse = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/resumes/resume-1", {
      headers: { Cookie: sessionCookie },
    }),
    { DB: harness.DB as unknown as D1Database },
  );
  const status = await statusResponse?.json() as { resume?: { paid?: boolean } };
  assert.equal(statusResponse?.status, 200);
  assert.equal(status.resume?.paid, false);

  const generationResponse = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/resumes/resume-1/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: "{}",
    }),
    { DB: harness.DB as unknown as D1Database },
  );
  assert.equal(generationResponse?.status, 402);

  const downloadResponse = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/resumes/resume-1/files/pdf", {
      headers: { Cookie: sessionCookie },
    }),
    { DB: harness.DB as unknown as D1Database },
  );
  assert.equal(downloadResponse?.status, 404);
});

test("a forged refund cannot record an event or revoke access", async () => {
  const harness = refundHarness();
  const response = await sendRefundEvent(harness.DB, {
    eventId: "evt_forged_refund",
    amountRefunded: 999,
    signature: "t=1,v1=not-a-valid-signature",
  });
  assert.equal(response?.status, 400);
  assert.equal(harness.state.events.size, 0);
  assert.equal(harness.state.orderStatus, "paid");
  assert.equal(harness.state.entitlementStatus, "active");
  assert.equal(harness.runs.length, 0);
  assert.equal(harness.batches.length, 0);
});

test("a refund for an unrelated Stripe payment cannot revoke a Resume Builder order", async () => {
  const harness = refundHarness();
  const response = await sendRefundEvent(harness.DB, {
    eventId: "evt_unrelated_refund",
    amountRefunded: 999,
    paymentIntent: "pi_unrelated_payment",
  });
  assert.equal(response?.status, 200);
  assert.equal(harness.state.orderStatus, "paid");
  assert.equal(harness.state.entitlementStatus, "active");
  assert.deepEqual([...harness.state.events], ["evt_unrelated_refund"]);
});

test("a full refund arriving before checkout completion cannot be overwritten by a late payment event", async () => {
  const harness = refundHarness({ orderStatus: "pending", paymentIntent: null, entitlementStatus: null });
  await sendRefundEvent(harness.DB, {
    eventId: "evt_refund_before_checkout",
    amountRefunded: 999,
  });
  assert.equal(harness.state.orderStatus, "refunded");

  const checkoutPayload = JSON.stringify({
    id: "evt_checkout_after_refund",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_resume_builder_paid",
        client_reference_id: "order-1",
        payment_status: "paid",
        amount_total: 999,
        currency: "usd",
        payment_intent: "pi_resume_builder_paid",
        customer: "cus_resume_builder",
        customer_details: { email: "member@example.com" },
        metadata: {
          product: "resume_builder_mvp",
          order_id: "order-1",
          resume_id: "resume-1",
          user_id: "user-1",
        },
      },
    },
  });
  const webhookSecret = "whsec_resume_builder_test";
  const response = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/stripe/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Stripe-Signature": await stripeSignature(checkoutPayload, webhookSecret),
      },
      body: checkoutPayload,
    }),
    { DB: harness.DB as unknown as D1Database, STRIPE_RESUME_WEBHOOK_SECRET: webhookSecret },
  );
  assert.equal(response?.status, 200);
  assert.equal(harness.state.orderStatus, "refunded");
  assert.equal(harness.state.entitlementStatus, null);
  const entitlementInsert = harness.batches.at(-1)?.find((statement) => /INSERT INTO entitlements/i.test(statement.sql));
  assert.match(entitlementInsert?.sql ?? "", /WHERE EXISTS[\s\S]*status = 'paid'/i);
});

test("clean DOCX and clean/watermarked PDF generators produce valid files", async () => {
  const [docx, pdf, preview] = await Promise.all([
    createResumeDocx(sampleResume),
    createResumePdf(sampleResume, false),
    createResumePdf(sampleResume, true),
  ]);
  assert.equal(new TextDecoder().decode(docx.slice(0, 2)), "PK");
  assert.equal(new TextDecoder().decode(pdf.slice(0, 5)), "%PDF-");
  assert.equal(new TextDecoder().decode(preview.slice(0, 5)), "%PDF-");
  assert.ok(docx.byteLength > 5_000);
  assert.ok(preview.byteLength > pdf.byteLength);
  assert.ok((await PDFDocument.load(pdf)).getPageCount() >= 1);
  assert.ok((await PDFDocument.load(preview)).getPageCount() >= 1);
});

void context;
