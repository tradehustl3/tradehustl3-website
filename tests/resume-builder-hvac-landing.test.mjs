import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const ctx = { waitUntil() {}, passThroughOnException() {} };

async function renderPath(pathname) {
  const worker = await loadWorker();
  return worker.fetch(new Request(`https://tradehustl3.com${pathname}`, { headers: { accept: "text/html" } }), env, ctx);
}

test("HVAC landing page server-renders trade-specific content", async () => {
  const response = await renderPath("/resume-builder/hvac");
  assert.equal(response.status, 200);
  const html = await response.text();

  // Genuine HVAC terminology, server-rendered (crawlable without JS).
  for (const term of [
    "EPA 608",
    "EPA Section 608",
    "preventive maintenance",
    "Rooftop units (RTUs)",
    "split systems",
    "heat pumps",
    "Refrigerant charging",
    "Recovery, evacuation",
    "contactors",
    "capacitors",
    "Superheat / subcooling",
    "Electronic leak detection",
    "Vacuum pump",
    "multimeter",
  ]) {
    assert.ok(html.includes(term), `missing HVAC term: ${term}`);
  }

  // Required structural sections.
  for (const heading of [
    "Built for HVAC field workers at every stage",
    "The HVAC skills employers scan for",
    "EPA 608 first, then the rest",
    "Name the tools that show what you run solo",
    "Example HVAC accomplishment bullets",
    "How the TRADE HUSTL3 Resume Builder works",
    "HVAC resume questions, answered",
  ]) {
    assert.ok(html.includes(heading), `missing section heading: ${heading}`);
  }

  // No unsupported guarantees.
  assert.doesNotMatch(html, /guarantee[ds]?\s+(an?\s+)?(interview|job|hire)/i);
  assert.doesNotMatch(html, /beat the (ats|bots)/i);
});

test("HVAC landing page exposes correct SEO title, description, and canonical", async () => {
  const html = await (await renderPath("/resume-builder/hvac")).text();

  assert.match(html, /<title>HVAC Resume Builder \| HVAC Technician Resume \| TRADE HUSTL3<\/title>/);
  assert.match(
    html,
    /<meta name="description" content="TRADE HUSTL3&#x27;s HVAC Resume Builder turns your EPA 608, tools, and field experience into an ATS-ready HVAC technician resume\. \$9\.99 one-time, no subscription\."/,
  );
  assert.match(html, /<link rel="canonical" href="https:\/\/tradehustl3\.com\/resume-builder\/hvac"/);
  assert.match(html, /property="og:url" content="https:\/\/tradehustl3\.com\/resume-builder\/hvac"/);
  assert.match(html, /property="og:title" content="HVAC Resume Builder \| HVAC Technician Resume \| TRADE HUSTL3"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
});

test("HVAC landing page emits WebPage, BreadcrumbList, and FAQPage structured data", async () => {
  const html = await (await renderPath("/resume-builder/hvac")).text();

  assert.match(html, /"@type":"WebPage"/);
  assert.match(html, /"@type":"BreadcrumbList"/);
  assert.match(html, /"@type":"FAQPage"/);
  assert.match(html, /"@type":"Question"/);
  // Breadcrumb points back to the hub.
  assert.match(html, /"item":"https:\/\/tradehustl3\.com\/resume-builder"/);
});

test("HVAC landing CTAs enter the existing intake flow with HVAC preselected", async () => {
  const html = await (await renderPath("/resume-builder/hvac")).text();

  const ctaHrefs = html.match(/href="\/resume-builder\?trade=hvac"/g) ?? [];
  assert.ok(ctaHrefs.length >= 3, `expected multiple preselect CTAs, found ${ctaHrefs.length}`);
  // Analytics hooks for the global CtaAnalytics delegate.
  assert.match(html, /data-analytics-event="cta_click"/);
  assert.match(html, /data-location="hvac_hero"/);
  // Internal link back to the hub.
  assert.match(html, /href="\/resume-builder"/);
});

test("the Resume Builder hub links to the HVAC landing page", async () => {
  const html = await (await renderPath("/resume-builder")).text();
  assert.match(html, /href="\/resume-builder\/hvac"/);
  assert.match(html, /HVAC resume builder guide/i);
});

test("sitemap.xml includes the HVAC landing page", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(new Request("https://tradehustl3.com/sitemap.xml"), env, ctx);
  assert.equal(response.status, 200);
  const xml = await response.text();
  assert.match(xml, /<loc>https:\/\/tradehustl3\.com\/resume-builder\/hvac<\/loc>/);
});
