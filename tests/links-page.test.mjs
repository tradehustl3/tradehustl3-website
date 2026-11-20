import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { SOCIAL_PROFILE_ORDER, SOCIAL_PROFILES, SOCIAL_PROFILE_URLS } from "../app/social-profiles.ts";

// Import the built Worker once for this file: every extra import keeps another
// copy of the bundle in memory (see the Nov 2026 CI out-of-memory failures).
const worker = (await import(new URL("../dist/server/index.js", import.meta.url).href)).default;

async function renderPath(pathname) {
  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

// The printed QR code encodes this exact URL. It must keep rendering the links page.
const QR_PATH = "/links?utm_source=qr&utm_medium=print&utm_campaign=links_qr";

test("the QR code's /links page renders inside the shared site shell", async () => {
  const response = await renderPath(QR_PATH);
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /START HERE/);
  assert.match(html, /class="policy-page"/, "uses the shared PolicyPage shell");
  assert.match(html, /class="policy-header"/);
  assert.match(html, /class="policy-footer"/);
  assert.match(html, /TRADE HUSTL3 LLC/);
  assert.doesNotMatch(html, /Last updated/i, "not a legal page, so no revision date");
  assert.match(html, /<meta name="robots" content="noindex, follow"/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/tradehustl3\.com\/links"/i);
});

test("/links points to the Resume Builder, the book, the sample, the resource center and every social profile", async () => {
  const html = await (await renderPath("/links")).text();

  for (const href of ["/#resume-start", "/book", "/book/sample", "/resources"]) {
    assert.ok(html.includes(`href="${href}"`), `missing link to ${href}`);
  }
  assert.equal(html.includes('href="/resume-builder"'), false, "links to the redirecting route");

  for (const id of SOCIAL_PROFILE_ORDER) {
    const { href, label } = SOCIAL_PROFILES[id];
    assert.ok(html.includes(`href="${href}"`), `missing ${label} link`);
    assert.ok(html.includes(`data-item="social_${id}"`), `${label} link is not tagged for analytics`);
  }
  assert.equal(html.match(/data-location="links_page"/g)?.length ?? 0, 4);
});

test("/links stays out of the sitemap", async () => {
  const sitemap = await readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8");
  assert.doesNotMatch(sitemap, /\/links/);
});

test("social profile URLs come from one source", async () => {
  assert.equal(SOCIAL_PROFILE_URLS.length, SOCIAL_PROFILE_ORDER.length);
  for (const file of ["../app/social-links.tsx", "../app/footer-enhancements.tsx", "../app/layout.tsx", "../app/links/page.tsx"]) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    for (const url of SOCIAL_PROFILE_URLS) {
      assert.equal(source.includes(url), false, `${file} hard-codes ${url}; read it from app/social-profiles.ts`);
    }
  }
});
