import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function renderPath(pathname = "/") {
  const worker = await loadWorker();
  return worker.fetch(new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

async function render() {
  return renderPath("/");
}

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

async function createStripeSignature(payload, secret) {
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

test("server-renders the corrected TRADE HUSTL3 brand and metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();

  assert.match(html, /<title>TRADE HUSTL3 \| Skilled Trades Career Guide &amp; Resources<\/title>/i);
  assert.match(html, /property="og:title" content="TRADE HUSTL3 \| Skilled Trades Career Guide &amp; Resources"/i);
  assert.match(html, /name="twitter:title" content="TRADE HUSTL3 \| Skilled Trades Career Guide &amp; Resources"/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/tradehustl3\.com\/?"/i);
  assert.match(html, /property="og:url" content="https:\/\/tradehustl3\.com\/?"/i);
  assert.match(html, /property="og:image" content="https:\/\/tradehustl3\.com\/og\.png"/i);
  assert.equal(html.includes("localhost:3000"), false);
  for (const schemaType of ["Organization", "Person", "WebSite", "Book"]) assert.match(html, new RegExp(`"@type":"${schemaType}"`, "i"));
  assert.match(html, /aria-label="TRADE HUSTL3 home"/i);
  assert.equal(html.toUpperCase().includes("TRA" + "D3"), false);
  assert.match(html, /trade-hustl3-logo\.png/i);
  assert.match(html, /alt="TRADE HUSTL3 logo"/i);
  assert.match(html, /BUILT BY[\s\S]*HUSTLE\.[\s\S]*BACKED BY[\s\S]*TRADES\./i);
  assert.match(html, /aria-label="Enter, Earn, Elevate"/i);
});

test("server-renders credibility and audience content", async () => {
  const html = await (await render()).text();
  assert.match(html, /BUILT FROM[\s\S]*THE[\s\S]*FIELD\./i);
  assert.match(html, /real field experience and trades supervision—not theory/i);
  assert.match(html, /Zachary Ellis/i);
  assert.match(html, /9798193043355/i);
  assert.match(html, /WHO THIS IS FOR/i);
  for (const audience of ["Students exploring skilled trades", "Apprentices and entry-level technicians", "Career changers", "Working tradespeople", "Future supervisors and owners", "Trade schools and workforce programs"]) assert.match(html, new RegExp(audience, "i"));
});

test("publishes a canonical XML sitemap and robots discovery hints", async () => {
  const worker = await loadWorker();
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const ctx = { waitUntil() {}, passThroughOnException() {} };

  const sitemapResponse = await worker.fetch(new Request("https://tradehustl3.com/sitemap.xml"), env, ctx);
  assert.equal(sitemapResponse.status, 200);
  assert.match(sitemapResponse.headers.get("content-type") ?? "", /xml/i);
  const sitemap = await sitemapResponse.text();
  assert.match(sitemap, /<loc>https:\/\/tradehustl3\.com<\/loc>/i);
  assert.match(sitemap, /<loc>https:\/\/tradehustl3\.com\/book<\/loc>/i);

  const robotsResponse = await worker.fetch(new Request("https://tradehustl3.com/robots.txt"), env, ctx);
  assert.equal(robotsResponse.status, 200);
  const robots = await robotsResponse.text();
  assert.match(robots, /User-Agent:\s*\*/i);
  assert.match(robots, /Allow:\s*\//i);
  assert.match(robots, /Sitemap:\s*https:\/\/tradehustl3\.com\/sitemap\.xml/i);
});

test("server-renders the official book page, cover, portrait, and current edition details", async () => {
  const response = await renderPath("/book");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /<title>TRADE HUSTL3 Book \| Zachary Ellis<\/title>/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/tradehustl3\.com\/book"/i);
  assert.match(html, /trade-hustl3-book-cover\.jpg/i);
  assert.match(html, /zachary-ellis-author\.jpg/i);
  assert.match(html, /DA[\s\S]*MAINTENANCE[\s\S]*MANE\./i);
  assert.equal(html.includes("Zachary Cameron Ellis"), false);
  assert.match(html, /September 15, 2026/i);
  assert.match(html, /Current KDP ISBN/i);
  assert.match(html, /9798193043355/i);
  assert.match(html, /No experience required/i);
  assert.match(html, /90-Day Action Plan/i);
  assert.match(html, /more than 200 skilled trades/i);
  assert.match(html, /"datePublished":"2026-09-15"/i);
  assert.match(html, /Read a Free Sample/i);
  assert.match(html, /UNLOCK THE FREE SAMPLE/i);
  assert.match(html, /EMAIL TO RECEIVE THE SAMPLE/i);
  assert.doesNotMatch(html, /href="\/trade-hustl3-free-sample\.pdf/i);
  assert.match(html, /FIRST 7 PAGES/i);
  assert.match(html, /21 CHAPTERS[\s\S]*FOUR PARTS[\s\S]*ONE PLAN/i);
  assert.match(html, /What a Skilled Trade Really Is/i);
  assert.match(html, /Final Word: Build Something That Belongs to You/i);
  assert.match(html, /Launch countdown/i);
  assert.match(html, /Earn your own/i);
  assert.match(html, /BUILT BY HUSTL3[\s\S]*BACKED BY TRADES/i);
  assert.equal(html.includes("fell through an attic"), false);
});

test("redirects the duplicate www hostname to the canonical domain", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://www.tradehustl3.com/resources?from=www"),
    {},
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://tradehustl3.com/resources?from=www");
});

test("server-renders the required segmented signup", async () => {
  const html = await (await render()).text();
  assert.match(html, /I(?:&#x27;|')M INTERESTED IN/i);
  assert.match(html, /<select[^>]+id="interest"[^>]+required/i);
  for (const interest of ["The TRADE HUSTL3 Book", "Resume Builder", "HUSTL3 PRO", "Jobsite Gear", "School / Workforce Partnership", "General TRADE HUSTL3 Updates"]) assert.match(html, new RegExp(interest.replace("/", "\\/"), "i"));
  assert.match(html, /type="email"/i);
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) assert.match(html, new RegExp(`name="${key}"`, "i"));
});

test("subscriber endpoint validates and stores normalized signups", async () => {
  const worker = await loadWorker();
  const calls = [];
  const brevoCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    brevoCalls.push({ input: String(input), init });
    return new Response(null, { status: 201 });
  };
  const DB = {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async run() {
              calls.push({ sql, values });
              return { success: true };
            },
          };
        },
      };
    },
  };
  let response;
  try {
    response = await worker.fetch(
      new Request("http://localhost/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "  MEMBER@Example.com ",
          interest: "HUSTL3 PRO",
          utm_source: "google",
          utm_medium: "organic",
          utm_campaign: "book-launch",
        }),
      }),
      { DB, BREVO_API_KEY: "test-brevo-key", BREVO_LIST_ID: "3" },
      { waitUntil() {}, passThroughOnException() {} },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, message: "You're on the TRADE HUSTL3 list." });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].values, ["member@example.com", "HUSTL3 PRO"]);
  assert.match(calls[0].sql, /ON CONFLICT\(email\) DO UPDATE/i);
  assert.equal(brevoCalls.length, 1);
  assert.equal(brevoCalls[0].input, "https://api.brevo.com/v3/contacts");
  assert.equal(brevoCalls[0].init.headers["api-key"], "test-brevo-key");
  assert.deepEqual(JSON.parse(brevoCalls[0].init.body), {
    email: "member@example.com",
    attributes: {
      INTEREST: "HUSTL3 PRO",
      SIGNUP_SOURCE: "website",
      UTM_SOURCE: "google",
      UTM_MEDIUM: "organic",
      UTM_CAMPAIGN: "book-launch",
    },
    listIds: [3],
    updateEnabled: true,
  });
});

test("subscriber endpoint rejects invalid submissions", async () => {
  const worker = await loadWorker();
  let prepared = false;
  const response = await worker.fetch(
    new Request("http://localhost/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", interest: "Unknown" }),
    }),
    { DB: { prepare() { prepared = true; } } },
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(response.status, 400);
  assert.equal(prepared, false);
});

test("book signup unlocks and emails the gated seven-page sample", async () => {
  const worker = await loadWorker();
  const brevoCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    brevoCalls.push({ input: String(input), body: JSON.parse(String(init.body)) });
    return new Response(null, { status: 201 });
  };
  const DB = {
    prepare() {
      return {
        bind() {
          return { async run() { return { success: true }; } };
        },
      };
    },
  };

  let signupResponse;
  try {
    signupResponse = await worker.fetch(
      new Request("https://tradehustl3.com/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "reader@example.com", interest: "The TRADE HUSTL3 Book" }),
      }),
      { DB, BREVO_API_KEY: "test-brevo-key", BREVO_LIST_ID: "3" },
      { waitUntil() {}, passThroughOnException() {} },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(signupResponse.status, 200);
  const result = await signupResponse.json();
  assert.equal(result.ok, true);
  assert.equal(result.sampleUrl, "/api/free-sample");
  assert.match(signupResponse.headers.get("set-cookie") ?? "", /tradehustl3_sample_access=granted/i);
  assert.deepEqual(brevoCalls.map((call) => call.input), [
    "https://api.brevo.com/v3/contacts",
    "https://api.brevo.com/v3/smtp/email",
  ]);
  assert.match(brevoCalls[1].body.htmlContent, /https:\/\/tradehustl3\.com\/api\/free-sample\?token=/i);

  const cookie = (signupResponse.headers.get("set-cookie") ?? "").split(";")[0];
  const sampleResponse = await worker.fetch(
    new Request("https://tradehustl3.com/api/free-sample", { headers: { Cookie: cookie } }),
    {
      BREVO_API_KEY: "test-brevo-key",
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(sampleResponse.status, 200);
  assert.match(sampleResponse.headers.get("content-type") ?? "", /application\/pdf/i);
  assert.match(await sampleResponse.text(), /^%PDF-/);
});

test("direct sample access is sent back to the signup gate", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://tradehustl3.com/trade-hustl3-free-sample.pdf"),
    {},
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "https://tradehustl3.com/book#sample");
});

test("keeps the direct eBook gated until the September 15 launch", async () => {
  const html = await (await renderPath("/book")).text();
  assert.match(html, /DIRECT eBOOK/i);
  assert.match(html, /\$9\.99/i);
  assert.match(html, /Available September 15/i);
  assert.match(html, /Secure PDF delivered by email after payment/i);
  assert.doesNotMatch(html, /href="https:\/\/buy\.stripe\.com\/4gM5kwaQ96EscGf2uKbfO02"/i);
});

test("renders a private order-confirmation page", async () => {
  const response = await renderPath("/book/order-confirmed");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /PAYMENT CONFIRMED/i);
  assert.match(html, /private download link/i);
  assert.match(html, /name="robots" content="noindex, nofollow"/i);
});

test("verifies paid Stripe eBook orders, emails a private link, and serves the R2 file", async () => {
  const worker = await loadWorker();
  const webhookSecret = "whsec_test_trade_hustl3";
  const paymentLinkId = "plink_trade_hustl3_ebook";
  const sessionId = "cs_live_trade_hustl3";
  const event = JSON.stringify({
    type: "checkout.session.completed",
    data: {
      object: {
        id: sessionId,
        payment_link: paymentLinkId,
        payment_status: "paid",
        amount_total: 999,
        currency: "usd",
        customer_details: { email: "BUYER@example.com" },
      },
    },
  });
  const signature = await createStripeSignature(event, webhookSecret);
  let order;
  const DB = {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async run() {
              if (/INSERT OR IGNORE INTO ebook_orders/i.test(sql) && !order) {
                order = {
                  stripe_session_id: values[0],
                  email: values[1],
                  payment_link_id: values[2],
                  amount_total: values[3],
                  currency: values[4],
                  status: "paid",
                  download_token: values[5],
                  emailed_at: null,
                };
              }
              if (/UPDATE ebook_orders SET emailed_at/i.test(sql) && order) order.emailed_at = "2026-09-15 04:00:00";
              return { success: true };
            },
            async first() {
              if (/WHERE stripe_session_id/i.test(sql) && order?.stripe_session_id === values[0]) {
                return { download_token: order.download_token, emailed_at: order.emailed_at };
              }
              if (/WHERE download_token/i.test(sql) && order?.download_token === values[0]) {
                return { stripe_session_id: order.stripe_session_id };
              }
              return null;
            },
          };
        },
      };
    },
  };
  const BOOKS = {
    async get(key) {
      assert.equal(key, "TRADE-HUSTL3-COMPLETE-EBOOK.pdf");
      return { body: "%PDF-complete-ebook", httpEtag: '"ebook-etag"' };
    },
  };
  const brevoCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    brevoCalls.push({ input: String(input), body: JSON.parse(String(init.body)) });
    return new Response(null, { status: 201 });
  };

  let webhookResponse;
  try {
    webhookResponse = await worker.fetch(
      new Request("https://tradehustl3.com/api/stripe/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Stripe-Signature": signature },
        body: event,
      }),
      {
        DB,
        BOOKS,
        BREVO_API_KEY: "brevo-test-key",
        BREVO_SAMPLE_SENDER_EMAIL: "updates@tradehustl3.com",
        STRIPE_WEBHOOK_SECRET: webhookSecret,
        STRIPE_EBOOK_PAYMENT_LINK_ID: paymentLinkId,
      },
      { waitUntil() {}, passThroughOnException() {} },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(webhookResponse.status, 200);
  assert.deepEqual(await webhookResponse.json(), { received: true });
  assert.equal(order.email, "buyer@example.com");
  assert.equal(brevoCalls.length, 1);
  assert.equal(brevoCalls[0].input, "https://api.brevo.com/v3/smtp/email");
  assert.match(brevoCalls[0].body.subject, /eBook is ready/i);
  const downloadUrl = brevoCalls[0].body.htmlContent.match(/href="([^"]+\/api\/ebook-download\?token=[^"]+)"/i)?.[1];
  assert.ok(downloadUrl);

  const ebookResponse = await worker.fetch(
    new Request(downloadUrl),
    { DB, BOOKS },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(ebookResponse.status, 200);
  assert.match(ebookResponse.headers.get("content-type") ?? "", /application\/pdf/i);
  assert.match(ebookResponse.headers.get("content-disposition") ?? "", /TRADE-HUSTL3-Complete-eBook\.pdf/i);
  assert.equal(await ebookResponse.text(), "%PDF-complete-ebook");
});

test("server-renders every part of the TRADE HUSTL3 ecosystem", async () => {
  const html = await (await render()).text();
  for (const title of ["The Book", "Resume Builder", "HUSTL3 PRO", "Jobsite Gear", "Program Partnerships"]) assert.match(html, new RegExp(`<h3>${title}<\\/h3>`, "i"));
  assert.match(html, /href="\/resume"/i);
  assert.match(html, /href="mailto:partners@tradehustl3\.com"/i);
});

test("routes the branded resume link to the Resume Builder", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://tradehustl3.com/resume"),
    {},
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "https://trad3-hustl3-resume.maintenanceman.chatgpt.site/");
});

test("uses the official navy, red, and gold palette", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /--navy:#071A2B/i);
  assert.match(css, /--red:#D9361E/i);
  assert.match(css, /--gold:#D6A52A/i);
  assert.match(css, /background:var\(--navy\)/i);
  assert.match(css, /background:var\(--red\)/i);
  assert.match(css, /color:var\(--gold\)|border[^;]*var\(--gold\)/i);
});
