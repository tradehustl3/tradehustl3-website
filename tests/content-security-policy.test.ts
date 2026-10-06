import assert from "node:assert/strict";
import test from "node:test";
import { CONTENT_SECURITY_POLICY } from "../worker/content-security-policy";
import { withFrameAncestors } from "../worker/frame-policy";

function directives(policy: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const part of policy.split(";")) {
    const [name, ...sources] = part.trim().split(/\s+/);
    if (name) map.set(name, sources);
  }
  return map;
}

/** Minimal CSP host-source matcher (scheme + host, with leading-wildcard rules per CSP3). */
function allows(policy: string, directive: string, url: string): boolean {
  const map = directives(policy);
  const sources = map.get(directive) ?? map.get("default-src") ?? [];
  const target = new URL(url);
  return sources.some((source) => {
    if (source === "'self'") return target.origin === "https://tradehustl3.com";
    const match = /^https:\/\/(\*\.)?([^/]+)$/.exec(source);
    if (!match || target.protocol !== "https:") return false;
    const [, wildcard, host] = match;
    // CSP: "*.example.com" matches subdomains only, never the bare host.
    return wildcard ? target.hostname.endsWith(`.${host}`) : target.hostname === host;
  });
}

// Exact destinations headless Chrome showed the live homepage attempting on 2026-10-06.
const GA4_PAGE_VIEW = "https://analytics.google.com/g/collect?v=2&tid=G-PHLN0C7BWF&en=page_view";
const GA4_REGIONAL = "https://region1.google-analytics.com/g/collect?v=2&tid=G-PHLN0C7BWF";
const GA4_DEFAULT = "https://www.google-analytics.com/g/collect?v=2&tid=G-PHLN0C7BWF";
const GA4_SUBDOMAIN = "https://region1.analytics.google.com/g/collect?v=2&tid=G-PHLN0C7BWF";
const GTAG = "https://www.googletagmanager.com/gtag/js?id=G-PHLN0C7BWF";

test("GA4 page views can reach every documented Google Analytics collection host", () => {
  for (const url of [GA4_PAGE_VIEW, GA4_REGIONAL, GA4_DEFAULT, GA4_SUBDOMAIN]) {
    assert.equal(allows(CONTENT_SECURITY_POLICY, "connect-src", url), true, url);
  }
  assert.equal(allows(CONTENT_SECURITY_POLICY, "script-src", GTAG), true);
  assert.equal(allows(CONTENT_SECURITY_POLICY, "img-src", GA4_DEFAULT), true);
});

test("the bare analytics.google.com host is listed explicitly because a wildcard does not cover it", () => {
  const connect = directives(CONTENT_SECURITY_POLICY).get("connect-src") ?? [];
  assert.ok(connect.includes("https://analytics.google.com"));
  assert.ok(connect.includes("https://*.analytics.google.com"));
});

test("Google Signals and ad endpoints stay blocked (core GA4 measurement only)", () => {
  for (const url of [
    "https://stats.g.doubleclick.net/g/collect?v=2",
    "https://www.google.com/g/collect?v=2&gaf=1",
    "https://ad.doubleclick.net/activity;",
    "https://googleads.g.doubleclick.net/pagead/viewthroughconversion/1",
  ]) {
    assert.equal(allows(CONTENT_SECURITY_POLICY, "connect-src", url), false, url);
    assert.equal(allows(CONTENT_SECURITY_POLICY, "img-src", url), false, url);
  }
});

test("Cloudflare Web Analytics beacon can load and report", () => {
  assert.equal(allows(CONTENT_SECURITY_POLICY, "script-src", "https://static.cloudflareinsights.com/beacon.min.js/v31"), true);
  assert.equal(allows(CONTENT_SECURITY_POLICY, "connect-src", "https://cloudflareinsights.com/cdn-cgi/rum"), true);
});

test("Pinterest tag can load its scripts, frame, and conversion requests", () => {
  assert.equal(allows(CONTENT_SECURITY_POLICY, "script-src", "https://s.pinimg.com/ct/core.js"), true);
  assert.equal(allows(CONTENT_SECURITY_POLICY, "script-src", "https://ct.pinterest.com/static/ct/token_create.js"), true);
  assert.equal(allows(CONTENT_SECURITY_POLICY, "frame-src", "https://ct.pinterest.com/"), true);
  assert.equal(allows(CONTENT_SECURITY_POLICY, "connect-src", "https://ct.pinterest.com/v3/"), true);
  assert.equal(allows(CONTENT_SECURITY_POLICY, "img-src", "https://ct.pinterest.com/v3/"), true);
});

test("existing integrations and baseline protections are unchanged", () => {
  const map = directives(CONTENT_SECURITY_POLICY);
  assert.deepEqual(map.get("default-src"), ["'self'"]);
  assert.deepEqual(map.get("base-uri"), ["'self'"]);
  assert.deepEqual(map.get("object-src"), ["'none'"]);
  assert.deepEqual(map.get("frame-ancestors"), ["'none'"]);
  assert.deepEqual(map.get("script-src-attr"), ["'none'"]);
  assert.deepEqual(map.get("form-action"), ["'self'", "https://checkout.stripe.com"]);
  assert.ok(map.has("upgrade-insecure-requests"));
  assert.equal(allows(CONTENT_SECURITY_POLICY, "connect-src", "https://api.brevo.com/v3/contacts"), true);
  assert.equal(allows(CONTENT_SECURITY_POLICY, "script-src", "https://connect.facebook.net/en_US/fbevents.js"), true);
  assert.equal(allows(CONTENT_SECURITY_POLICY, "connect-src", "https://www.facebook.com/tr/"), true);
  assert.equal(allows(CONTENT_SECURITY_POLICY, "frame-src", "https://checkout.stripe.com/c/pay"), true);
  // Arbitrary third parties remain blocked.
  assert.equal(allows(CONTENT_SECURITY_POLICY, "connect-src", "https://evil.example.com/collect"), false);
  assert.equal(allows(CONTENT_SECURITY_POLICY, "script-src", "https://evil.example.com/x.js"), false);
  // No directive may fall open with a bare wildcard or an http source.
  for (const [name, sources] of map) {
    for (const source of sources) {
      assert.notEqual(source, "*", `${name} must not allow *`);
      assert.ok(!source.startsWith("http:"), `${name} must not allow http: ${source}`);
    }
  }
});

test("frame-ancestors rewrite still applies to the new policy", () => {
  const framed = withFrameAncestors(CONTENT_SECURITY_POLICY, true);
  assert.match(framed, /frame-ancestors 'self'/);
  assert.doesNotMatch(framed, /frame-ancestors 'none'/);
  assert.equal(withFrameAncestors(CONTENT_SECURITY_POLICY, false), CONTENT_SECURITY_POLICY);
});
