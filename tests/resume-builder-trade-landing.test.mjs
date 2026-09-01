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
    descPrefix: "TRADE HUSTL3's HVAC Resume Builder turns your EPA 608, tools, and field experience into an ATS-ready HVAC technician resume.",
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
  {
    slug: "plumbing",
    title: "Plumbing Resume Builder | Plumber Resume | TRADE HUSTL3",
    descPrefix: "Turn your service calls, rough-in, fixture sets, and drain and water-heater work into an ATS-ready plumber resume.",
    breadcrumb: "Plumbing",
    heroLocation: "plumbing_hero",
    analyticsItem: "resume_builder_plumbing",
    terms: [
      "DWV (drain, waste, vent) rough-in",
      "Water distribution — copper, PEX, CPVC, PVC",
      "Soldering, brazing, press &amp; solvent-weld joints",
      "Water heater &amp; tankless install and repair",
      "Drain cleaning, augering &amp; hydro-jetting",
      "Backflow preventers &amp; testing",
      "Sewer camera &amp; line locating",
      "Journeyman plumber license (state or municipal)",
      "Registered plumbing apprentice",
      "Pipe wrenches &amp; basin wrench",
    ],
  },
  {
    slug: "welding-fabrication",
    title: "Welding Resume Builder | Welder & Fabricator Resume | TRADE HUSTL3",
    descPrefix: "Turn your processes, positions, materials, and fit-up into an ATS-ready welder and fabricator resume.",
    breadcrumb: "Welding & Fabrication",
    heroLocation: "welding_hero",
    analyticsItem: "resume_builder_welding_fabrication",
    terms: [
      "GMAW / MIG (short-circuit, spray, pulse)",
      "FCAW (gas-shielded &amp; self-shielded)",
      "GTAW / TIG (steel, stainless, aluminum)",
      "Pipe positions 2G, 5G, 6G",
      "Blueprint &amp; weld-symbol reading",
      "Fit-up, tacking &amp; clamping",
      "Plasma &amp; track-torch cutting",
      "AWS D1.1 structural (process / position)",
      "ASME Section IX (process / position / thickness)",
      "6G pipe qualification",
    ],
  },
  {
    slug: "construction-carpentry",
    title: "Carpenter & Construction Resume Builder | TRADE HUSTL3",
    descPrefix: "Turn your framing, finish, layout, and jobsite work into an ATS-ready carpenter and construction resume.",
    breadcrumb: "Construction & Carpentry",
    heroLocation: "construction_hero",
    analyticsItem: "resume_builder_construction_carpentry",
    terms: [
      "Wall, floor &amp; roof framing",
      "Layout from plans — lines, grade, elevations",
      "Door hanging &amp; hardware",
      "Base, casing, crown &amp; build-ups",
      "Formwork — footings, walls, flatwork",
      "Blueprint &amp; spec reading",
      "Punch lists, QC &amp; cleanup",
      "Carpentry apprenticeship (union or non-union)",
      "Framing &amp; finish nailers",
      "Laser level &amp; transit / builder’s level",
    ],
  },
  {
    slug: "general-labor",
    title: "General Labor Resume Builder | Laborer & Maintenance | TRADE HUSTL3",
    descPrefix: "Turn your material handling, basic repairs, and work-order support into an ATS-ready general labor and maintenance resume.",
    breadcrumb: "General Labor / Maintenance",
    heroLocation: "general_labor_hero",
    analyticsItem: "resume_builder_general_labor",
    terms: [
      "Preventive maintenance — filters, belts, lubrication",
      "Light electrical — outlets, switches, lamps, breaker resets",
      "Light plumbing — faucets, flush valves, supply lines, clogs",
      "Work-order intake, updates &amp; close-out",
      "CMMS / mobile work-order apps",
      "Loading, unloading &amp; staging material",
      "Forklift / powered-industrial-truck operator",
      "Grounds — mowing, trimming, snow, salt",
      "Lockout/tagout (basic)",
      "Pallet jack &amp; hand truck",
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
    assert.match(
      html,
      /it does not invent (experience|processes|hours)/i,
      `${page.slug} "does not invent" disclaimer`,
    );
  });

  test(`${page.slug}: exact SEO title/description, production canonical, OG + Twitter`, async () => {
    const html = await (await renderPath(path)).text();

    // Titles/descriptions are HTML-attribute-escaped in the rendered markup.
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

    assert.ok(html.includes(`<title>${esc(page.title)}</title>`), `${page.slug} <title>`);
    assert.ok(
      html.includes(`<meta name="description" content="${esc(page.descPrefix)}`),
      `${page.slug} meta description prefix`,
    );
    assert.match(
      html,
      new RegExp(`<link rel="canonical" href="https://tradehustl3\\.com${path}"`),
      `${page.slug} canonical`,
    );
    assert.match(html, new RegExp(`property="og:url" content="https://tradehustl3\\.com${path}"`));
    assert.ok(html.includes(`property="og:title" content="${esc(page.title)}"`), `${page.slug} og:title`);
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

test("the Resume Builder hub is a crawlable trade hub linking all seven trade pages", async () => {
  const html = await (await renderPath("/resume-builder")).text();
  assert.equal(PAGES.length, 7, "expected the full seven-page trade cluster");
  for (const page of PAGES) {
    assert.match(html, new RegExp(`href="/resume-builder/${page.slug}"`), `hub missing link to ${page.slug}`);
  }
  for (const label of [
    "HVAC Resume Builder",
    "Facilities Maintenance Resume Builder",
    "Electrician Resume Builder",
    "Plumbing Resume Builder",
    "Welding &amp; Fabrication Resume Builder",
    "Construction &amp; Carpentry Resume Builder",
    "General Labor Resume Builder",
  ]) {
    assert.ok(html.includes(label), `hub missing descriptive anchor text: ${label}`);
  }
});

test("each trade page cross-links to its six sibling trade guides", async () => {
  const html = await (await renderPath("/resume-builder/plumbing")).text();
  assert.match(html, /building for a different trade\?/i);
  for (const slug of [
    "hvac",
    "facilities-maintenance",
    "electrician",
    "welding-fabrication",
    "construction-carpentry",
    "general-labor",
  ]) {
    assert.match(html, new RegExp(`href="/resume-builder/${slug}"`), `plumbing missing sibling link ${slug}`);
  }
  // never lists itself as a sibling
  const guideBlock = html.slice(html.indexOf("Other trade Resume Builder guides"));
  assert.doesNotMatch(guideBlock.slice(0, 600), /href="\/resume-builder\/plumbing"/);
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
