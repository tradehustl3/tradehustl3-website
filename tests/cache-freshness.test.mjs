import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("public marketing pages opt out of stale Cloudflare HTML caching", async () => {
  const config = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");

  assert.match(config, /Cache-Control[\s\S]*no-cache, max-age=0, must-revalidate/i);
  assert.match(config, /Cloudflare-CDN-Cache-Control[\s\S]*no-store/i);
  assert.match(config, /CDN-Cache-Control[\s\S]*no-cache, max-age=0, must-revalidate/i);
  assert.match(config, /X-TRADE-HUSTL3-Content-Revision/i);

  for (const route of ["/", "/book", "/book/sample", "/top-10-trades", "/resume-builder"]) {
    const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(config, new RegExp(`source: [\\\"']${escaped}[\\\"']`));
  }
});

test("sitemap advertises the latest public-content refresh", async () => {
  const sitemap = await readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8");

  assert.match(sitemap, /2026-08-30T23:27:04\.000Z/);
  assert.match(sitemap, /changeFrequency: "daily"/);
  for (const route of ["/book", "/book/sample", "/top-10-trades", "/resume-builder"]) {
    assert.match(sitemap, new RegExp(route.replaceAll("/", "\\/")));
  }
});
