/**
 * Site-wide Content-Security-Policy for the TRADE HUSTL3 Worker.
 *
 * Third-party allowances are grouped by the tag that needs them so a change to
 * one integration cannot silently break another. Every allowance below is
 * limited to the directive the vendor documents; nothing widens default-src.
 *
 * Google Analytics 4 (core measurement only — Google Signals / ads endpoints
 * such as *.g.doubleclick.net and www.google.com are intentionally NOT allowed):
 *   https://developers.google.com/tag-platform/security/guides/csp
 *   gtag.js sends page views to analytics.google.com or <region>.google-analytics.com
 *   depending on property settings. A CSP wildcard (*.analytics.google.com) does not
 *   match the bare host, so the bare host is listed explicitly. Missing these hosts
 *   silently dropped every GA4 hit from 2026-09-22 until this policy was corrected.
 *
 * Cloudflare Web Analytics:
 *   beacon script from static.cloudflareinsights.com, beacons to cloudflareinsights.com.
 *
 * Pinterest tag:
 *   core.js from s.pinimg.com, which loads ct.pinterest.com scripts and an iframe.
 */

const GA4_SCRIPT = ["https://*.googletagmanager.com", "https://www.google-analytics.com"];
const GA4_IMG = ["https://*.google-analytics.com", "https://*.googletagmanager.com"];
const GA4_CONNECT = [
  "https://*.google-analytics.com",
  "https://analytics.google.com",
  "https://*.analytics.google.com",
  "https://*.googletagmanager.com",
];

const CLOUDFLARE_ANALYTICS_SCRIPT = ["https://static.cloudflareinsights.com"];
const CLOUDFLARE_ANALYTICS_CONNECT = ["https://cloudflareinsights.com"];

const META_PIXEL_SCRIPT = ["https://connect.facebook.net"];
const META_PIXEL_IMG = ["https://www.facebook.com", "https://connect.facebook.net"];
const META_PIXEL_CONNECT = ["https://www.facebook.com"];

const PINTEREST_SCRIPT = ["https://s.pinimg.com", "https://ct.pinterest.com"];
const PINTEREST_IMG = ["https://ct.pinterest.com"];
const PINTEREST_CONNECT = ["https://ct.pinterest.com"];
const PINTEREST_FRAME = ["https://ct.pinterest.com"];

const directive = (name: string, ...sources: string[][]): string =>
  [name, ...sources.flat()].join(" ");

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://checkout.stripe.com",
  directive("script-src", ["'self'", "'unsafe-inline'"], META_PIXEL_SCRIPT, PINTEREST_SCRIPT, GA4_SCRIPT, CLOUDFLARE_ANALYTICS_SCRIPT),
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  directive("img-src", ["'self'", "data:"], META_PIXEL_IMG, PINTEREST_IMG, GA4_IMG),
  directive("connect-src", ["'self'", "https://api.brevo.com"], GA4_CONNECT, META_PIXEL_CONNECT, PINTEREST_CONNECT, CLOUDFLARE_ANALYTICS_CONNECT),
  directive("frame-src", ["'self'", "https://checkout.stripe.com", "https://js.stripe.com"], PINTEREST_FRAME),
  "upgrade-insecure-requests",
].join("; ");
