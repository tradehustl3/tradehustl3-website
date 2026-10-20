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

  // A trade without a hero chip keeps the default hero; the intake still reads the URL.
  const other = await renderHome("/?trade=general-labor");
  assert.match(other, /Build an <span[^>]*>HVAC tech<\/span> resume/);
  assert.match(other.match(/<a\b[^>]*data-hero-cta[^>]*>/)?.[0] ?? "", /href="#resume-start"/);
});

test("homepage header carries three links and one CTA", async () => {
  const html = await renderHome();
  const header = between(html, "<header", "</header>");
  assert.match(header, /optimized\/resume-builder-logo-header\.webp/);
  assert.match(header, /href="#trades"[^>]*>Trade examples</);
  assert.match(header, /href="#how"[^>]*>How it works</);
  assert.match(header, /href="\/book"[^>]*>The Book</);
  assert.equal((header.match(/Build my free preview/g) ?? []).length, 1);
  assert.match(header, /data-location="sticky_header"/);
});

test("promise band, steps and reviews follow the hero in order", async () => {
  const html = await renderHome();
  const order = [
    'id="top"',
    "See it first",
    "Built by a tradesman",
    "Three steps. Preview before you pay.",
    "Reviews from verified buyers",
    'id="trade-guides"',
    'id="resume-start"',
  ].map((marker) => html.indexOf(marker));
  order.forEach((index, i) => assert.ok(index > (order[i - 1] ?? -1), `section ${i} out of order`));
  for (const step of ["Bring your experience", "Review the free preview", "Unlock for $9.99"]) assert.ok(html.includes(step), step);
  assert.doesNotMatch(html, /Three steps\. One stronger resume\./, "the duplicate process section is gone");
});

test("reviews empty state shows the verified-only notice and a start button", async () => {
  const html = await renderHome();
  const reviews = between(html, "Reviews from verified buyers", "</section>");
  assert.match(reviews, /Only customers with a completed purchase can leave a review here\. The first ones will appear as soon as they&#x27;re approved\./);
  assert.match(reviews, /<a[^>]*href="#resume-start"[^>]*data-location="reviews_empty"[^>]*>Build my free preview<\/a>/);
  assert.doesNotMatch(html, /Real People\. Real Results\./);
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
