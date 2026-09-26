import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const ctx = { waitUntil() {}, passThroughOnException() {} };
const PATH = "/resume-examples/skilled-trades";

async function renderPage() {
  const worker = await loadWorker();
  return worker.fetch(new Request(`https://tradehustl3.com${PATH}`, { headers: { accept: "text/html" } }), env, ctx);
}

test("skilled-trades examples page renders one focused H1 and complete metadata", async () => {
  const response = await renderPage();
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.equal((html.match(/<h1\b/g) ?? []).length, 1, "expected exactly one H1");
  assert.match(html, /<h1[^>]*>Skilled trades resume examples built for real field work<\/h1>/);
  assert.match(html, /<title>Skilled Trades Resume Examples for 7 Trades \| TRADE HUSTL3<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/tradehustl3\.com\/resume-examples\/skilled-trades"/);
  assert.match(html, /field-specific resume examples for HVAC, electrical, plumbing, carpentry, facilities, welding, and general labor/i);
});

test("page gives distinct, crawlable examples and internal guides for all seven trades", async () => {
  const html = await (await renderPage()).text();
  const expected = [
    ["HVAC &amp; Refrigeration", "/resume-builder/hvac", "manifold gauges"],
    ["Electrical", "/resume-builder/electrician", "EMT"],
    ["Plumbing", "/resume-builder/plumbing", "DWV"],
    ["Construction &amp; Carpentry", "/resume-builder/construction-carpentry", "Framed [X] square feet"],
    ["Facilities Maintenance", "/resume-builder/facilities-maintenance", "CMMS"],
    ["Welding &amp; Fabrication", "/resume-builder/welding-fabrication", "GMAW/FCAW/GTAW/SMAW"],
    ["General Labor / Maintenance Technician", "/resume-builder/general-labor", "material handling"],
  ];

  for (const [label, href, proof] of expected) {
    assert.ok(html.includes(label), `missing trade label: ${label}`);
    assert.match(html, new RegExp(`href="${href}"`), `missing internal guide: ${href}`);
    assert.ok(html.toLowerCase().includes(proof.toLowerCase()), `missing field proof: ${proof}`);
  }

  assert.match(html, /Replace every bracketed placeholder/i);
  assert.match(html, /Never submit a bracket, a borrowed credential, or a made-up metric/i);
  assert.doesNotMatch(html, /guarantee[ds]?\s+(an?\s+)?(interview|job|hire|placement)/i);
});

test("page moves readers to the existing preview-first $9.99 funnel", async () => {
  const html = await (await renderPage()).text();
  const builderLinks = html.match(/href="\/#resume-start"/g) ?? [];
  assert.ok(builderLinks.length >= 5, `expected at least 5 builder links, found ${builderLinks.length}`);
  assert.match(html, /data-item="skilled_trades_resume_examples"/);
  assert.match(html, /Preview before payment/i);
  assert.match(html, /one \$9\.99 payment/i);
  assert.match(html, /No subscription/i);
});

test("page publishes matching WebPage, ItemList, BreadcrumbList, and FAQPage data", async () => {
  const html = await (await renderPage()).text();
  for (const type of ["WebPage", "ItemList", "BreadcrumbList", "FAQPage", "Question"]) {
    assert.ok(html.includes(`"@type":"${type}"`), `missing ${type} schema`);
  }
  assert.match(html, /"numberOfItems":7/);
  assert.match(html, /What if I do not know exact numbers for my resume\?/);
});

test("skilled-trades examples page appears in the sitemap", async () => {
  const worker = await loadWorker();
  const xml = await (await worker.fetch(new Request("https://tradehustl3.com/sitemap.xml"), env, ctx)).text();
  assert.match(xml, /<loc>https:\/\/tradehustl3\.com\/resume-examples\/skilled-trades<\/loc>/);
});
