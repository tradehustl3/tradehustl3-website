import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const EBOOK_RELEASE_AT = Date.parse("2026-09-15T04:00:00Z");

async function withFrozenDateNow(now, run) {
  const originalDateNow = Date.now;
  Date.now = () => now;
  try {
    return await run();
  } finally {
    Date.now = originalDateNow;
  }
}

async function renderPath(pathname = "/") {
  const worker = await loadWorker();
  return worker.fetch(new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

async function render() {
  return renderPath("/");
}

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

async function createStripeSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  const hex = Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `t=${timestamp},v1=${hex}`;
}

async function sendEbookStripeEvent(worker, event, env) {
  const payload = JSON.stringify(event);
  const signature = await createStripeSignature(payload, env.STRIPE_WEBHOOK_SECRET);
  return worker.fetch(
    new Request("https://tradehustl3.com/api/stripe/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Stripe-Signature": signature },
      body: payload,
    }),
    env,
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the corrected TRADE HUSTL3 brand and metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.equal(response.headers.get("strict-transport-security"), "max-age=31536000");
  assert.match(response.headers.get("content-security-policy") ?? "", /default-src 'self'/i);
  assert.doesNotMatch(response.headers.get("content-security-policy") ?? "", /unsafe-eval/i);
  const html = await response.text();

  assert.match(html, /<title>Skilled-Trades Career Hub and Resume Builder \| TRADE HUSTL3<\/title>/i);
  assert.match(html, /property="og:title" content="Skilled-Trades Career Hub and Resume Builder \| TRADE HUSTL3"/i);
  assert.match(html, /name="twitter:title" content="Skilled-Trades Career Hub and Resume Builder \| TRADE HUSTL3"/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/tradehustl3\.com\/?"/i);
  assert.match(html, /property="og:url" content="https:\/\/tradehustl3\.com\/?"/i);
  assert.match(html, /property="og:image" content="https:\/\/tradehustl3\.com\/optimized\/og-hub-v2\.jpg"/i);
  assert.equal(html.includes("localhost:3000"), false);
  for (const schemaType of ["Organization", "Person", "WebSite", "WebPage"]) assert.match(html, new RegExp(`"@type":"${schemaType}"`, "i"));
  assert.doesNotMatch(html, /"@type":"Book"/i);
  assert.match(html, /aria-label="TRADE HUSTL3 home"/i);
  assert.equal(html.toUpperCase().includes("TRA" + "D3"), false);
  assert.match(html, /optimized\/th3-logo-header\.webp/i);
  assert.match(html, /favicon\.svg/i);
  assert.match(html, /alt="TRADE HUSTL3 logo"/i);
  assert.match(html, /BUILT BY HUSTL3\. BACKED BY TRADES\./);
  assert.doesNotMatch(html, /BACKED BY TRADE\./, "no retired slogan anywhere on the page");
  assert.match(html, /Skilled-Trades[\s\S]*Resume Builder/i);
});

test("campaign homepage server-renders Resume Builder credibility and audience content", async () => {
  const hub = await (await render()).text();
  assert.match(hub, /sample-hvac-resume\.webp/i, "hub shows a labeled Resume Builder sample");
  const html = await (await renderPath("/?trade=hvac")).text();
  assert.match(html, /Built around the way skilled-trades people actually work/i);
  assert.match(html, /Shaped by 10\+ years of HVAC and facilities work\./i);
  assert.doesNotMatch(html, /TRADE-CORRECT SETUP/i);
  for (const proofPoint of ["Trade-specific language", "ATS-friendly structure", "Upload or guided intake", "Real preview before payment", "PDF + editable DOCX", "Built for skilled trades"]) assert.match(html, new RegExp(proofPoint.replace("+", "\\+"), "i"));
  for (const trustPoint of [/No credit card to preview/i, /\$9\.99 one-time/i, /No subscription/i]) assert.match(html, trustPoint);
});

test("publishes a canonical XML sitemap and robots discovery hints", async () => {
  const worker = await loadWorker();
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const ctx = { waitUntil() {}, passThroughOnException() {} };

  const sitemapResponse = await worker.fetch(new Request("https://tradehustl3.com/sitemap.xml"), env, ctx);
  assert.equal(sitemapResponse.status, 200);
  assert.match(sitemapResponse.headers.get("content-type") ?? "", /xml/i);
  const sitemap = await sitemapResponse.text();
  assert.match(sitemap, /<loc>https:\/\/tradehustl3\.com<\/loc>/i);
  assert.match(sitemap, /<loc>https:\/\/tradehustl3\.com\/book<\/loc>/i);
  assert.match(sitemap, /<loc>https:\/\/tradehustl3\.com\/resume-examples<\/loc>/i);
  assert.doesNotMatch(sitemap, /<loc>https:\/\/tradehustl3\.com\/resume-builder<\/loc>/i);
  assert.match(sitemap, /<loc>https:\/\/tradehustl3\.com\/resume-builder\/hvac<\/loc>/i);
  for (const path of ["privacy", "terms", "contact", "data-deletion", "resume-builder/refund-policy", "book/refund-policy", "resume-builder/ai-disclosure"]) {
    assert.match(sitemap, new RegExp(`<loc>https:\\/\\/tradehustl3\\.com\\/${path.replaceAll("/", "\\/")}<\\/loc>`, "i"));
  }

  const robotsResponse = await worker.fetch(new Request("https://tradehustl3.com/robots.txt"), env, ctx);
  assert.equal(robotsResponse.status, 200);
  const robots = await robotsResponse.text();
  assert.match(robots, /User-Agent:\s*\*/i);
  assert.match(robots, /Allow:\s*\//i);
  assert.match(robots, /Sitemap:\s*https:\/\/tradehustl3\.com\/sitemap\.xml/i);
});

test("serves the crawler discovery files with no-store caching headers", async () => {
  for (const pathname of ["/sitemap.xml", "/robots.txt"]) {
    const response = await renderPath(pathname);
    assert.equal(response.status, 200, pathname);
    for (const header of ["cache-control", "cloudflare-cdn-cache-control", "cdn-cache-control"]) {
      assert.match(response.headers.get(header) ?? "", /no-store/i, `${pathname} ${header}`);
    }
  }
});

function metaDescriptions(html) {
  return Array.from(html.matchAll(/<meta\b[^>]*\bname="description"[^>]*>/gi), ([tag]) => {
    const content = tag.match(/\bcontent="([^"]*)"/i);
    assert.ok(content, `meta description without content: ${tag}`);
    return content[1];
  });
}

test("policy pages publish their own meta description and link straight to the builder start point", async () => {
  const homeDescriptions = metaDescriptions(await (await render()).text());
  assert.equal(homeDescriptions.length, 1, "homepage meta description count");
  const [homeDescription] = homeDescriptions;

  const seen = new Map();
  for (const pathname of [
    "/privacy",
    "/terms",
    "/contact",
    "/data-deletion",
    "/resume-builder/ai-disclosure",
    "/resume-builder/refund-policy",
    "/book/refund-policy",
  ]) {
    const response = await renderPath(pathname);
    assert.equal(response.status, 200, pathname);
    const html = await response.text();

    const descriptions = metaDescriptions(html);
    assert.equal(descriptions.length, 1, `${pathname} meta description count`);
    const [description] = descriptions;
    assert.notEqual(description, homeDescription, `${pathname} reuses the homepage description`);
    assert.ok(
      description.length >= 50 && description.length <= 160,
      `${pathname} description is ${description.length} characters`,
    );
    assert.ok(html.includes(`<p>${description}</p>`), `${pathname} description must match the visible summary`);
    assert.equal(seen.has(description), false, `${pathname} shares a description with ${seen.get(description)}`);
    seen.set(description, pathname);

    assert.equal(html.includes('href="/resume-builder"'), false, `${pathname} links to the redirecting route`);
    assert.ok(html.includes('href="/#resume-start"'), `${pathname} must link to the builder start point`);
  }
  assert.equal(seen.size, 7);
});

test("Top 10 Trades CTAs link straight to the builder start point", async () => {
  const response = await renderPath("/top-10-trades");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.equal(html.includes('href="/resume-builder"'), false);
  assert.equal(html.match(/href="\/#resume-start"/g)?.length ?? 0, 2);
  for (const location of ["top-10-header", "top-10-next-step"]) {
    assert.ok(html.includes(`data-cta-location="${location}"`), `missing data-cta-location ${location}`);
  }
});

test("signup confirmation page renders without a legal revision date and stays out of search", async () => {
  const response = await renderPath("/subscribed");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /YOU'RE CONFIRMED|YOU&#x27;RE CONFIRMED|YOU&#39;RE CONFIRMED/);
  assert.doesNotMatch(html, /Last updated/i);
  assert.match(html, /<meta name="robots" content="noindex, nofollow"/i);
});

test("publishes the customer protection pages with TRADE HUSTL3 LLC contact details", async () => {
  const pages = [
    ["/privacy", /Privacy Policy/i],
    ["/terms", /Terms of Service/i],
    ["/resume-builder/refund-policy", /Resume Builder[\s\S]*Refund Policy/i],
    ["/book/refund-policy", /Delivery[\s\S]*Refunds/i],
    ["/contact", /Contact Support/i],
    ["/data-deletion", /Account[\s\S]*Data Requests/i],
    ["/resume-builder/ai-disclosure", /AI Disclosure/i],
  ];

  for (const [pathname, expected] of pages) {
    const response = await renderPath(pathname);
    assert.equal(response.status, 200, pathname);
    const html = await response.text();
    assert.match(html, expected, pathname);
    assert.match(html, /TRADE HUSTL3 LLC/i, pathname);
    assert.match(html, /support@tradehustl3\.com/i, pathname);
    assert.match(html, /Atlanta, Georgia/i, pathname);
  }
});

test("requires policy and AI acknowledgement before a new Resume Builder checkout", async () => {
  const wizardSource = await readFile(new URL("../app/resume-builder/intake/wizard.tsx", import.meta.url), "utf8");
  // The final BUILD step keeps a checked policy acknowledgement for unpaid users,
  // and step validation blocks the build until it is checked.
  assert.match(wizardSource, /rb-legal-consent/);
  assert.match(wizardSource, /checked=\{legalConsent\}/);
  assert.match(wizardSource, /step === 6 && !paid && !legalConsent/);
  for (const path of ["/terms", "/privacy", "/resume-builder/refund-policy", "/resume-builder/ai-disclosure"]) {
    assert.match(wizardSource, new RegExp(`href="${path.replaceAll("/", "\\/")}"`, "i"));
  }
});

test("server-renders the official book page, cover, portrait, and current edition details", async () => {
  const response = await renderPath("/book");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /<title>TRADE HUSTL3 Book by Zachary Ellis \(Mr\. HUSTL3\)<\/title>/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/tradehustl3\.com\/book"/i);
  assert.match(html, /optimized\/book-cover-v3\.webp/i);
  assert.match(html, /optimized\/author-portrait-v2\.webp/i);
  assert.match(html.replace(/<[^>]+>/g, ""), /By Zachary Ellis · Mr\. HUSTL3/);
  assert.match(html, /ZACHARY[\s\S]*ELLIS\./);
  assert.equal(html.includes("Da Maintenance Mane is an HVAC"), false);
  // Author credentials are exactly the ones the author has confirmed, and the
  // sentence stays correctly spaced from the one that follows it.
  assert.match(
    html,
    /He holds EPA 608 Universal certification, an HVAC certification, NCRR, and OSHA 10\. His background/,
  );
  assert.equal(html.includes("Zachary Cameron Ellis"), false);
  assert.match(html, /Available now/i);
  assert.match(html, /Current KDP ISBN/i);
  assert.match(html, /9798193043355/i);
  assert.match(html, /No experience required/i);
  assert.match(html, /90-Day Action Plan/i);
  // The book lists 200 trades (Appendix A); "over 200" is a fact about America on the cover, not a count of the book.
  assert.match(html, /directory of 200 skilled trades/i);
  assert.doesNotMatch(html, /200\+|more than 200 skilled trades/i);
  assert.match(html, /"datePublished":"2026-09-15"/i);
  assert.match(html, /Get the free guide preview/i);
  assert.match(html, /data-cta-location="book_page_guide"/i);
  assert.doesNotMatch(html, /href="\/trade-hustl3-free-sample\.pdf/i);
  assert.match(html, /GUIDE PREVIEW/i);
  assert.match(html, /verified power-line and HVAC profiles/i);
  assert.doesNotMatch(html, /class="book-toc"|id="chapters"|href="#chapters"/);
  assert.doesNotMatch(html, /class="toc-appendices"/);
  assert.match(html, /Final Word: Build Something That Belongs to You/i);
  assert.doesNotMatch(html, /Launch countdown/i);
  // The quoted mindset line is verbatim from Chapter 21 (book page 463) of the final interior;
  // claims the book does not make stay off the page.
  assert.match(html, /“Do not build your future on hype\. Build it on ability\.[^”]*Do not wait for somebody to hand you leverage\. Create value\.”/);
  assert.match(html, /From Chapter 21 · Final Word: Build Something That Belongs to You/);
  assert.doesNotMatch(html, /Earn your own|hand you a future|nobody can take from you|generational wealth/i);
  assert.match(html, /How skill can create income, leverage, leadership, and ownership/);
  assert.match(html, /BUILT BY HUSTL3\. BACKED BY TRADES\./);
  assert.equal(html.includes("fell through an attic"), false);
});

test("book page roadmap uses the printed part titles, offers both free previews, FAQ, and a mobile buy bar", async () => {
  const html = await (await renderPath("/book")).text();
  const text = html.replace(/<!-- -->/g, "");

  // The Roadmap keeps the printed part titles after the detailed TOC is removed.
  // (Counts would double-count the RSC payload, so check placement in the markup instead.)
  assert.match(text, /<h3>Know the Tradescape<\/h3>/);
  assert.doesNotMatch(text, /Know the Landscape/i);
  assert.match(text, /What You Will Learn/);
  assert.match(text, /<h3>Turn Skill Into Money and Leverage<\/h3>/);
  assert.match(text, /<h3>Turn Leverage Into Control<\/h3>/);
  assert.doesNotMatch(text, />Turn Skill Into Leverage</);
  assert.doesNotMatch(text, />Build Control</);
  assert.match(text, /<strong>21<\/strong><small>Chapters<\/small>/);

  // Both free offers: the real 7-page book sample and the existing 2026-2027 guide.
  assert.match(text, /id="book-sample"/);
  assert.match(text, /Email me the 7-page sample/);
  assert.match(text, /data-cta-location="book-page-sample"/);
  assert.match(text, /href="#book-sample"[^>]*data-cta-location="book-hero"[^>]*>Read 7 Pages Free/);
  assert.match(text, /six-page preview/i);
  assert.equal((text.match(/<form class="resource-form"/g) ?? []).length, 2);

  // FAQ answers come from verified edition data and the eBook policy.
  assert.match(text, /id="faq"/);
  assert.match(text, /What formats can I buy\?/);
  assert.match(text, /paperback \(\$24\.99, 486 pages\)/);
  assert.doesNotMatch(text, /438 pages/);
  assert.match(text, /Kindle eBook \(\$9\.99\)/);
  assert.match(text, /href="\/book\/refund-policy">eBook Delivery and Refund Policy/);
  assert.match(text, /personal, non-transferable license/);
  assert.doesNotMatch(text, /bulk (pricing|discount|rate)/i);

  // Mobile quick-buy bar is wired to the shared sticky-CTA logic and starts hidden.
  assert.match(text, /<section class="book-hero" id="top"/);
  assert.match(text, /class="book-sticky-buy" data-location="mobile_sticky" aria-hidden="true"/);
  assert.match(text, /aria-labelledby="final-cta-title"/);
  assert.match(text, /id="final-cta-title"/);
  assert.match(text, /data-cta-location="book-mobile-sticky"/);
});

test("book hero follows the approved mockup and keeps its figures tied to verified data", async () => {
  const html = (await (await renderPath("/book")).text()).replace(/<!-- -->/g, "");
  const hero = html.match(/<section class="book-hero" id="top">[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.ok(hero.length > 0, "hero renders");

  assert.match(hero, /<p class="book-hero-eyebrow">The Official Book<\/p>/);
  assert.match(hero, /<h1>TRADE<br\/>HUSTL<span>3<\/span><\/h1>/);
  assert.match(hero, /Built by Hustle, Backed by Trades\./);
  assert.match(hero, /By Zachary Ellis <span aria-hidden="true">·<\/span> Mr\. HUSTL3/);
  // Proof row: 200 trades (Appendix A), the computed chapter count, the 90-Day Action Plan chapter.
  assert.match(hero, /<strong>200<\/strong><small>Trades<\/small>/);
  assert.match(hero, /<strong>21<\/strong><small>Chapters<\/small>/);
  assert.match(hero, /<strong>90-Day<\/strong><small>Action Plan<\/small>/);
  assert.match(hero, /Choose your path\. Build your skills\. Create your future\./);
  // Primary CTA is the verified Amazon paperback; secondary is the free sample.
  assert.match(hero, /href="https:\/\/www\.amazon\.com\/dp\/B0HFQ2ZNJN"[^>]*data-cta="amazon-paperback"[^>]*data-cta-location="book-hero"[^>]*>Buy the Paperback<\/a>/);
  assert.match(hero, /href="#availability"[^>]*data-cta="book-formats"[^>]*>Paperback/);
  assert.doesNotMatch(hero, /200\+|over 200/i);

  assert.match(html, /<\/section><p class="book-hero-band">Enter\. Earn\. Elevate\.<\/p>/);
  assert.match(html, /class="nav-cta nav-cta-buy" href="#availability"/);
  // Schools stays reachable from the header: the page is the schools acquisition page.
  assert.match(html, /<nav aria-label="Book page navigation">[\s\S]*?href="#schools">Schools<\/a>/);
});

test("book sample reader matches the final 486-page interior", async () => {
  const response = await renderPath("/book/sample/read");
  assert.equal(response.status, 200);
  const text = (await response.text()).replace(/<!-- -->/g, "");

  assert.match(text, /BEFORE I BECAME MR\. HUSTL3/);
  assert.match(text, /suddenly I became Mr\. HUSTL3\./);
  assert.match(text, /WHAT YOU WILL LEARN/);
  assert.match(text, /PART II — KNOW THE TRADESCAPE/);
  assert.match(text, /About the Author<\/span><b>486<\/b>/);
  assert.match(text, /1\. What a Skilled Trade Really Is<\/span><b>5<\/b>/);
  assert.match(text, /THE TOOLS ARE NOT THE TRADE/);
  // Check the book content only: the site-wide <head> author tags still use the
  // public "Da Maintenance Mane" persona by design, and that is not book text.
  const main = text.match(/<main[\s\S]*?<\/main>/)?.[0] ?? "";
  assert.ok(main.length > 0, "sample reader renders a <main> element");
  assert.doesNotMatch(main, /Maintenance Man\b|Da Maintenance Mane|KNOW THE LANDSCAPE|more than 200 skilled trades/i);
  assert.match(main, /directory of 200 skilled trades/);
});

test("book hero keeps the approved three-tradespeople artwork without extra silhouettes", async () => {
  const html = (await (await renderPath("/book")).text()).replace(/<!-- -->/g, "");
  assert.doesNotMatch(html, /book-hero-scene|hero-spray-left|hero-spray-right/);
  const css = await readFile(new URL("../app/page-shell.css", import.meta.url), "utf8");
  assert.match(css, /url\("\/optimized\/book-hero-trades-v1\.webp"\)/);
  assert.doesNotMatch(css, /book-hero-scene|--hero-figure/);
});

test("book page CSS keeps the mobile buy bar hidden until script shows it", async () => {
  const { readFile } = await import("node:fs/promises");
  const css = await readFile(new URL("../app/page-shell.css", import.meta.url), "utf8");
  assert.match(css, /\.book-sticky-buy \{ display: none;/);
  assert.doesNotMatch(css, /\.sample-intro/);
});

test("redirects the duplicate www hostname to the canonical domain", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://www.tradehustl3.com/resources?from=www"),
    {},
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://tradehustl3.com/resources?from=www");
});

test("redirects the production HTTP origin to canonical HTTPS and sends HSTS", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://tradehustl3.com/resume-builder?source=test"),
    {},
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://tradehustl3.com/resume-builder?source=test");
  assert.equal(response.headers.get("strict-transport-security"), "max-age=31536000");
});

test("repairs a path with a pasted full site URL instead of returning 404", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://tradehustl3.com/resume-builderhttps://tradehustl3.com/resume-builderhttps://tradehustl3.com/resume-builder?utm_source=facebook"),
    {},
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://tradehustl3.com/resume-builder?utm_source=facebook");
  assert.equal(response.headers.get("strict-transport-security"), "max-age=31536000");
});

test("homepage routes to the verified account entry and keeps free guide signups", async () => {
  const html = await (await render()).text();
  // The hub links to the dedicated verified-account page instead of embedding it.
  assert.equal((html.match(/id="resume-start"/gi) ?? []).length, 1);
  assert.match(html, /href="\/resume-builder\/start"[^>]*data-location="homepage_resume_builder"/i);
  assert.match(html, /type="email"/i);
  assert.match(html, /<form\b/i);
  assert.doesNotMatch(html, /name="fullName"/i);
  const start = await (await renderPath("/resume-builder/start")).text();
  assert.match(start, /Continue with email/i);
  assert.doesNotMatch(start, /name="fullName"/i);
  // Campaign visits keep the embedded account entry.
  const campaign = await (await renderPath("/?trade=hvac")).text();
  assert.match(campaign, /Continue with email/i);
  assert.match(campaign, /ACCOUNT · STAGE 1 OF 5/i);
  assert.match(html, /id="free-guides-title"/i);
  assert.match(html, /Top 10 Trades 2026–2027/i);
  assert.match(html, /data-cta-location="homepage_top_10_guide"/i);
  assert.match(html, /href="\/top-10-trades"/i);
  assert.match(html, /href="\/book"/i);
  // The book sample signup is inline on the hub; the header links to it.
  assert.match(html, /href="#book-preview"/i);
  assert.match(html, /id="homepage-book-email"/i);
  // Remaining in-page builder links still land on the single #resume-start target.
  assert.ok((html.match(/href="#resume-start"/gi) ?? []).length >= 1);
});

test("homepage features the approved book cover and edition links without duplicating the full book page", async () => {
  const html = await (await render()).text();
  assert.match(html, /href="\/book"[^>]*>The Book<\/a>/i);
  assert.match(html, /optimized\/book-cover-v3\.webp/i);
  // Every edition is buyable straight from the hub; the full comparison stays on /book.
  assert.match(html, /href="https:\/\/www\.amazon\.com\/dp\/B0HFQ2ZNJN"[^>]*data-cta="amazon-paperback"/i);
  assert.match(html, /href="https:\/\/www\.amazon\.com\/dp\/B0HPZ2KQ1R"[^>]*data-cta="amazon-kindle"/i);
  assert.match(html, /href="https:\/\/buy\.stripe\.com\/[^"]+"[^>]*data-cta="direct-ebook"/i);
  const book = await (await renderPath("/book")).text();
  assert.match(book, /id="availability"/i);
  assert.match(book, /href="https:\/\/www\.amazon\.com\/dp\/B0HFQ2ZNJN"/i);
  assert.match(book, /href="https:\/\/www\.amazon\.com\/dp\/B0HPZ2KQ1R"/i);
  assert.match(book, /href="https:\/\/buy\.stripe\.com\//i);
});

test("campaign homepage leads with preview-before-payment proof and the included cover letter before free resources", async () => {
  const html = await (await renderPath("/?trade=hvac")).text();
  assert.match(html, /\$0<\/b> to preview/i, "hero price line");
  assert.match(html, /Build My Free Preview/i);
  assert.match(html, /INCLUDED WITH YOUR RESUME PURCHASE/i);
  assert.match(html, /A matching cover letter\. Built for the same job\./i);
  assert.match(html, /Resume \+ matching cover letter/i);
  assert.match(html, /Jordan Taylor/i);
  assert.match(html, /Dear Hiring Manager/i);
  assert.match(html, /PDF \+ editable DOCX/i);
  assert.equal((html.match(/<footer\b/gi) ?? []).length, 1);
  assert.match(html, /<footer[^>]*data-site-footer/i);
  assert.doesNotMatch(html, /corrections within 7 days/i);
  assert.match(html, /No credit card to preview/i);
  assert.match(html, /optimized\/hustl3-bot-v1\.webp/i);
  assert.doesNotMatch(html, /Founder, TRADE HUSTL3/i);
  assert.match(html, /BUILT FOR THE TRADES[\s\S]*READY WHEN YOU ARE/i);
  assert.ok(html.indexOf('id="included-cover-letter"') < html.indexOf('id="guide-title"'));
});

test("subscriber endpoint validates and stores normalized signups", async () => {
  const worker = await loadWorker();
  const calls = [];
  const brevoCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    brevoCalls.push({ input: String(input), init });
    return new Response(null, { status: 201 });
  };
  const DB = {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async first() {
              return /RETURNING count/i.test(sql) ? { count: 1 } : null;
            },
            async run() {
              calls.push({ sql, values });
              return { success: true };
            },
          };
        },
      };
    },
    async batch() { return []; },
  };
  let response;
  try {
    response = await worker.fetch(
      new Request("http://localhost/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "  MEMBER@Example.com ",
          interest: "HUSTL3 PRO",
          utm_source: "google",
          utm_medium: "organic",
          utm_campaign: "book-launch",
        }),
      }),
      { DB, BREVO_API_KEY: "test-brevo-key", BREVO_LIST_ID: "3" },
      { waitUntil() {}, passThroughOnException() {} },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, message: "You're on the TRADE HUSTL3 list." });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].values, ["member@example.com", "HUSTL3 PRO", "website"]);
  assert.match(calls[0].sql, /ON CONFLICT\(email\) DO UPDATE/i);
  assert.equal(brevoCalls.length, 1);
  assert.equal(brevoCalls[0].input, "https://api.brevo.com/v3/contacts");
  assert.equal(brevoCalls[0].init.headers["api-key"], "test-brevo-key");
  assert.deepEqual(JSON.parse(brevoCalls[0].init.body), {
    email: "member@example.com",
    attributes: {
      INTEREST: "HUSTL3 PRO",
      SIGNUP_SOURCE: "website",
      UTM_SOURCE: "google",
      UTM_MEDIUM: "organic",
      UTM_CAMPAIGN: "book-launch",
    },
    listIds: [3],
    updateEnabled: true,
  });
});

function signupTestDb() {
  return {
    prepare(sql) {
      return {
        bind() {
          return {
            async first() {
              return /RETURNING count/i.test(sql) ? { count: 1 } : null;
            },
            async run() {
              return { success: true };
            },
          };
        },
      };
    },
    async batch() { return []; },
  };
}

test("subscriber endpoint sends a Brevo double opt-in when a confirmation template is configured", async () => {
  const worker = await loadWorker();
  const brevoCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    brevoCalls.push({ input: String(input), init });
    return new Response(null, { status: 204 });
  };
  let response;
  try {
    response = await worker.fetch(
      new Request("http://localhost/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: " Member@Example.com ", interest: "HUSTL3 PRO", utm_source: "google" }),
      }),
      { DB: signupTestDb(), BREVO_API_KEY: "test-brevo-key", BREVO_LIST_ID: "3", BREVO_DOI_TEMPLATE_ID: "18" },
      { waitUntil() {}, passThroughOnException() {} },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    message: "Almost there. Check your inbox and tap Confirm to join the TRADE HUSTL3 list.",
  });
  assert.equal(brevoCalls.length, 1);
  assert.equal(brevoCalls[0].input, "https://api.brevo.com/v3/contacts/doubleOptinConfirmation");
  assert.deepEqual(JSON.parse(brevoCalls[0].init.body), {
    email: "member@example.com",
    attributes: { INTEREST: "HUSTL3 PRO", SIGNUP_SOURCE: "website", UTM_SOURCE: "google" },
    includeListIds: [3],
    templateId: 18,
    redirectionUrl: "https://tradehustl3.com/subscribed",
  });
});

test("subscriber endpoint keeps direct list adds when the confirmation template ID is invalid", async () => {
  const worker = await loadWorker();
  const brevoCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    brevoCalls.push({ input: String(input), init });
    return new Response(null, { status: 201 });
  };
  let response;
  try {
    response = await worker.fetch(
      new Request("http://localhost/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "member@example.com", interest: "HUSTL3 PRO" }),
      }),
      { DB: signupTestDb(), BREVO_API_KEY: "test-brevo-key", BREVO_LIST_ID: "3", BREVO_DOI_TEMPLATE_ID: "not-a-number" },
      { waitUntil() {}, passThroughOnException() {} },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, message: "You're on the TRADE HUSTL3 list." });
  assert.equal(brevoCalls.length, 1);
  assert.equal(brevoCalls[0].input, "https://api.brevo.com/v3/contacts");
});

test("subscriber endpoint rejects invalid submissions", async () => {
  const worker = await loadWorker();
  let prepared = false;
  const response = await worker.fetch(
    new Request("http://localhost/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", interest: "Unknown" }),
    }),
    { DB: { prepare() { prepared = true; } } },
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(response.status, 400);
  assert.equal(prepared, false);
});

test("subscriber endpoint rejects an oversized body even without trusting Content-Length", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://tradehustl3.com/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "reader@example.com",
        interest: "HUSTL3 PRO",
        padding: "x".repeat(33_000),
      }),
    }),
    { DB: { prepare() { throw new Error("database should not be reached"); } } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 413);
});

test("subscriber endpoint keeps the signup successful when Brevo is unavailable", async () => {
  const worker = await loadWorker();
  let writes = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("simulated Brevo outage"); };
  try {
    const response = await worker.fetch(
      new Request("https://tradehustl3.com/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "https://tradehustl3.com" },
        body: JSON.stringify({ email: "resilient@example.com", interest: "HUSTL3 PRO" }),
      }),
      { DB: { prepare(sql) { return { bind() { return {
        async first() { return /RETURNING count/i.test(sql) ? { count: 1 } : null; },
        async run() { writes += 1; return { success: true }; },
      }; } }; } } },
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, message: "You're on the TRADE HUSTL3 list." });
    assert.equal(writes, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("book signup unlocks and emails the gated 2026-2027 guide preview", async () => {
  const worker = await loadWorker();
  const brevoCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    brevoCalls.push({ input: String(input), body: JSON.parse(String(init.body)) });
    return new Response(null, { status: 201 });
  };
  const DB = {
    prepare(sql) {
      return {
        bind() {
          return {
            async first() { return /RETURNING count/i.test(sql) ? { count: 1 } : null; },
            async run() { return { success: true }; },
          };
        },
      };
    },
  };

  let signupResponse;
  try {
    signupResponse = await worker.fetch(
      new Request("https://tradehustl3.com/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "reader@example.com", interest: "The TRADE HUSTL3 Book" }),
      }),
      { DB, BREVO_API_KEY: "test-brevo-key", BREVO_LIST_ID: "3", SAMPLE_TOKEN_SECRET: "guide-token-secret" },
      { waitUntil() {}, passThroughOnException() {} },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(signupResponse.status, 200);
  const result = await signupResponse.json();
  assert.equal(result.ok, true);
  assert.equal(result.sampleUrl, "/api/free-sample");
  assert.match(result.message, /free 2026-2027 trade guide preview/i);
  assert.match(signupResponse.headers.get("set-cookie") ?? "", /tradehustl3_sample_access=\d+\.[a-f0-9]{24}\./i);
  assert.doesNotMatch(signupResponse.headers.get("set-cookie") ?? "", /=granted/i);
  assert.deepEqual(brevoCalls.map((call) => call.input), [
    "https://api.brevo.com/v3/contacts",
    "https://api.brevo.com/v3/smtp/email",
  ]);
  assert.match(brevoCalls[1].body.htmlContent, /https:\/\/tradehustl3\.com\/api\/free-sample\?token=/i);
  assert.match(brevoCalls[1].body.htmlContent, /OPEN THE FREE GUIDE/i);

  const cookie = (signupResponse.headers.get("set-cookie") ?? "").split(";")[0];
  const sampleResponse = await worker.fetch(
    new Request("https://tradehustl3.com/api/free-sample", { headers: { Cookie: cookie } }),
    {
      BREVO_API_KEY: "test-brevo-key",
      SAMPLE_TOKEN_SECRET: "guide-token-secret",
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(sampleResponse.status, 200);
  assert.match(sampleResponse.headers.get("content-type") ?? "", /application\/pdf/i);
  assert.match(sampleResponse.headers.get("content-disposition") ?? "", /TRADE-HUSTL3-2026-2027-Guide-Preview\.pdf/i);
  assert.match(await sampleResponse.text(), /^%PDF-/);
});

test("direct sample access is sent back to the signup gate", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://tradehustl3.com/trade-hustl3-free-sample.pdf"),
    {},
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "https://tradehustl3.com/book#sample");
});

test("book sample signup and its delivery email share one reader link", async () => {
  const worker = await loadWorker();
  const brevoCalls = [];
  const dbCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    brevoCalls.push({ input: String(input), body: JSON.parse(String(init.body)) });
    return new Response(null, { status: 201 });
  };
  const DB = {
    prepare(sql) {
      return { bind(...values) { return {
        async first() { return /RETURNING count/i.test(sql) ? { count: 1 } : null; },
        async run() { dbCalls.push({ sql, values }); return { success: true }; },
      }; } };
    },
  };

  let res;
  try {
    res = await worker.fetch(
      new Request("https://tradehustl3.com/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "Reader@Example.com", interest: "Book 7-Page Sample" }),
      }),
      { DB, BREVO_API_KEY: "test-brevo-key", BREVO_LIST_ID: "3" },
      { waitUntil() {}, passThroughOnException() {} },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.sampleUrl, "/book/sample/read");
  assert.doesNotMatch(body.message, /download|pdf/i);
  assert.equal(res.headers.get("set-cookie"), null);

  assert.deepEqual(dbCalls[0].values, ["reader@example.com", "Book 7-Page Sample", "book_sample"]);
  assert.equal(brevoCalls[0].input, "https://api.brevo.com/v3/contacts");
  assert.equal(brevoCalls[0].body.attributes.SIGNUP_SOURCE, "book_sample");

  const { htmlContent, textContent } = brevoCalls[1].body;
  const readerUrl = new URL(body.sampleUrl, "https://tradehustl3.com").href;
  assert.deepEqual([...htmlContent.matchAll(/href="([^"]+)"/g)].map(match => match[1]), [readerUrl]);
  assert.match(htmlContent, />Open the 7-page book sample<\/a>/);
  assert.deepEqual(textContent.match(/https:\/\/\S+/g), [readerUrl]);
  assert.doesNotMatch(htmlContent + textContent, /download|pdf/i);
});

function legacyBookSampleToken(secret) {
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const payload = `${expires}.book_sample.${"0".repeat(24)}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

test("previously issued book sample download links still serve the same PDF", async () => {
  const worker = await loadWorker();
  const token = legacyBookSampleToken("book-token-secret");
  const pdf = await worker.fetch(
    new Request(`https://tradehustl3.com/api/book-sample?token=${token}`),
    { BREVO_API_KEY: "test-brevo-key", BOOK_SAMPLE_TOKEN_SECRET: "book-token-secret" },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(pdf.status, 200);
  assert.match(pdf.headers.get("content-type") ?? "", /application\/pdf/i);
  assert.match(pdf.headers.get("content-disposition") ?? "", /TRADE-HUSTL3-7-Page-Book-Sample\.pdf/);
  assert.match(pdf.headers.get("cache-control") ?? "", /no-store/);
  assert.match(pdf.headers.get("x-robots-tag") ?? "", /noindex/i);
  const sample = await readFile(new URL("../worker/assets/trade-hustl3-seven-page-book-sample.pdf", import.meta.url));
  assert.deepEqual(Buffer.from(await pdf.arrayBuffer()), sample);
});

// The dedicated secret's check is delayed so the legacy secret's `false` settles
// first. A valid token must still be accepted whichever check finishes first.
async function withSlowFirstVerify(run) {
  const subtle = globalThis.crypto.subtle;
  const originalVerify = subtle.verify;
  let calls = 0;
  Object.defineProperty(subtle, "verify", {
    configurable: true,
    writable: true,
    value: async (...args) => {
      const result = await originalVerify.apply(subtle, args);
      if (calls++ === 0) await new Promise((resolve) => setTimeout(resolve, 25));
      return result;
    },
  });
  try {
    return await run();
  } finally {
    delete subtle.verify;
    if (subtle.verify !== originalVerify) Object.defineProperty(subtle, "verify", { configurable: true, writable: true, value: originalVerify });
  }
}

async function signupGuideEmailToken(worker, env) {
  const emails = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    emails.push(JSON.parse(String(init.body)));
    return new Response(null, { status: 201 });
  };
  const DB = {
    prepare(sql) {
      return { bind() { return {
        async first() { return /RETURNING count/i.test(sql) ? { count: 1 } : null; },
        async run() { return { success: true }; },
      }; } };
    },
  };
  try {
    const res = await worker.fetch(
      new Request("https://tradehustl3.com/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "reader@example.com", interest: "Top 10 Trades" }),
      }),
      { DB, BREVO_LIST_ID: "3", ...env },
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(res.status, 200);
  } finally {
    globalThis.fetch = originalFetch;
  }
  const html = emails.find((body) => typeof body.htmlContent === "string")?.htmlContent ?? "";
  const match = html.match(/\/api\/free-sample\?token=([^"&]+)/);
  assert.ok(match, "signup email links to /api/free-sample");
  return match[1];
}

for (const [route, secretName] of [
  ["free-sample", "SAMPLE_TOKEN_SECRET"],
  ["book-sample", "BOOK_SAMPLE_TOKEN_SECRET"],
]) {
  test(`/api/${route} accepts a valid link even when the legacy secret's check settles first`, async () => {
    const worker = await loadWorker();
    const env = { BREVO_API_KEY: "test-brevo-key", [secretName]: "dedicated-token-secret" };
    const token = route === "book-sample"
      ? legacyBookSampleToken(env[secretName])
      : await signupGuideEmailToken(worker, env);
    const response = await withSlowFirstVerify(() => worker.fetch(
      new Request(`https://tradehustl3.com/api/${route}?token=${token}`),
      env,
      { waitUntil() {}, passThroughOnException() {} },
    ));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /application\/pdf/i);
  });
}

test("unauthenticated /api/book-sample redirects back to the funnel page", async () => {
  const worker = await loadWorker();
  const res = await worker.fetch(
    new Request("https://tradehustl3.com/api/book-sample"),
    { BREVO_API_KEY: "test-brevo-key" },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "https://tradehustl3.com/book/sample");
});

test("forged sample cookies cannot unlock either gated asset", async () => {
  const worker = await loadWorker();
  const env = { BREVO_API_KEY: "test-brevo-key" };
  const ctx = { waitUntil() {}, passThroughOnException() {} };

  const guide = await worker.fetch(
    new Request("https://tradehustl3.com/api/free-sample", { headers: { Cookie: "tradehustl3_sample_access=granted" } }),
    env, ctx,
  );
  const book = await worker.fetch(
    new Request("https://tradehustl3.com/api/book-sample", { headers: { Cookie: "tradehustl3_book_sample_access=granted" } }),
    env, ctx,
  );

  assert.equal(guide.status, 302);
  assert.equal(book.status, 302);
});

test("a Top 10 credential cannot unlock the book sample, and vice versa", async () => {
  const worker = await loadWorker();
  const env = { BREVO_API_KEY: "test-brevo-key" };
  const ctx = { waitUntil() {}, passThroughOnException() {} };

  const bookViaGuideCookie = await worker.fetch(
    new Request("https://tradehustl3.com/api/book-sample", { headers: { Cookie: "tradehustl3_sample_access=granted" } }),
    env, ctx,
  );
  assert.equal(bookViaGuideCookie.status, 302);
  const guideViaBookCookie = await worker.fetch(
    new Request("https://tradehustl3.com/api/free-sample", { headers: { Cookie: "tradehustl3_book_sample_access=granted" } }),
    env, ctx,
  );
  assert.equal(guideViaBookCookie.status, 302);

  const brevoCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    brevoCalls.push({ input: String(input), body: JSON.parse(String(init.body)) });
    return new Response(null, { status: 201 });
  };
  const DB = { prepare(sql) { return { bind() { return {
    async first() { return /RETURNING count/i.test(sql) ? { count: 1 } : null; },
    async run() { return { success: true }; },
  }; } }; } };
  try {
    await worker.fetch(
      new Request("https://tradehustl3.com/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "cross@example.com", interest: "Top 10 Trades" }),
      }),
      { DB, BREVO_API_KEY: "test-brevo-key", BREVO_LIST_ID: "3", SAMPLE_TOKEN_SECRET: "guide-token-secret" },
      ctx,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
  const guideToken = brevoCalls[1].body.htmlContent.match(/\/api\/free-sample\?token=([^"]+)/)[1];
  const crossed = await worker.fetch(
    new Request(`https://tradehustl3.com/api/book-sample?token=${guideToken}`),
    env, ctx,
  );
  assert.equal(crossed.status, 302);
});

test("keeps the direct eBook available after launch", async () => {
  const html = await (await renderPath("/book")).text();
  assert.match(html, /DIRECT eBOOK/i);
  assert.match(html, /\$9\.99/i);
  assert.doesNotMatch(html, /\$9\.00/i);
  assert.match(html, /Available now/i);
  assert.match(html, /secure PDF delivered by email after payment/i);
  assert.match(html, /href="https:\/\/buy\.stripe\.com\/4gM5kwaQ96EscGf2uKbfO02"/i);
});

test("links the live Amazon paperback and Kindle editions and leads with the paperback", async () => {
  const html = await (await renderPath("/book")).text();
  const paperback = "https://www.amazon.com/dp/B0HFQ2ZNJN";
  const kindle = "https://www.amazon.com/dp/B0HPZ2KQ1R";

  assert.doesNotMatch(html, /link added after the listing is confirmed live/i);
  assert.match(html, new RegExp(`href="${paperback.replaceAll(".", "\\.").replaceAll("/", "\\/")}"`));
  assert.match(html, new RegExp(`href="${kindle.replaceAll(".", "\\.").replaceAll("/", "\\/")}"`));

  // The first purchase button in the hero is the Amazon paperback.
  const hero = html.slice(html.indexOf('class="book-hero"'), html.indexOf('class="book-facts"'));
  const firstHref = hero.match(/class="button button-primary"[^>]*href="([^"]+)"|href="([^"]+)"[^>]*class="button button-primary"/);
  assert.ok(firstHref, "hero has a primary button");
  assert.equal(firstHref[1] ?? firstHref[2], paperback);
  assert.match(hero, />Buy the Paperback<\/a>/);
  // The mockup keeps the hero CTA concise; the format card still shows its price.
  const formats = html.slice(html.indexOf('class="availability-grid"'));
  assert.match(formats, /AMAZON PAPERBACK<\/span><strong>\$(?:<!-- -->)?24\.99/);

  // Purchase clicks are measurable through the shared CTA analytics.
  assert.match(html, /data-cta="amazon-paperback"/);
  assert.match(html, /data-cta="amazon-kindle"/);
  assert.match(html, /data-cta="direct-ebook"/);

  // Header CTA goes to the purchase section, not the email signup.
  assert.match(html, /class="nav-cta(?: [^"]*)?" href="#availability"/);
});

test("book structured data lists every edition with a USD offer", async () => {
  const html = await (await renderPath("/book")).text();
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  const book = blocks.find((block) => block["@type"] === "Book");
  assert.ok(book, "Book JSON-LD is present");
  assert.equal(book.isbn, "9798193043355");
  assert.equal(book.author["@id"], "https://tradehustl3.com/#zachary-ellis");
  assert.equal(book.workExample.length, 3);

  const byId = Object.fromEntries(book.workExample.map((edition) => [edition["@id"].split("#")[1], edition]));
  assert.equal(byId.paperback.bookFormat, "https://schema.org/Paperback");
  assert.equal(byId.paperback.offers.url, "https://www.amazon.com/dp/B0HFQ2ZNJN");
  assert.equal(byId.paperback.offers.price, "24.99");
  assert.equal(byId.kindle.offers.url, "https://www.amazon.com/dp/B0HPZ2KQ1R");
  assert.equal(byId.kindle.identifier.value, "B0HPZ2KQ1R");
  assert.equal(byId["direct-ebook"].offers.price, "9.99");
  for (const edition of book.workExample) {
    assert.equal(edition.offers.priceCurrency, "USD");
    assert.equal(edition.offers.availability, "https://schema.org/InStock");
  }
});

test("book page offers a contact-only path for schools and programs", async () => {
  const html = await (await renderPath("/book")).text();
  const schools = html.slice(html.indexOf('id="schools"'), html.indexOf('id="author"'));
  assert.match(schools, /FOR SCHOOLS &amp; PROGRAMS/);
  assert.match(schools, /href="mailto:partners@tradehustl3\.com\?subject=/);
  // No bulk pricing is promised before it exists.
  assert.doesNotMatch(schools, /\$\d|discount|% off/i);
  // A real request form captures the program's details; email stays as a fallback.
  assert.match(schools, /<form class="program-inquiry-form"/);
  for (const name of ["organization", "contactName", "email", "programType", "format", "copies", "neededBy", "message"]) {
    assert.match(schools, new RegExp(`name="${name}"`), `missing field ${name}`);
  }
  assert.match(schools, /name="company_website"[^>]*tabindex="-1"|tabindex="-1"[^>]*name="company_website"/i);
  assert.match(schools, /data-cta="schools-inquiry-form"/);
  // Only facts the book page already states elsewhere.
  assert.match(schools, /Current KDP ISBN/);
  assert.match(schools, /9798193043355/);
  assert.match(schools, /Appendix A lists 200 skilled trades/);
  assert.doesNotMatch(schools, /learning objective/i);
});

test("book page leads with the book sample and folds the guide preview below it", async () => {
  const html = (await (await renderPath("/book")).text()).replace(/<!-- -->/g, "");
  const sample = html.slice(html.indexOf('id="sample"'), html.indexOf('id="inside"'));
  assert.ok(sample.indexOf('id="book-sample"') < sample.indexOf('class="sample-guide-alt"'), "book sample comes first");
  assert.match(sample, /<details class="sample-guide-alt">/);
  assert.doesNotMatch(sample, /<details class="sample-guide-alt" open/);
  // The guide keeps its existing signup contract (interest "The TRADE HUSTL3 Book").
  assert.match(sample, /<form class="resource-form"/);
  assert.match(sample, /data-cta-location="book_page_guide"/);
  // The ISBN moved out of the shopper-facing facts strip.
  const facts = html.slice(html.indexOf('class="book-facts"'), html.indexOf('id="sample"'));
  assert.doesNotMatch(facts, /ISBN/);
  assert.match(facts, /200-trade list \+ resource directory/);
});

test("book page shows no reviews section until a real, permissioned review exists", async () => {
  const html = await (await renderPath("/book")).text();
  assert.doesNotMatch(html, /id="reviews"/);
  assert.doesNotMatch(html, /WHAT READERS/);
});

test("book gift banner appears only inside the Nov 25 to Dec 31 gift window", async () => {
  const before = await withFrozenDateNow(Date.parse("2026-11-20T15:00:00Z"), async () => (await renderPath("/book")).text());
  assert.doesNotMatch(before, /class="book-gift-banner"/);

  const during = await withFrozenDateNow(Date.parse("2026-11-27T15:00:00Z"), async () => (await renderPath("/book")).text());
  assert.match(during, /<aside class="book-gift-banner" aria-label="Gift season">/);
  assert.match(during, /order early for holiday delivery/);
  assert.match(during, /data-cta-location="book-gift-banner"/);
  assert.ok(during.indexOf('class="book-gift-banner"') < during.indexOf('class="book-hero"'), "banner sits above the hero");

  const after = await withFrozenDateNow(Date.parse("2027-01-02T15:00:00Z"), async () => (await renderPath("/book")).text());
  assert.doesNotMatch(after, /class="book-gift-banner"/);
});

test("program inquiry route stores the request and returns JSON through the deployed Worker", async () => {
  const worker = await loadWorker();
  const dbCalls = [];
  const outbound = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    outbound.push({ input: String(input), body: JSON.parse(String(init.body)) });
    return new Response(null, { status: 201 });
  };
  const DB = {
    prepare(sql) {
      return {
        bind(...values) { return {
          async first() { return /RETURNING count/i.test(sql) ? { count: 1 } : null; },
          async run() { dbCalls.push({ sql, values }); return { success: true }; },
        }; },
        async run() { dbCalls.push({ sql, values: [] }); return { success: true }; },
      };
    },
  };

  let response;
  try {
    response = await worker.fetch(
      new Request("https://tradehustl3.com/api/book/program-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "https://tradehustl3.com" },
        body: JSON.stringify({
          organization: "Eastside Job Corps",
          contactName: "Sam Lee",
          email: "sam@example.org",
          programType: "Job Corps center",
          format: "Not sure yet",
          copies: 40,
        }),
      }),
      { DB, BREVO_API_KEY: "test-brevo-key", BREVO_LIST_ID: "3" },
      { waitUntil() {}, passThroughOnException() {} },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal((await response.json()).ok, true);
  assert.ok(dbCalls.some((call) => /INSERT INTO book_program_inquiries/.test(call.sql)));
  assert.ok(outbound.some((call) => call.input === "https://api.brevo.com/v3/smtp/email" && call.body.to[0].email === "partners@tradehustl3.com"));
  const contact = outbound.find((call) => call.input === "https://api.brevo.com/v3/contacts");
  assert.equal(contact.body.attributes.INTEREST, "School / Workforce Partnership");
  assert.equal(contact.body.attributes.SIGNUP_SOURCE, "book_program_inquiry");
});

test("renders a private order-confirmation page", async () => {
  const response = await renderPath("/book/order-confirmed");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /PAYMENT CONFIRMED/i);
  assert.match(html, /\$9\.99/i);
  assert.match(html, /private download link/i);
  assert.match(html, /name="robots" content="noindex, nofollow"/i);
});

test("records a preorder confirmation without releasing the eBook before launch", async () => {
  await withFrozenDateNow(EBOOK_RELEASE_AT - 60 * 60 * 1000, async () => {
  const worker = await loadWorker();
  const webhookSecret = "whsec_test_trade_hustl3";
  const paymentLinkId = "plink_trade_hustl3_ebook";
  const sessionId = "cs_live_trade_hustl3";
  const event = JSON.stringify({
    id: "evt_ebook_checkout",
    type: "checkout.session.completed",
    data: {
      object: {
        id: sessionId,
        payment_intent: "pi_trade_hustl3",
        payment_link: paymentLinkId,
        payment_status: "paid",
        amount_total: 999,
        currency: "usd",
        customer_details: { email: "BUYER@example.com" },
      },
    },
  });
  const signature = await createStripeSignature(event, webhookSecret);
  let order;
  const DB = {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async run() {
              if (/INSERT OR IGNORE INTO ebook_orders/i.test(sql) && !order) {
                order = {
                  stripe_session_id: values[0],
                  email: values[1],
                  payment_link_id: values[2],
                  stripe_payment_intent_id: values[3],
                  amount_total: values[4],
                  amount_refunded: 0,
                  currency: values[5],
                  status: "paid",
                  download_token: values[6],
                  emailed_at: null,
                  launch_emailed_at: null,
                };
              }
              if (/UPDATE ebook_orders SET emailed_at/i.test(sql) && order) order.emailed_at = "2026-09-15 04:00:00";
              return { success: true };
            },
            async first() {
              if (/SELECT MAX\(amount_refunded\)/i.test(sql)) return { amount_refunded: null };
              if (/WHERE stripe_session_id/i.test(sql) && order?.stripe_session_id === values[0]) {
                return {
                  email: order.email,
                  download_token: order.download_token,
                  emailed_at: order.emailed_at,
                  launch_emailed_at: order.launch_emailed_at,
                  status: order.status,
                  stripe_payment_intent_id: order.stripe_payment_intent_id,
                };
              }
              if (/WHERE download_token/i.test(sql) && order?.download_token === values[0]) {
                return { stripe_session_id: order.stripe_session_id };
              }
              return null;
            },
          };
        },
      };
    },
  };
  const BOOKS = {
    async get(key) {
      assert.equal(key, "TRADE-HUSTL3-COMPLETE-EBOOK.pdf");
      return { body: "%PDF-complete-ebook", httpEtag: '"ebook-etag"' };
    },
  };
  const brevoCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    brevoCalls.push({ input: String(input), body: JSON.parse(String(init.body)) });
    return new Response(null, { status: 201 });
  };

  let webhookResponse;
  try {
    webhookResponse = await worker.fetch(
      new Request("https://tradehustl3.com/api/stripe/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Stripe-Signature": signature },
        body: event,
      }),
      {
        DB,
        BOOKS,
        BREVO_API_KEY: "brevo-test-key",
        BREVO_SAMPLE_SENDER_EMAIL: "updates@tradehustl3.com",
        STRIPE_WEBHOOK_SECRET: webhookSecret,
        STRIPE_EBOOK_PAYMENT_LINK_ID: paymentLinkId,
      },
      { waitUntil() {}, passThroughOnException() {} },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(webhookResponse.status, 200);
  assert.deepEqual(await webhookResponse.json(), { received: true });
  assert.equal(order.email, "buyer@example.com");
  assert.equal(brevoCalls.length, 1);
  assert.equal(brevoCalls[0].input, "https://api.brevo.com/v3/smtp/email");
  assert.match(brevoCalls[0].body.subject, /preorder is confirmed/i);
  assert.doesNotMatch(brevoCalls[0].body.htmlContent, /api\/ebook-download/i);

  const ebookResponse = await worker.fetch(
    new Request("https://tradehustl3.com/api/ebook-download?token=" + order.download_token),
    { DB, BOOKS },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(ebookResponse.status, 403);
  assert.match(await ebookResponse.text(), /unlock.*September 15, 2026/i);
  });
});

test("rejects a signed eBook checkout that is not exactly $9.99", async () => {
  const worker = await loadWorker();
  let databaseCalls = 0;
  const DB = {
    prepare() {
      databaseCalls += 1;
      throw new Error("A wrong-price checkout must not reach the database.");
    },
  };
  const response = await sendEbookStripeEvent(worker, {
    id: "evt_wrong_price",
    type: "checkout.session.completed",
    data: { object: {
      id: "cs_wrong_price",
      payment_intent: "pi_wrong_price",
      payment_link: "plink_trade_hustl3_ebook",
      payment_status: "paid",
      amount_total: 500,
      currency: "usd",
      customer_details: { email: "buyer@example.com" },
    } },
  }, {
    DB,
    BOOKS: {},
    STRIPE_WEBHOOK_SECRET: "whsec_wrong_price",
    STRIPE_EBOOK_PAYMENT_LINK_ID: "plink_trade_hustl3_ebook",
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true });
  assert.equal(databaseCalls, 0);
});

test("reconciles a full refund that arrives before delayed eBook payment succeeds", async () => {
  const worker = await loadWorker();
  const refundEvents = new Map();
  let order = null;
  const DB = {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async run() {
              if (/INSERT OR IGNORE INTO ebook_refund_events/i.test(sql)) {
                if (!refundEvents.has(values[0])) refundEvents.set(values[0], { paymentIntentId: values[1], amountRefunded: values[2], currency: values[3] });
              } else if (/INSERT OR IGNORE INTO ebook_orders/i.test(sql) && !order) {
                order = {
                  stripe_session_id: values[0],
                  email: values[1],
                  payment_link_id: values[2],
                  stripe_payment_intent_id: values[3],
                  amount_total: values[4],
                  amount_refunded: 0,
                  currency: values[5],
                  status: "paid",
                  download_token: values[6],
                  emailed_at: null,
                  launch_emailed_at: null,
                };
              } else if (/SET amount_refunded = MAX/i.test(sql) && order) {
                const amountRefunded = values[0];
                order.amount_refunded = Math.max(order.amount_refunded, amountRefunded);
                if (order.amount_refunded >= order.amount_total) order.status = "refunded";
              }
              return { success: true };
            },
            async first() {
              if (/SELECT MAX\(amount_refunded\)/i.test(sql)) {
                const amounts = [...refundEvents.values()]
                  .filter((event) => event.paymentIntentId === values[0] && event.currency === values[1])
                  .map((event) => event.amountRefunded);
                return { amount_refunded: amounts.length ? Math.max(...amounts) : null };
              }
              if (/FROM ebook_orders WHERE stripe_session_id/i.test(sql) && order?.stripe_session_id === values[0]) {
                return {
                  email: order.email,
                  download_token: order.download_token,
                  emailed_at: order.emailed_at,
                  launch_emailed_at: order.launch_emailed_at,
                  status: order.status,
                  stripe_payment_intent_id: order.stripe_payment_intent_id,
                };
              }
              return null;
            },
          };
        },
      };
    },
  };
  const env = {
    DB,
    BOOKS: {},
    BREVO_API_KEY: "brevo-test-key",
    STRIPE_WEBHOOK_SECRET: "whsec_out_of_order",
    STRIPE_EBOOK_PAYMENT_LINK_ID: "plink_trade_hustl3_ebook",
  };
  const originalFetch = globalThis.fetch;
  let emailCalls = 0;
  globalThis.fetch = async () => {
    emailCalls += 1;
    return new Response(null, { status: 201 });
  };

  try {
    const refundResponse = await sendEbookStripeEvent(worker, {
      id: "evt_refund_first",
      type: "charge.refunded",
      data: { object: {
        payment_intent: "pi_delayed_ebook",
        amount: 999,
        amount_refunded: 999,
        currency: "usd",
      } },
    }, env);
    assert.equal(refundResponse.status, 200);

    const paymentResponse = await sendEbookStripeEvent(worker, {
      id: "evt_delayed_payment",
      type: "checkout.session.async_payment_succeeded",
      data: { object: {
        id: "cs_delayed_ebook",
        payment_intent: "pi_delayed_ebook",
        payment_link: "plink_trade_hustl3_ebook",
        payment_status: "paid",
        amount_total: 999,
        currency: "usd",
        customer_details: { email: "delayed@example.com" },
      } },
    }, env);
    assert.equal(paymentResponse.status, 200);
    assert.deepEqual(await paymentResponse.json(), { received: true });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(order.status, "refunded");
  assert.equal(order.amount_refunded, 999);
  assert.equal(emailCalls, 0);
});


test("launch sweep delivers a pending preorder once after release", async () => {
  const worker = await loadWorker();
  const postLaunch = EBOOK_RELEASE_AT + 60 * 60 * 1000;
  const originalNow = Date.now;
  const originalFetch = globalThis.fetch;
  const calls = [];
  const sent = [];
  let waitPromise;
  const DB = {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async all() {
              if (/FROM resumes r/i.test(sql)) return { results: [] };
              assert.match(sql, /launch_emailed_at IS NULL/i);
              assert.match(sql, /status = 'paid'/i);
              return { results: [{ stripe_session_id: "cs_preorder", email: "buyer@example.com", download_token: "a".repeat(43) }] };
            },
            async first() {
              if (/launch_email_lease_until = \?/i.test(sql)) return { stripe_session_id: "cs_preorder" };
              return null;
            },
            async run() {
              calls.push({ sql, values });
              if (/SET launch_email_lease_until = \?/i.test(sql)) return { meta: { changes: 1 } };
              return { success: true };
            },
          };
        },
      };
    },
    async batch() { return []; },
  };
  globalThis.fetch = async (input, init) => {
    sent.push({ input: String(input), body: JSON.parse(String(init.body)) });
    return new Response(null, { status: 201 });
  };
  Date.now = () => postLaunch;
  try {
    await worker.scheduled({}, { DB, BOOKS: {}, BREVO_API_KEY: "brevo-test-key" }, {
      waitUntil(promise) { waitPromise = promise; },
      passThroughOnException() {},
    });
    await waitPromise;
  } finally {
    Date.now = originalNow;
    globalThis.fetch = originalFetch;
  }

  assert.equal(sent.length, 1);
  assert.equal(sent[0].input, "https://api.brevo.com/v3/smtp/email");
  assert.match(sent[0].body.subject, /eBook is ready/i);
  assert.match(sent[0].body.htmlContent, /api\/ebook-download\?token=/i);
  assert.equal(calls.filter((call) => /SET launch_emailed_at = CURRENT_TIMESTAMP/i.test(call.sql)).length, 1);
});

test("server-renders offer placements on the hub and keeps campaigns resume-first", async () => {
  const hub = await (await render()).text();
  for (const location of ["sticky_header", "homepage_book_hero", "homepage_resume_builder", "find_your_lane", "first_steps"]) {
    assert.match(hub, new RegExp(`data-location="${location}"`, "i"));
  }
  // The founder section left the hub; its anchor stays so existing links resolve.
  assert.doesNotMatch(hub, /data-location="built_by_a_tradesman"/i);
  assert.equal((hub.match(/id="built-by-a-tradesman"/g) ?? []).length, 1);
  // cta-analytics reads data-cta-location as the location for these placements.
  for (const placement of ["homepage_book_formats", "homepage_book_preview", "homepage_top_10_guide", "homepage_newsletter"]) {
    assert.match(hub, new RegExp(`data-cta-location="${placement}"`));
  }
  const html = await (await renderPath("/?trade=hvac")).text();
  assert.doesNotMatch(html, /TRADE HUSTL3 Gear/i);
  assert.doesNotMatch(html, /TRADE HUSTL3 Resources/i);
  for (const title of ["Resume Builder", "Top 10 Trades for 2026–2027"]) assert.match(html, new RegExp(title, "i"));
  assert.doesNotMatch(html, /Read 7 Pages Free/i);
  assert.match(html, /href="#resume-start"/i);
  assert.match(html, /id="resume-start"/i);
  assert.match(html, /Continue with email/i);
  assert.match(html, /href="\/book"/i);
  for (const location of ["sticky_header", "hero", "hero_trade_picker", "guide_signup", "footer_cta"]) assert.match(html, new RegExp(`data-location="${location}"`, "i"));
  assert.doesNotMatch(html, /data-location="book_teaser"/i);
  assert.match(html, /data-analytics-event="select_content"/i);
});

test("routes the branded resume link to the Resume Builder", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://tradehustl3.com/resume"),
    {},
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://tradehustl3.com/#resume-start");
});

test("redirects the redundant Resume Builder landing route into the homepage start point", async () => {
  const response = await renderPath("/resume-builder");
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "/#resume-start");

  const withTrade = await renderPath("/resume-builder?trade=hvac&utm_source=test");
  assert.equal(withTrade.status, 308);
  assert.equal(
    withTrade.headers.get("location"),
    "/?trade=hvac&utm_source=test#resume-start",
  );
});

test("server-renders scanner-safe confirmation, intake, payment return, and review routes", async () => {
  const routes = [
    ["/resume-builder/confirm?token=test", /CONFIRM THIS[\s\S]*SIGN-IN/i],
    ["/resume-builder/intake", /Upload your resume once\.[\s\S]*We handle the rest\./i],
    ["/resume-builder/payment-confirmed?resume_id=test", /LOCKING IN YOUR[\s\S]*BUILD/i],
    ["/resume-builder/review?resume_id=test", /Loading your secure workspace/i],
  ];

  for (const [route, expectation] of routes) {
    const response = await renderPath(route);
    assert.equal(response.status, 200, route);
    const html = await response.text();
    assert.match(html, expectation);
    assert.match(html, /Resume Builder progress/i);
    assert.match(html, /name="robots" content="noindex, nofollow"/i);
  }

  const confirmation = await (await renderPath("/resume-builder/confirm?token=test")).text();
  assert.match(confirmation, /opening the email did not sign you in/i);
  assert.match(confirmation, /Confirm &amp; continue/i);
  assert.doesNotMatch(confirmation, /\/api\/resume-builder\/auth\/confirm/);

  const intake = await (await renderPath("/resume-builder/intake")).text();
  assert.match(intake, /Loading your secure workspace/i);
  assert.match(intake, /flags only what needs your[\s\S]*attention/i);
  assert.match(intake, /autosaves to your verified account/i);
  assert.match(intake, /name="robots" content="noindex, nofollow"/i);

  const payment = await (await renderPath("/resume-builder/payment-confirmed?resume_id=test")).text();
  assert.match(payment, /Resume \+ matching cover letter[\s\S]*PDF \+ DOCX[\s\S]*3 shared corrections/i);
});

test("uses the official navy, red, and gold palette", async () => {
  const css = await readFile(new URL("../app/page-shell.css", import.meta.url), "utf8");
  assert.match(css, /--navy:\s*#071A2B/i);
  assert.match(css, /--red:\s*#D9361E/i);
  assert.match(css, /--gold:\s*#D6A52A/i);
  assert.match(css, /background:\s*var\(--navy\)/i);
  assert.match(css, /background:\s*var\(--red\)/i);
  assert.match(css, /color:var\(--gold\)|border[^;]*var\(--gold\)/i);
});
