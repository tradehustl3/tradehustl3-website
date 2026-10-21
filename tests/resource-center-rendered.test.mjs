import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

async function render(pathname) {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 200, pathname);
  return (await response.text()).replace(/<!-- -->/g, "");
}

test("homepage server-renders Know Your Trade with HVAC selected and real buttons", async () => {
  const html = await render("/");
  const start = html.indexOf('id="know-your-trade"');
  assert.ok(start > 0, "section present");
  assert.ok(start > html.indexOf('id="resume-start"'), "comes after the resume start section");
  const section = html.slice(start, html.indexOf("</section>", start));
  for (const label of ["HVAC", "Electrical", "Plumbing", "Facilities", "Welding", "Driving", "Construction"]) {
    assert.match(section, new RegExp(`<button[^>]*aria-pressed="(true|false)"[^>]*>${label}</button>`), `${label} chip`);
  }
  assert.match(section, /<button[^>]*aria-pressed="true"[^>]*data-item="hvac-refrigeration"/);
  assert.match(section, /EPA Section 608 Technician Certification/);
  assert.match(section, /href="\/resources\/certifications#epa-608"/);
  assert.match(section, /OSHA 10 is a certification\./);
  assert.match(section, /href="\/resources"/);
});

test("homepage cover-letter sample no longer calls OSHA 10 a certification", async () => {
  const html = await render("/");
  assert.doesNotMatch(html, /OSHA 10 certifications/);
  assert.match(html, /completed OSHA 10-Hour training/);
});

test("/resources renders the hub with trades, credentials, and sourced BLS data", async () => {
  const html = await render("/resources");
  assert.match(html, /<title>Skilled-Trades Resource Center/);
  assert.match(html, /<link rel="canonical" href="https:\/\/tradehustl3\.com\/resources"/);
  assert.match(html, /href="\/resume-examples#hvac-refrigeration"/);
  assert.match(html, /href="\/resume-examples#automotive-diesel-fleet-maintenance"/);
  assert.match(html, /587,000/);
  assert.match(html, /https:\/\/www\.bls\.gov\/ooh\/construction-and-extraction\//);
  assert.match(html, /should not be added together/);
});

test("/resources/certifications renders every guide with sources, dates, and the reviewer", async () => {
  const html = await render("/resources/certifications");
  for (const slug of ["epa-608", "epa-609", "osha-outreach-10-30", "forklift-operator", "cdl", "nate", "aws-cwi", "isa-certified-arborist"]) {
    assert.match(html, new RegExp(`<article[^>]*id="${slug}"`), slug);
  }
  assert.match(html, /OSHA states the card is not a certification or license/);
  assert.match(html, /Last checked October 21, 2026/);
  assert.match(html, /Reviewed by Zachary Ellis/);
  assert.match(html, /TRADE HUSTL3 CAREER ADVICE/);
  assert.match(html, /href="https:\/\/www\.epa\.gov\/section608\/section-608-technician-certification-requirements"/);
});

test("the sitemap lists the Resource Center pages", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/sitemap.xml"),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  const xml = await response.text();
  assert.match(xml, /<loc>https:\/\/tradehustl3\.com\/resources<\/loc>/);
  assert.match(xml, /<loc>https:\/\/tradehustl3\.com\/resources\/certifications<\/loc>/);
});
