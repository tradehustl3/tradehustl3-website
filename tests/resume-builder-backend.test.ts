import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { handleResumeBuilderRoute } from "../worker/resume-builder";
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

function fakeDb(options: { generated?: boolean; entitlement?: { used: number; total: number } | null } = {}) {
  const writes: Array<{ sql: string; values: unknown[] }> = [];
  return {
    writes,
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
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

test("magic-link email opens a confirmation page instead of consuming the token", async () => {
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
      new Request("https://tradehustl3.com/api/resume-builder/auth/request", {
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

test("no free AI generation is allowed", async () => {
  const response = await handleResumeBuilderRoute(
    new Request("https://tradehustl3.com/api/resume-builder/resumes/resume-1/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: "{}",
    }),
    { DB: fakeDb({ entitlement: null }) as unknown as D1Database },
  );
  assert.equal(response?.status, 402);
  assert.match(JSON.stringify(await response?.json()), /\$9\.99 payment/i);
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
  assert.equal(entitlement.values.includes("resume_mvp_999"), true);
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
