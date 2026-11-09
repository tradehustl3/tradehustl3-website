import assert from "node:assert/strict";
import test from "node:test";

// Guards against orphaned pages: Google Search Console showed sitemap pages
// with no referring page. Every sitemap URL except the homepage must be
// reachable through a link in the server-rendered HTML of another sitemap page.
// Links that only appear after client-side interaction do not count.

const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const ctx = { waitUntil() {}, passThroughOnException() {} };

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

function normalizePath(href, base) {
  let url;
  try {
    url = new URL(href, base);
  } catch {
    return null;
  }
  if (url.hostname !== "tradehustl3.com" && url.hostname !== "localhost") return null;
  const path = url.pathname.replace(/\/+$/, "");
  return path === "" ? "/" : path;
}

function internalLinkTargets(html, pagePath) {
  const base = `https://tradehustl3.com${pagePath}`;
  const targets = new Set();
  for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)) {
    const href = match[1].replaceAll("&amp;", "&");
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    const path = normalizePath(href, base);
    if (path) targets.add(path);
  }
  return targets;
}

test("every sitemap page has a server-rendered internal link from another page", async () => {
  const worker = await loadWorker();
  const sitemap = await (await worker.fetch(new Request("https://tradehustl3.com/sitemap.xml"), env, ctx)).text();
  const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => normalizePath(match[1], "https://tradehustl3.com"));
  assert.ok(paths.length > 10, "sitemap should list the public pages");

  const inbound = new Map(paths.map((path) => [path, new Set()]));
  for (const path of paths) {
    const response = await worker.fetch(new Request(`https://tradehustl3.com${path}`, { headers: { accept: "text/html" } }), env, ctx);
    assert.equal(response.status, 200, `${path} should render`);
    for (const target of internalLinkTargets(await response.text(), path)) {
      if (target !== path && inbound.has(target)) inbound.get(target).add(path);
    }
  }

  const orphans = paths.filter((path) => path !== "/" && inbound.get(path).size === 0);
  assert.deepEqual(orphans, [], `orphaned sitemap pages: ${orphans.join(", ")}`);
});

test("homepage footer links to pages the stage picker hides until clicked", async () => {
  const worker = await loadWorker();
  const html = await (await worker.fetch(new Request("https://tradehustl3.com/", { headers: { accept: "text/html" } }), env, ctx)).text();
  // /book/sample is deliberately not linked from the homepage (book content
  // stays on /book; see rendered-html.test.mjs). /book links to it instead.
  for (const path of ["/resume-examples/skilled-trades", "/resume-examples/maintenance-resume-tips"]) {
    assert.ok(internalLinkTargets(html, "/").has(path), `homepage should link to ${path}`);
  }
});

test("book page links to the standalone sample page", async () => {
  const worker = await loadWorker();
  const html = await (await worker.fetch(new Request("https://tradehustl3.com/book", { headers: { accept: "text/html" } }), env, ctx)).text();
  assert.ok(internalLinkTargets(html, "/book").has("/book/sample"));
});

test("sitemap lastmod for the book pages reflects the Nov 3, 2026 rebuild", async () => {
  const worker = await loadWorker();
  const sitemap = await (await worker.fetch(new Request("https://tradehustl3.com/sitemap.xml"), env, ctx)).text();
  for (const path of ["/book", "/book/sample"]) {
    const entry = sitemap.match(new RegExp(`<loc>https://tradehustl3\\.com${path.replaceAll("/", "\\/")}</loc>\\s*<lastmod>([^<]+)</lastmod>`));
    assert.ok(entry, `${path} should have a lastmod`);
    assert.match(entry[1], /^2026-11-03/);
  }
});
