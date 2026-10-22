import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const ctx = { waitUntil() {}, passThroughOnException() {} };
const PATH = "/resume-examples/maintenance-resume-tips";
const BUILDER_HREF = "/?trade=facilities-maintenance#resume-start";

async function renderPath(path) {
  const worker = await loadWorker();
  return worker.fetch(new Request(`https://tradehustl3.com${path}`, { headers: { accept: "text/html" } }), env, ctx);
}

test("maintenance resume guide renders one how-to H1 and complete metadata", async () => {
  const response = await renderPath(PATH);
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.equal((html.match(/<h1\b/g) ?? []).length, 1, "expected exactly one H1");
  assert.match(html, /<h1[^>]*>How to write a maintenance resume that shows the whole job<\/h1>/);
  assert.match(html, /<title>How to Write a Maintenance Resume: 4 Fixes \| TRADE HUSTL3<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/tradehustl3\.com\/resume-examples\/maintenance-resume-tips"/);
  assert.match(html, /<meta name="description" content="How to write a maintenance resume:/);
});

test("guide targets how-to intent and hands example intent to the facilities page", async () => {
  const html = await (await renderPath(PATH)).text();
  // The facilities landing page owns "facility maintenance resume example"; the guide must not claim it.
  assert.doesNotMatch(html, /<title>[^<]*Example/i);
  assert.doesNotMatch(html, /<h1[^>]*>[^<]*example/i);
  const exampleLinks = html.match(/href="\/resume-builder\/facilities-maintenance"/g) ?? [];
  assert.ok(exampleLinks.length >= 2, `expected links to the full example, found ${exampleLinks.length}`);
  assert.match(html, /href="\/resume-examples\/skilled-trades"/);
  for (const id of ["systems", "proof", "credentials", "ats"]) {
    assert.match(html, new RegExp(`id="${id}"`), `missing section #${id}`);
    assert.match(html, new RegExp(`href="#${id}"`), `missing jump link to #${id}`);
  }
});

test("guide keeps credential claims accurate and resume facts grounded", async () => {
  const html = await (await renderPath(PATH)).text();
  assert.match(html, /Type I, Type II, Type III or Universal/);
  assert.match(html, /It is not a certification/);
  assert.doesNotMatch(html, /OSHA[ -](10|30)(-Hour)? certifi/i, "OSHA cards must not be called certifications");
  assert.match(html, /href="https:\/\/www\.epa\.gov\/section608\/section-608-technician-certification-0"/);
  assert.match(html, /href="https:\/\/www\.osha\.gov\/training\/outreach"/);
  assert.match(html, /Only list what you have done/);
  assert.match(html, /Replace every bracket with your own real numbers/);
  assert.match(html, /no invented experience/);
  assert.doesNotMatch(html, /guarantee[ds]?\s+(an?\s+)?(interview|job|hire|placement)/i);
  assert.doesNotMatch(html, /ATS pass rate|beat the ATS/i);
});

test("guide sends readers into the facilities-preselected $9.99 builder", async () => {
  const html = await (await renderPath(PATH)).text();
  const builderLinks = html.match(new RegExp(`href="${BUILDER_HREF.replace(/[?#]/g, "\\$&")}"`, "g")) ?? [];
  assert.ok(builderLinks.length >= 4, `expected at least 4 builder links, found ${builderLinks.length}`);
  assert.match(html, /data-item="maintenance_resume_tips"/);
  for (const location of ["maintenance_tips_header", "maintenance_tips_hero", "maintenance_tips_checklist", "maintenance_tips_closing"]) {
    assert.match(html, new RegExp(`data-location="${location}"`), `missing CTA location ${location}`);
  }
  assert.match(html, /free preview before you pay/i);
  assert.match(html, /One \$9\.99 payment/);
  assert.match(html, /up to three corrections/);
  assert.match(html, /No subscription/);
  assert.match(html, /BUILT BY HUSTLE\. BACKED BY TRADES\./);
});

test("guide publishes Article, BreadcrumbList and FAQPage data that match the page", async () => {
  const html = await (await renderPath(PATH)).text();
  for (const type of ["Article", "BreadcrumbList", "FAQPage", "Question"]) {
    assert.ok(html.includes(`"@type":"${type}"`), `missing ${type} schema`);
  }
  assert.match(html, /"datePublished":"2026-10-14"/);
  assert.match(html, /Is an OSHA 10 card a certification\?/);
  assert.match(html, /<summary>Is an OSHA 10 card a certification\?<\/summary>/);
});

test("guide is in the sitemap and linked from the seven-trade examples page", async () => {
  const worker = await loadWorker();
  const xml = await (await worker.fetch(new Request("https://tradehustl3.com/sitemap.xml"), env, ctx)).text();
  assert.match(xml, /<loc>https:\/\/tradehustl3\.com\/resume-examples\/maintenance-resume-tips<\/loc>/);

  const hub = await (await renderPath("/resume-examples/skilled-trades")).text();
  assert.match(hub, /href="\/resume-examples\/maintenance-resume-tips"/);
});
