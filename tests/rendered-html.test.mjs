import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
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

  assert.match(html, /<title>TRADE HUSTL3 \| Built by Hustle, Backed by Trades<\/title>/i);
  assert.match(html, /property="og:title" content="TRADE HUSTL3"/i);
  assert.match(html, /name="twitter:title" content="TRADE HUSTL3"/i);
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
  assert.match(html, /WHO THIS IS FOR/i);
  for (const audience of ["Students exploring skilled trades", "Apprentices and entry-level technicians", "Career changers", "Working tradespeople", "Future supervisors and owners", "Trade schools and workforce programs"]) assert.match(html, new RegExp(audience, "i"));
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
