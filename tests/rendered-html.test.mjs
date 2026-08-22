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
  for (const schemaType of ["Organization", "Person", "WebSite", "Book"]) assert.match(html, new RegExp(`\"@type\":\"${schemaType}\"`, "i"));
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
  assert.match(html, /586 pages/i);
  assert.match(html, /90-Day Action Plan/i);
  assert.match(html, /more than 200 skilled trades/i);
  assert.match(html, /"datePublished":"2026-09-15"/i);
  assert.match(html, /Read a Free Sample/i);
  assert.match(html, /trade-hustl3-free-sample\.pdf/i);
  assert.match(html, /FIRST 10 PAGES/i);
  assert.match(html, /21 CHAPTERS[\s\S]*FOUR PARTS[\s\S]*ONE PLAN/i);
  assert.match(html, /What a Skilled Trade Really Is/i);
  assert.match(html, /Final Word: Build Something That Belongs to You/i);
  assert.match(html, /Launch countdown/i);
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
  const response = await worker.fetch(
    new Request("http://localhost/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "  MEMBER@Example.com ", interest: "HUSTL3 PRO" }),
    }),
    { DB },
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, message: "You're on the TRADE HUSTL3 list." });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].values, ["member@example.com", "HUSTL3 PRO"]);
  assert.match(calls[0].sql, /ON CONFLICT\(email\) DO UPDATE/i);
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

test("server-renders every part of the TRADE HUSTL3 ecosystem", async () => {
  const html = await (await render()).text();
  for (const title of ["The Book", "Resume Builder", "HUSTL3 PRO", "Jobsite Gear", "Program Partnerships"]) assert.match(html, new RegExp(`<h3>${title}<\\/h3>`, "i"));
  assert.match(html, /href="mailto:partners@tradehustl3\.com"/i);
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
