import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("public marketing pages opt out of stale Cloudflare HTML caching", async () => {
  const config = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");

  assert.match(config, /Cache-Control[\s\S]*no-cache, max-age=0, must-revalidate/i);
  assert.match(config, /Cloudflare-CDN-Cache-Control[\s\S]*no-store/i);
  assert.match(config, /CDN-Cache-Control[\s\S]*no-cache, max-age=0, must-revalidate/i);
  assert.match(config, /X-TRADE-HUSTL3-Content-Revision/i);

  for (const route of [
    "/",
    "/book",
    "/book/sample",
    "/top-10-trades",
    "/resume-builder",
    "/resume-builder/hvac",
    "/resume-builder/facilities-maintenance",
    "/resume-builder/electrician",
    "/resume-builder/plumbing",
    "/resume-builder/welding-fabrication",
    "/resume-builder/construction-carpentry",
    "/resume-builder/general-labor",
  ]) {
    assert.ok(config.includes(`source: "${route}"`), `missing freshness headers for ${route}`);
  }
});

test("policy pages are never stored by browsers or CDNs", async () => {
  const config = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");

  assert.match(config, /const policyNoStoreHeaders[\s\S]*Cache-Control[^\n]*no-store, max-age=0/i);
  assert.match(config, /const policyNoStoreHeaders[\s\S]*Cloudflare-CDN-Cache-Control[^\n]*no-store/i);
  assert.match(config, /const policyNoStoreHeaders[\s\S]*CDN-Cache-Control[^\n]*no-store/i);
  assert.match(config, /2026-09-04-policy-cache-hardening/);

  for (const route of [
    "/privacy",
    "/terms",
    "/data-deletion",
    "/resume-builder/ai-disclosure",
  ]) {
    assert.ok(config.includes(`source: "${route}"`), `missing no-store headers for ${route}`);
  }
});

test("sitemap advertises the latest public-content refresh", async () => {
  const sitemap = await readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8");

  assert.match(sitemap, /2026-08-30T23:27:04\.000Z/);
  assert.match(sitemap, /changeFrequency: "daily"/);
  for (const route of ["/book", "/book/sample", "/top-10-trades", "/resume-builder"]) {
    assert.ok(sitemap.includes(route), `missing sitemap route ${route}`);
  }
  // The trade landing pages are pulled into the sitemap from TRADE_LANDING_PAGES.
  assert.match(sitemap, /TRADE_LANDING_PAGES/);
});
