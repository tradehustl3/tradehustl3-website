import type { NextConfig } from "next";

const crawlerFreshnessHeaders = [
  { key: "Cache-Control", value: "no-store, max-age=0" },
  { key: "Cloudflare-CDN-Cache-Control", value: "no-store" },
  { key: "CDN-Cache-Control", value: "no-store" },
  { key: "X-TRADE-HUSTL3-Content-Revision", value: "2026-09-28-trade-catalog" },
];

const policyNoStoreHeaders = [
  { key: "Cache-Control", value: "no-store, max-age=0" },
  { key: "Cloudflare-CDN-Cache-Control", value: "no-store" },
  { key: "CDN-Cache-Control", value: "no-store" },
  { key: "X-TRADE-HUSTL3-Content-Revision", value: "2026-09-24-policy-refresh" },
];

// A cached /sitemap.xml once served a stale 2-URL copy while the app generated 20,
// so the crawler discovery files are never stored by browsers or CDNs.
const discoveryNoStoreHeaders = [
  { key: "Cache-Control", value: "no-store, max-age=0" },
  { key: "Cloudflare-CDN-Cache-Control", value: "no-store" },
  { key: "CDN-Cache-Control", value: "no-store" },
  { key: "X-TRADE-HUSTL3-Content-Revision", value: "2026-10-07-crawler-discovery" },
];

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      { source: "/sitemap.xml", headers: discoveryNoStoreHeaders },
      { source: "/robots.txt", headers: discoveryNoStoreHeaders },
      { source: "/", headers: crawlerFreshnessHeaders },
      { source: "/book", headers: crawlerFreshnessHeaders },
      { source: "/book/sample", headers: crawlerFreshnessHeaders },
      { source: "/top-10-trades", headers: crawlerFreshnessHeaders },
      { source: "/resume-examples", headers: crawlerFreshnessHeaders },
      { source: "/resume-builder", headers: crawlerFreshnessHeaders },
      { source: "/resume-builder/intake", headers: crawlerFreshnessHeaders },
      { source: "/resume-builder/review", headers: crawlerFreshnessHeaders },
      { source: "/resume-builder/confirm", headers: crawlerFreshnessHeaders },
      { source: "/resume-builder/payment-confirmed", headers: crawlerFreshnessHeaders },
      { source: "/resume-builder/hvac", headers: crawlerFreshnessHeaders },
      { source: "/resume-builder/facilities-maintenance", headers: crawlerFreshnessHeaders },
      { source: "/resume-builder/electrician", headers: crawlerFreshnessHeaders },
      { source: "/resume-builder/plumbing", headers: crawlerFreshnessHeaders },
      { source: "/resume-builder/welding-fabrication", headers: crawlerFreshnessHeaders },
      { source: "/resume-builder/construction-carpentry", headers: crawlerFreshnessHeaders },
      { source: "/resume-builder/general-labor", headers: crawlerFreshnessHeaders },
      { source: "/privacy", headers: policyNoStoreHeaders },
      { source: "/terms", headers: policyNoStoreHeaders },
      { source: "/data-deletion", headers: policyNoStoreHeaders },
      { source: "/resume-builder/ai-disclosure", headers: policyNoStoreHeaders },
    ];
  },
};

export default nextConfig;
