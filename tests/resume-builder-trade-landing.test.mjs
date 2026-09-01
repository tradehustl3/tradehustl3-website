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

/** One row per trade landing page. `title` is the exact <title>; `descPrefix` is a
 *  stable, attribute-safe start of the meta description; `terms` are genuinely
 *  trade-specific strings that must be server-rendered (crawlable without JS). */
const PAGES = [
  {
    slug: "hvac",
    title: "HVAC Resume Builder | HVAC Technician Resume | TRADE HUSTL3",
    descPrefix: "TRADE HUSTL3&#x27;s HVAC Resume Builder turns your EPA 608, tools, and field experience into an ATS-ready HVAC technician resume.",
    breadcrumb: "HVAC",
    heroLocation: "hvac_hero",
    analyticsItem: "resume_builder_hvac",
    terms: [
      "EPA Section 608",
      "Refrigerant charging",
      "Superheat / subcooling",
      "Rooftop units (RTUs)",
      "contactors",
      "capacitors",
      "Brazing",
      "Electronic leak detection",
      "preventive maintenance",
      "multimeter",
    ],
  },
  {
    slug: "facilities-maintenance",
    title: "Facilities Maintenance Resume Builder | TRADE HUSTL3",
    descPrefix: "Turn your PMs, work orders, CMMS history, and multi-trade repairs into an ATS-ready maintenance technician resume.",
    breadcrumb: "Facilities Maintenance",
    heroLocation: "facilities_hero",
    analyticsItem: "resume_builder_facilities_maintenance",
    terms: [
      "Preventive maintenance (PM) routes",
      "Corrective / demand maintenance",
      "Work-order intake, prioritization &amp; close-out",
      "Make-ready / unit turnovers",
      "Breakers, receptacles &amp; basic electrical troubleshooting",
      "Pumps, motors, bearings, belts &amp; couplings",
      "Doors, closers, locks &amp; hardware",
      "CMMS / work-order software",
      "Lockout/tagout",
      "Vendor and contractor coordination",
    ],
  },
  {
    slug: "electrician",
    title: "Electrician Resume Builder | Electrical Technician Resume | TRADE HUSTL3",
    descPrefix: "Turn your troubleshooting, wiring, conduit, and panel work into an ATS-ready electrician resume — apprentice to journeyman.",
    breadcrumb: "Electrician",
    heroLocation: "electrician_hero",
    analyticsItem: "resume_builder_electrician",
    terms: [
      "EMT, rigid &amp; PVC conduit bending",
      "Terminations &amp; torque-to-spec",
      "Grounding &amp; bonding",
      "Motor controls, starters &amp; VFDs",
      "NEC familiarity &amp; code compliance",
      "Lockout/tagout (LOTO)",
      "insulation resistance (megger)",
      "clamp-meter diagnostics",
      "Journeyman electrician license",
      "State electrical apprentice registration",
    ],
  },
];

for (const page of PAGES) {
  const path = `/resume-builder/${page.slug}`;

  test(`${page.slug}: 200 + genuinely trade-specific content on the shared RB shell`, async () => {
    const res = await renderPath(path);
    assert.equal(res.status, 200);
    const html = await res.text();

    for (const term of page.terms) {
      assert.ok(html.includes(term), `${page.slug} missing server-rendered term: ${term}`);
    }

    // Native Resume Builder shell — not a bespoke SEO template.
    for (const cls of ["rb-page", "rb-header", "rb-entry", "rb-package-price", "rb-footer"]) {
      assert.match(html, new RegExp(`class="[^"]*\\b${cls}\\b`), `${page.slug} missing ${cls}`);
    }

    // Approved TRADE HUSTL3 Resume Builder logo only — never the standalone mark.
    assert.match(html, /\/resume-builder-logo-llc\.png/, `${page.slug} logo asset`);
    assert.doesNotMatch(html, /src="[^"]*\/trade-hustl3-logo\.png/, `${page.slug} standalone logo leaked`);

    // No unsupported guarantees; example bullets clearly labelled.
    assert.doesNotMatch(html, /guarantee[ds]?\s+(an?\s+)?(interview|job|hire|placement)/i);
    assert.doesNotMatch(html, /(beat|game|trick|hack)\s+the\s+(ats|bots?|system)/i);
    assert.match(html, /these are examples of how/i, `${page.slug} accomplishment disclaimer`);
    assert.match(html, /it does not invent experience/i, `${page.slug} fabrication disclaimer`);
  });

  test(`${page.slug}: exact SEO title/description, production canonical, OG + Twitter`, async () => {
    const html = await (await renderPath(path)).text();

    assert.ok(html.includes(`<title>${page.title}</title>`), `${page.slug} <title>`);
    assert.ok(
      html.includes(`<meta name="description" content="${page.descPrefix}`),
      `${page.slug} meta description prefix`,
    );
    assert.match(
      html,
      new RegExp(`<link rel="canonical" href="https://tradehustl3\\.com${path}"`),
      `${page.slug} canonical`,
    );
    assert.match(html, new RegExp(`property="og:url" content="https://tradehustl3\\.com${path}"`));
    assert.ok(html.includes(`property="og:title" content="${page.title}"`), `${page.slug} og:title`);
    assert.match(html, /name="twitter:card" content="summary_large_image"/);
    // Canonical must never point at a Cloudflare preview host.
    assert.doesNotMatch(html, /rel="canonical"[^>]*workers\.dev/);
  });

  test(`${page.slug}: WebPage + BreadcrumbList + FAQPage structured data`, async () => {
    const html = await (await renderPath(path)).text();
    assert.match(html, /"@type":"WebPage"/);
    assert.match(html, /"@type":"BreadcrumbList"/);
    assert.match(html, /"@type":"FAQPage"/);
    assert.match(html, /"@type":"Question"/);
    assert.match(html, /"item":"https:\/\/tradehustl3\.com\/resume-builder"/, `${page.slug} breadcrumb hub crumb`);
    assert.ok(html.includes(`"name":"${page.breadcrumb}"`), `${page.slug} breadcrumb leaf "${page.breadcrumb}"`);
  });

  test(`${page.slug}: every CTA enters the existing intake with the trade preselected`, async () => {
    const html = await (await renderPath(path)).text();
    const hrefs = html.match(new RegExp(`href="/resume-builder\\?trade=${page.slug}"`, "g")) ?? [];
    assert.ok(hrefs.length >= 4, `${page.slug} expected >=4 preselect CTAs, found ${hrefs.length}`);
    assert.match(html, /data-analytics-event="cta_click"/);
    assert.ok(html.includes(`data-location="${page.heroLocation}"`), `${page.slug} hero CTA location`);
    assert.ok(html.includes(`data-item="${page.analyticsItem}"`), `${page.slug} CTA data-item`);
    assert.match(html, /href="\/resume-builder"/);
  });

  test(`${page.slug}: appears in /sitemap.xml`, async () => {
    const worker = await loadWorker();
    const xml = await (await worker.fetch(new Request("https://tradehustl3.com/sitemap.xml"), env, ctx)).text();
    assert.match(xml, new RegExp(`<loc>https://tradehustl3\\.com${path}</loc>`));
  });
}

test("the Resume Builder hub is a crawlable trade hub linking every trade page", async () => {
  const html = await (await renderPath("/resume-builder")).text();
  for (const page of PAGES) {
    assert.match(html, new RegExp(`href="/resume-builder/${page.slug}"`), `hub missing link to ${page.slug}`);
  }
  for (const label of ["HVAC Resume Builder", "Facilities Maintenance Resume Builder", "Electrician Resume Builder"]) {
    assert.ok(html.includes(label), `hub missing descriptive anchor text: ${label}`);
  }
});

test("each trade page cross-links to its sibling trade guides", async () => {
  const html = await (await renderPath("/resume-builder/hvac")).text();
  assert.match(html, /href="\/resume-builder\/facilities-maintenance"/);
  assert.match(html, /href="\/resume-builder\/electrician"/);
  assert.match(html, /building for a different trade\?/i);
});

test("regression: /resume-builder and /resume-builder/hvac still render on the shared header", async () => {
  for (const p of ["/resume-builder", "/resume-builder/hvac"]) {
    const res = await renderPath(p);
    assert.equal(res.status, 200, `${p} status`);
    const html = await res.text();
    assert.match(html, /\/resume-builder-logo-llc\.png/, `${p} approved logo`);
    assert.doesNotMatch(html, /src="[^"]*\/trade-hustl3-logo\.png/, `${p} standalone logo leaked`);
  }
});
