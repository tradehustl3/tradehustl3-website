import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

async function renderHome(pathname = "/") {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 200);
  return (await response.text()).replace(/<!-- -->/g, "");
}

const between = (html, start, end) => {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `expected ${start} before ${end}`);
  return html.slice(from, to);
};

test("the hub homepage no longer opens on the resume hero; ?trade=hvac still renders the HVAC hero", async () => {
  const hub = await renderHome();
  assert.doesNotMatch(hub, /RESUME BUILDER FOR THE SKILLED TRADES/);
  assert.doesNotMatch(hub, /data-hero-cta/);

  const html = await renderHome("/?trade=hvac");
  assert.match(html, /RESUME BUILDER FOR THE SKILLED TRADES/);
  assert.match(html, /<h1 id="hero-title"[^>]*>Build an <span[^>]*>HVAC tech<\/span> resume that looks ready for the job\./);
  const cta = html.match(/<a\b[^>]*data-hero-cta[^>]*>/)?.[0] ?? "";
  assert.match(cta, /href="\/\?trade=hvac#resume-start"/);
  assert.match(cta, /data-location="hero"/);
  assert.match(html, /Build my free HVAC preview/);
  assert.match(html, /What&#x27;s your trade\?/);
  for (const label of ["HVAC", "Electrical", "Plumbing", "Facilities", "Welding", "Construction"]) {
    assert.match(html, new RegExp(`<button[^>]*aria-pressed="(true|false)"[^>]*>${label}</button>`), `${label} chip`);
  }
  assert.match(html, /<button[^>]*aria-pressed="true"[^>]*data-item="hvac"/);
  assert.match(html, /\$0<\/b> to preview/);
  assert.match(html, /\$9\.99<\/b> once to unlock/);
  assert.match(html, /No credit card to start/);
  assert.match(html, /Fictional example\. Your resume uses only the facts you enter\./);
});

test("a ?trade= landing server-renders that trade, so nothing swaps after hydration", async () => {
  const html = await renderHome("/?trade=plumbing");
  assert.match(html, /Build a <span[^>]*>plumber<\/span> resume that looks ready for the job\./);
  assert.match(html.match(/<a\b[^>]*data-hero-cta[^>]*>/)?.[0] ?? "", /href="\/\?trade=plumbing#resume-start"/);
  assert.match(html, /Build my free plumber preview/);
  assert.match(html, /<button[^>]*aria-pressed="true"[^>]*data-item="plumbing"/);
  assert.match(html, /data-example-trade="plumbing" data-active="true"/);

  // A trade without a hero chip names that trade and keeps it in the CTA
  // (Oct 21 audit): it no longer falls back to the HVAC headline and a bare #resume-start.
  const other = await renderHome("/?trade=general-labor");
  assert.doesNotMatch(other, /Build an <span[^>]*>HVAC tech<\/span> resume/);
  assert.match(other, /Build a <span[^>]*>general labor<\/span> resume/);
  assert.match(other.match(/<a\b[^>]*data-hero-cta[^>]*>/)?.[0] ?? "", /href="\/\?trade=general-labor#resume-start"/);
});

test("homepage header leads with the TRADE HUSTL3 brand, four hub links, and one CTA", async () => {
  const html = await renderHome();
  const header = between(html, "<header", "</header>");
  assert.match(header, /aria-label="TRADE HUSTL3 home"/);
  assert.match(header, /optimized\/th3-logo-header\.webp/);
  assert.match(header, /href="\/resume-examples"[^>]*>Explore Trades</);
  assert.match(header, /href="\/resources\/certifications"[^>]*>Certifications</);
  assert.match(header, /href="\/resources"[^>]*>Resources</);
  assert.match(header, /href="\/book"[^>]*>The Book</);
  assert.equal((header.match(/Build my free preview/g) ?? []).length, 1);
  assert.match(header, /data-location="sticky_header"/);
});

test("default homepage follows the approved hub order: discover, first steps, free guides, paid tools, founder", async () => {
  const html = await renderHome();
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  // The gold accent span is presentational; the h1's full text must stay exactly the approved headline.
  assert.match(html, /<h1 id="storefront-heading"[^>]*>Build your career\.\s*(?:<!-- -->)?\s*<span[^>]*>Own your future\.<\/span><\/h1>/);
  assert.match(html, /<h2 id="hub-title"[^>]*>Your future is built,\s*(?:<!-- -->)?\s*<span[^>]*>not handed to you\.<\/span><\/h2>/);
  assert.ok(html.indexOf("Skilled-Trades Resume Builder") < html.indexOf("TRADE HUSTL3 — The Book"), "resume offer precedes book offer");
  const order = [
    'id="storefront-heading"',
    'id="hub-title"',
    'id="start-here"',
    'id="find-your-lane-title"',
    'id="outlook-title"',
    'id="first-steps-title"',
    'id="know-your-trade"',
    'id="free-guides-title"',
    'id="opportunity-title"',
    'aria-label="What the Resume Builder promises"',
    'id="resume-start"',
    'id="founder-title"',
  ].map((marker) => html.indexOf(marker));
  order.forEach((index, i) => assert.ok(index > (order[i - 1] ?? -1), `hub section ${i} out of order`));
  assert.match(html, /<button[^>]*aria-pressed="true"[^>]*data-item="student"/);
  assert.doesNotMatch(html, /Coming soon/);
  // The resume-first sales sections stay on campaign visits only.
  for (const gone of ['id="resume-hero"', "Jobsite truths. If you know, you know.", "Three steps. Preview before you pay.", "Real coverage. Clear numbers.", 'id="included-cover-letter"', "READY WHEN YOU ARE"]) {
    assert.equal(html.includes(gone), false, `hub still renders ${gone}`);
  }
});

test("Find Your Lane renders eight trade cards that each answer what, how, and which credentials", async () => {
  const html = await renderHome();
  const section = between(html, 'id="trade-guides"', 'id="outlook-title"');
  assert.match(section, /EXPLORE YOUR FUTURE/);
  assert.match(section, /<h2 id="find-your-lane-title"[^>]*>Find your lane\.\s*<span[^>]*>Explore the trades\.<\/span><\/h2>/);
  assert.match(section, /Every skill starts somewhere\./);
  assert.match(section, /You don&#x27;t need to have it all figured out\./);
  const titles = ["HVAC &amp; Refrigeration", "Electrical", "Plumbing", "Welding &amp; Fabrication", "Construction", "Facilities Maintenance", "Heavy Equipment", "General Labor"];
  const cards = section.split('<li class="').filter((chunk) => chunk.includes("data-lane="));
  assert.equal(cards.length, 8, "eight trade cards");
  cards.forEach((card, index) => {
    assert.ok(card.includes(`>${titles[index]}</h3>`), `card ${index} is ${titles[index]}`);
    for (const label of ["The work", "How to start", "Credentials to know"]) assert.ok(card.includes(`>${label}</dt>`), `${titles[index]}: ${label}`);
    assert.match(card, /href="\/resources\/certifications#[a-z0-9-]+"/, `${titles[index]}: credential guide link`);
    assert.match(card, /Source: <a href="https:\/\/www\.bls\.gov\/ooh\//, `${titles[index]}: BLS source`);
    assert.match(card, /href="\/resources\/certifications#trade-[a-z0-9-]+"/, `${titles[index]}: explore link`);
    assert.match(card, /href="\/resume-builder\/[a-z-]+"/, `${titles[index]}: existing trade page`);
    assert.match(card, /<img\b[^>]*alt="[^"]{20,}"/, `${titles[index]}: photo alt text`);
  });
  assert.match(section, /href="\/resume-examples"[^>]*data-item="explore_all_trades"/);
  assert.match(section, /href="\/resources"[^>]*>Start with our free career resources/);
  assert.doesNotMatch(section, /guarantee|get hired|\$\d|per hour|salary/i, "no pay figures or outcome promises in trade discovery");
});

test("first steps, free guides, paid tools, and the founder story render with real destinations", async () => {
  const html = await renderHome();
  const steps = between(html, 'id="first-steps"', 'id="know-your-trade"');
  assert.match(steps, /href="https:\/\/www\.apprenticeship\.gov\/apprenticeship-job-finder"/);
  assert.match(steps, /href="https:\/\/www\.apprenticeship\.gov\/registered-apprenticeship"/);
  assert.match(steps, /href="https:\/\/www\.careeronestop\.org\/Toolkit\/Training\/find-licenses\.aspx"/);
  for (const slug of ["osha-outreach-10-30", "epa-608", "forklift-operator", "cdl"]) assert.match(steps, new RegExp(`href="/resources/certifications#${slug}"`));
  assert.match(steps, /OSHA 10-Hour and 30-Hour Outreach Training[\s\S]*?Training card/);

  const guides = between(html, 'id="free-guides"', 'id="opportunity"');
  assert.equal((guides.match(/<form\b/g) ?? []).length, 2, "two email signups");
  assert.equal((guides.match(/type="email"/g) ?? []).length, 2);
  assert.match(guides, /Top 10 Trades for 2026–2027/);
  assert.match(guides, /Read the first 7 pages of TRADE HUSTL3/);
  assert.match(guides, /data-cta-location="homepage_free_guides"/);

  const opportunity = between(html, 'id="opportunity"', 'id="resume-start"');
  assert.match(opportunity, /data-location="opportunity_resume"[^>]*>Build my free preview|href="#resume-start"[^>]*data-location="opportunity_resume"/);
  assert.match(opportunity, /href="https:\/\/www\.amazon\.com\/dp\/B0HFQ2ZNJN"/);
  assert.match(opportunity, /href="https:\/\/www\.amazon\.com\/dp\/B0HPZ2KQ1R"/);
  assert.match(opportunity, /Never invents a license, cert, employer, or number\./);

  const founder = html.slice(html.indexOf('id="built-by-a-tradesman"'), html.indexOf("<footer"));
  assert.match(founder, /Zachary Ellis/);
  for (const credential of ["EPA 608 Universal certification", "HVAC certification", "NCRR", "OSHA 10-Hour training"]) assert.ok(founder.includes(credential), credential);
  assert.doesNotMatch(founder, /author-portrait|zachary-ellis\.webp/, "no founder photo on the homepage");
  assert.doesNotMatch(founder, /OSHA 10 certif/i);
});

test("hub story follows ENTER, EARN, ELEVATE with real paths and sourced guides", async () => {
  const html = await renderHome();
  const story = between(html, 'id="hub-mission"', 'id="start-here"');
  assert.match(story, /THE TRADE HUSTL3 STORY/);
  assert.match(story, /You might be in school, starting your first job, changing careers, or already working\s+in the field\./);
  assert.match(story, /real trade\s+information, practical career tools, and a clearer path to your next move\./);
  const pillars = ["ENTER", "EARN", "ELEVATE"].map((word) => story.indexOf('>' + word + '</span>'));
  pillars.forEach((index, i) => assert.ok(index > (pillars[i - 1] ?? -1), 'story pillar order'));
  assert.match(story, /href="\/resume-examples"/);
  assert.match(story, /href="\/resources\/certifications"/);
  assert.match(story, /href="#resume-start"/);
  assert.match(story, /href="\/resources\/certifications#epa-608"/);
  assert.match(story, /href="\/resources\/certifications#osha-outreach-10-30"/);
  assert.match(story, /href="\/resources\/certifications#cdl"/);
  assert.match(story, /href="\/resources\/certifications#forklift-operator"/);
  assert.match(story, /data-location="hub_story"/);
  assert.match(story, /credentials linked to sources/);
  assert.doesNotMatch(story, /guaranteed income|guaranteed job|AI.generated workers/i);
});

test("trade stage band replaces the old start-here and tools sections with five real paths", async () => {
  const html = await renderHome();
  const band = between(html, 'id="start-here"', 'data-item="group_access"');
  assert.match(band, /<h2 id="stage-title"[^>]*>Where are you in your trade\?<\/h2>/);
  const labels = ["Student", "New to Trades", "In the Trade", "Supervisor / Lead", "Career Changer"];
  const positions = labels.map((label) => band.indexOf(`<strong>${label}</strong>`));
  positions.forEach((index, i) => assert.ok(index > (positions[i - 1] ?? -1), `persona order: ${labels[i]}`));
  assert.equal((band.match(/data-location="hub_stage_picker"/g) ?? []).length, 5);
  assert.equal((band.match(/aria-pressed="true"/g) ?? []).length, 1, "exactly one persona selected by default");
  assert.match(band, /aria-controls="stage-panel"/);
  assert.match(band, /id="stage-panel"/);
  assert.match(band, /href="\/contact"/, "schools, programs, and employers keep a contact path");
  assert.doesNotMatch(html, /id="divisions-title"|Tools for your next career move|START WHERE YOU ARE/);
  assert.doesNotMatch(band, /guaranteed|get hired|<img/i, "no outcome promises or photos in the band");
});

test("campaign visits (?trade=) keep the resume-first layout without the hub sections", async () => {
  const html = await renderHome("/?trade=plumbing");
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /<h1 id="hero-title"/);
  assert.doesNotMatch(html, /id="hub-title"/);
  assert.doesNotMatch(html, /id="start-here"/);
  assert.match(html, /id="resume-start"/);
});

test("on campaign visits the promise band, steps and jobsite truths follow the hero in order", async () => {
  const html = await renderHome("/?trade=hvac");
  const order = [
    'id="top"',
    "See it first",
    "Built by a tradesman",
    "Three steps. Preview before you pay.",
    "Jobsite truths. If you know, you know.",
    'aria-label="What the Resume Builder promises"',
    'id="trade-guides"',
    'id="resume-start"',
  ].map((marker) => html.indexOf(marker));
  order.forEach((index, i) => assert.ok(index > (order[i - 1] ?? -1), `section ${i} out of order`));
  for (const step of ["Bring your experience", "Review the free preview", "Unlock for $9.99"]) assert.ok(html.includes(step), step);
  assert.doesNotMatch(html, /Three steps\. One stronger resume\./, "the duplicate process section is gone");
});

const JOBSITE_TRUTHS = [
  ["HVAC", "/optimized/hvac-manifold-worksite.webp", "Digital refrigerant manifold gauge with blue, yellow and red hoses connected to a rooftop unit on a commercial job site", "Fixed orifice? Charge by superheat. TXV? Charge by subcooling.", "Get that backwards and the gauges will lie to you all afternoon."],
  ["Electrical", "/trade-landings/electrician-worksite.webp", "Open electrical panel with breakers and color-coded wiring, a multimeter and hand tools on a construction site", "The white wire is the grounded conductor. It is not the ground.", "Neutral and ground bond once, at the service. Bond them in a subpanel and you have built a problem."],
  ["Plumbing", "/trade-landings/plumbing-worksite.webp", "Mechanical room with copper piping and water heaters, and a press tool, copper fittings, tubing cutter and pipe wrench on a workbench", "Small horizontal drains want a quarter inch of fall per foot.", "Too flat and it clogs. The first rule still applies: water runs downhill."],
  ["Welding", "/trade-landings/welding-fabrication-worksite.webp", "Welding helmet, MIG gun and a welded steel plate on a fabrication shop table", "Once the can is open, 7018 lives in the rod oven.", "Low-hydrogen rods soak up moisture, and wet rods mean porosity and cracking."],
  ["Facilities", "/trade-landings/facilities-maintenance-worksite.webp", "Air handling unit and circulation pumps in a building mechanical room, with a multimeter, drill and hand tools on a workbench", "One lock, one key, one person.", "If your lock is not on the hasp, you are not locked out. Verify zero energy before you touch it."],
  ["Construction", "/trade-landings/construction-carpentry-worksite.webp", "Wood-framed house under construction with a circular saw, framing nailer, speed square and tape measure on a work table", "Crown up. Every joist, every time.", "Set the bow up and the load flattens it. Set it down and the floor sags for good."],
];

const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");

test("jobsite truths render six cards with the exact copy, photos and alt text on campaign visits", async () => {
  const html = await renderHome("/?trade=hvac");
  const section = between(html, 'aria-labelledby="jobsite-truths-title"', "</section>");
  assert.match(section, /BUILT FOR PEOPLE WHO KNOW THE WORK/);
  assert.match(section, /Jobsite truths\. If you know, you know\./);
  const cards = section.split("<li").slice(1);
  assert.equal(cards.length, 6, "six cards");
  JOBSITE_TRUTHS.forEach(([trade, image, alt, fact, line], index) => {
    const card = cards[index];
    const img = card.match(/<img\b[^>]*>/)?.[0] ?? "";
    assert.ok(img.includes(`alt="${escapeHtml(alt)}"`), `${trade} alt text`);
    assert.ok(img.includes(image), `${trade} photo ${image}`);
    assert.ok(card.includes(`>${trade}</p>`), `${trade} label`);
    assert.ok(card.includes(`>${escapeHtml(fact)}</p>`), `${trade} fact`);
    assert.ok(card.includes(`>${escapeHtml(line)}</p>`), `${trade} supporting line`);
  });
  assert.match(section, /You know the work\. Let&#x27;s put it on paper the right way\./);
  assert.match(section, /<a[^>]*href="#resume-start"[^>]*data-location="jobsite_truths"[^>]*>Build my free preview<\/a>/);
});

test("with no approved reviews the reviews section is absent, not an empty box", async () => {
  const html = await renderHome();
  assert.doesNotMatch(html, /Reviews from verified buyers/);
  assert.doesNotMatch(html, /customer-reviews-title/);
  assert.doesNotMatch(html, /Only customers with a completed purchase can leave a review here/);
  assert.doesNotMatch(html, /data-reviews-empty/);
  assert.doesNotMatch(html, /Real People\. Real Results\./);
});

test("duplicate promises and the purchase strip are gone; the refund promise stays", async () => {
  const html = await renderHome();
  const promises = between(html, 'aria-label="What the Resume Builder promises"', "</ul>");
  assert.doesNotMatch(promises, /See it first|Nothing made up|Your facts only/);
  assert.match(promises, /Delivered or refunded/);
  assert.match(promises, /href="\/resume-builder\/refund-policy"/);
  assert.doesNotMatch(html, /Resume Builder purchase protections|SEE IT BEFORE YOU BUY IT\./);
});

test("no hard-coded testimonial names or portraits reach the homepage", async () => {
  const html = await renderHome();
  for (const name of ["Jessica M.", "David R.", "Taylor S.", "Michael T.", "Marcus K.", "Chris L."]) {
    assert.equal(html.includes(name), false, `${name} rendered`);
  }
  assert.doesNotMatch(html, /\/testimonials\//);
  assert.doesNotMatch(html, /CUSTOMER STORY/i);
});

test("the new homepage sections add no corrections wording", async () => {
  const html = await renderHome();
  const firstImpression = between(html, "<header", 'aria-label="What the Resume Builder promises"');
  assert.doesNotMatch(firstImpression, /correction/i);
});

test("homepage fonts are self-hosted, with no runtime Google Fonts request", async () => {
  const html = await renderHome();
  assert.match(html, /_vinext_fonts\/barlow-condensed-/);
  assert.match(html, /_vinext_fonts\/barlow-/);
  assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
});

test("campaign visits for trades without a quick-pick card keep the resume-first layout and the trade", async () => {
  for (const [slug, word] of [["commercial-driving-transportation", "commercial driver"], ["heavy-equipment-operator", "heavy equipment"], ["general-labor", "general labor"]]) {
    const html = await renderHome(`/?trade=${slug}`);
    assert.doesNotMatch(html, /id="hub-title"/, `${slug}: hub hidden on campaign visit`);
    assert.match(html, new RegExp(`<h1 id="hero-title"[^>]*>Build a <span[^>]*>${word}</span> resume`), `${slug}: headline names the trade`);
    const cta = html.match(/<a\b[^>]*data-hero-cta[^>]*>/)?.[0] ?? "";
    assert.match(cta, /href="\/\?trade=[a-z0-9-]+#resume-start"/, `${slug}: CTA keeps the trade`);
    assert.doesNotMatch(html, /<button[^>]*aria-pressed="true"[^>]*data-location="hero_trade_picker"/, `${slug}: no unrelated chip preselected`);
  }
});

test("homepage industrial storefront uses real brand assets, clear offers, proof, trade links and free signup paths", async () => {
  const html = await renderHome();
  const storefront = between(html, 'id="top"', 'id="hub-mission"');

  assert.equal((html.match(/<h1\b/g) ?? []).length, 1, "one accessible primary headline");
  assert.match(storefront, /Build your career\./);
  assert.match(storefront, /Own your future\./);
  assert.match(storefront, /Built for the people who build, maintain, repair, and move America\./);
  assert.match(storefront, /optimized\/resume-builder-logo-header\.webp/);
  assert.match(storefront, /optimized\/book-cover-v3\.webp/);
  assert.match(storefront, /sample-hvac-resume\.webp/);

  assert.ok(storefront.indexOf('data-product="resume-builder"') < storefront.indexOf('data-product="the-book"'));
  assert.match(storefront, /No subscription/i);
  assert.match(storefront, /10\+ years in HVAC and facilities maintenance/);
  assert.match(storefront, /data-location="homepage_storefront_resume"/);
  assert.match(storefront, /href="#resume-start"/);
  assert.match(storefront, /data-location="homepage_storefront_book"/);
  assert.match(storefront, /href="https:\/\/www\.amazon\.com\/dp\/B0HFQ2ZNJN"/);
  assert.match(storefront, /href="https:\/\/www\.amazon\.com\/dp\/B0HPZ2KQ1R"/);

  for (const href of ["/resume-builder/hvac", "/resume-builder/electrician", "/resume-builder/plumbing",
    "/resume-builder/welding-fabrication", "/resume-builder/construction-carpentry",
    "/resume-builder/facilities-maintenance", "/resume-builder/heavy-equipment-operator",
    "/resources", "/top-10-trades", "/book/sample"]) {
    assert.ok(storefront.includes(`href="${href}"`), `verified destination ${href}`);
  }
  assert.ok(storefront.indexOf('data-location="homepage_storefront_book"') < storefront.indexOf('href="/top-10-trades"'), "products before free guides");
  assert.doesNotMatch(storefront, /AI-generated workers|pre-order|coming soon/i);
});
