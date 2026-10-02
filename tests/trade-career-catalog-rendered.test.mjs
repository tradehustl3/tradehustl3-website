import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const ctx = { waitUntil() {}, passThroughOnException() {} };

async function render(path) {
  const worker = await loadWorker();
  return worker.fetch(new Request(`https://tradehustl3.com${path}`, { headers: { accept: "text/html" } }), env, ctx);
}

test("resume catalog renders one focused H1, exact coverage, and canonical metadata", async () => {
  const response = await render("/resume-examples");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /Built for the trades\. Counted by what is actually here\./i);
  assert.match(html, /<title>207 Skilled-Trade Job Titles &amp; Resume Tracks \| TRADE HUSTL3<\/title>/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/tradehustl3\.com\/resume-examples"/i);
  assert.match(html, /14[\s\S]*Career families/i);
  assert.match(html, /207[\s\S]*Job titles mapped/i);
  assert.match(html, /14[\s\S]*Guided builder tracks/i);
  assert.match(html, /7[\s\S]*Detailed trade guides/i);
  assert.match(html, /50[\s\S]*Field bullet examples/i);
  assert.ok(
    (html.match(/href="\\/resume-examples\\/skilled-trades"/gi) ?? []).length >= 2,
    "expected catalog header and hero links to the detailed skilled-trades guide",
  );
  assert.match(html, /data-item="skilled_trades_resume_examples"/i);
});

test("resume catalog server-renders every family and the requested transportation breadth", async () => {
  const html = await (await render("/resume-examples")).text();
  for (const family of [
    "HVAC &amp; Refrigeration",
    "Electrical &amp; Low Voltage",
    "Facilities, Property &amp; Apartment Maintenance",
    "Commercial Driving &amp; Transportation",
    "Warehouse, Logistics &amp; Material Handling",
    "Industrial &amp; Warehouse Maintenance",
    "Landscaping &amp; Grounds Maintenance",
    "Roadwork, Paving, Concrete &amp; Heavy Equipment",
    "Roofing &amp; Exterior Trades",
    "Automotive, Diesel &amp; Fleet Maintenance",
  ]) assert.ok(html.includes(family), `missing family ${family}`);

  for (const role of ["Class A CDL Driver", "School Bus Driver", "Public Transit Bus Driver", "Chauffeur", "Medical Transport Driver", "Apartment Maintenance Technician", "Asphalt Paver Operator", "Diesel Technician"]) {
    assert.ok(html.includes(role), `missing role ${role}`);
  }

  assert.match(html, /href="\/\?trade=commercial-driving-transportation#resume-start"/i);
  assert.match(html, /placeholder="Try school bus driver, roofer, or apartment maintenance"/i);
  assert.match(html, /One named role is one mapped job title/i);
  assert.match(html, /do not multiply the same resume by colors/i);
});

test("homepage surfaces the truthful catalog counters and catalog link", async () => {
  const html = await (await render("/")).text();
  assert.match(html, /href="\/resume-examples"/i);
  assert.match(html, /Real coverage\. Clear numbers\./i);
  assert.match(html, />14<\/dt>[\s\S]*Career families inside the guided builder/i);
  assert.match(html, />207<\/dt>[\s\S]*job titles mapped/i);
});

test("resume catalog is discoverable in the XML sitemap", async () => {
  const worker = await loadWorker();
  const xml = await (await worker.fetch(new Request("https://tradehustl3.com/sitemap.xml"), env, ctx)).text();
  assert.match(xml, /<loc>https:\/\/tradehustl3\.com\/resume-examples<\/loc>/i);
});
