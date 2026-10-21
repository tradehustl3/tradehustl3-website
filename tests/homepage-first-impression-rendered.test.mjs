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

test("default homepage render without a trade shows HVAC and the plain intake CTA", async () => {
  const html = await renderHome();
  assert.match(html, /RESUME BUILDER FOR THE SKILLED TRADES/);
  assert.match(html, /Build an <span[^>]*>HVAC tech<\/span> resume that looks ready for the job\./);
  const cta = html.match(/<a\b[^>]*data-hero-cta[^>]*>/)?.[0] ?? "";
  assert.match(cta, /href="#resume-start"/);
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

test("default homepage is the hub: one h1, stage picker, divisions, then the Resume Builder hero as a section", async () => {
  const html = await renderHome();
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /<h1 id="hub-title"[^>]*>Built for the people who build, maintain, repair, and move America\.<\/h1>/);
  const order = ['id="hub-title"', 'id="start-here"', 'id="divisions-title"', 'id="resume-hero"', 'id="resume-start"', 'id="know-your-trade"', 'id="outlook-title"']
    .map((marker) => html.indexOf(marker));
  order.forEach((index, i) => assert.ok(index > (order[i - 1] ?? -1), `hub section ${i} out of order`));
  assert.match(html, /<button[^>]*aria-pressed="true"[^>]*data-item="exploring"/);
  assert.match(html, /Coming soon/);
  assert.match(html, /<h2 id="hero-title"/);
});

test("campaign visits (?trade=) keep the resume-first layout without the hub sections", async () => {
  const html = await renderHome("/?trade=plumbing");
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /<h1 id="hero-title"/);
  assert.doesNotMatch(html, /id="hub-title"/);
  assert.doesNotMatch(html, /id="start-here"/);
  assert.match(html, /id="resume-start"/);
});

test("promise band, steps and jobsite truths follow the hero in order", async () => {
  const html = await renderHome();
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

test("jobsite truths render six cards with the exact copy, photos and alt text", async () => {
  const html = await renderHome();
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
